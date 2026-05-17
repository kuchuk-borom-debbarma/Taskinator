/**
 * @file SmartAggregator.ts
 * @description In-memory buffer for high-throughput database updates.
 * Aggregates multiple field-level changes across multiple entities into single bulk SQL updates.
 * This minimizes database roundtrips and lock contention, supporting 10k RPS targets.
 *
 * @mandate PIPE-01, PIPE-02
 */

import { sql } from 'kysely';
import { db } from '../../../database/index.js';
import { logger } from '../../../logger/index.js';

/**
 * Represents a set of changes for a specific entity.
 */
export interface AggregationItem {
    /**
     * The primary key ID of the entity to update.
     */
    entityId: string;
    /**
     * Key-value pairs representing the fields and their new values.
     */
    changes: Record<string, any>;
    /**
     * Trace ID for observability throughout the bulk operation.
     */
    traceId: string;
    /**
     * Loop recursion depth.
     */
    depth: number;
}

/**
 * SmartAggregator implements a buffering strategy to optimize database write performance.
 * It groups updates by entity type and flushes them in batches using SQL CASE statements.
 */
export class SmartAggregator {
    /**
     * Inner buffer: Map<EntityType, Map<EntityId, AggregationItem>>
     */
    private buffer: Map<string, Map<string, AggregationItem>> = new Map();

    /**
     * Timer for scheduled flushes.
     */
    private flushTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Maximum number of items for a specific entity type before triggering an immediate flush.
     */
    private readonly BATCH_SIZE = 500;

    /**
     * Maximum time an item can stay in the buffer before being flushed.
     */
    private readonly FLUSH_INTERVAL_MS = 100;

    /**
     * Pushes a set of changes for an entity into the aggregation buffer.
     * If changes already exist for the entity, they are merged.
     *
     * @param entityType The table name or entity type (e.g., 'project_tasks').
     * @param entityId The primary key ID of the entity.
     * @param changes Key-value pairs of fields to update.
     * @param traceId For logging and observability.
     */
    public push(
        entityType: string,
        entityId: string,
        changes: Record<string, any>,
        traceId: string,
        depth: number = 0,
    ): void {
        // Initialize buffer for the entity type if it doesn't exist
        if (!this.buffer.has(entityType)) {
            this.buffer.set(entityType, new Map());
        }

        const typeBuffer = this.buffer.get(entityType)!;
        const existing = typeBuffer.get(entityId);

        if (existing) {
            // Merge changes for the same entity to avoid redundant updates
            // The latest traceId and depth are kept for the bulk operation
            logger.debug(
                `[SmartAggregator] Merging buffered changes for ${entityType}:${entityId} (traceId: ${traceId}, depth: ${depth})`,
            );
            typeBuffer.set(entityId, {
                ...existing,
                changes: { ...existing.changes, ...changes },
                traceId,
                depth,
            });
        } else {
            logger.debug(
                `[SmartAggregator] Buffering new changes for ${entityType}:${entityId} (traceId: ${traceId}, depth: ${depth})`,
            );
            typeBuffer.set(entityId, { entityId, changes, traceId, depth });
        }

        // Ensure a flush is scheduled if not already
        this.scheduleFlush();

        // Immediate flush if buffer for this type reaches the capacity threshold
        if (typeBuffer.size >= this.BATCH_SIZE) {
            logger.debug(
                `[SmartAggregator] Batch size reached for ${entityType}. Triggering immediate flush.`,
            );
            this.flush(entityType).catch((err) =>
                logger.error(
                    `[SmartAggregator] Immediate flush failed for ${entityType}: ${err.message}`,
                ),
            );
        }
    }

    /**
     * Schedules a timer-based flush if one is not already pending.
     */
    private scheduleFlush(): void {
        if (this.flushTimer) return;

        this.flushTimer = setTimeout(() => {
            this.flushAll().catch((err) =>
                logger.error(
                    `[SmartAggregator] Scheduled flush failed: ${err.message}`,
                ),
            );
        }, this.FLUSH_INTERVAL_MS);
    }

    /**
     * Flushes all pending changes in the buffer across all entity types.
     */
    public async flushAll(): Promise<void> {
        this.flushTimer = null;
        const entityTypes = Array.from(this.buffer.keys());

        if (entityTypes.length === 0) return;

        logger.debug(
            `[SmartAggregator] Flushing all buffers for ${entityTypes.length} types.`,
        );

        // Process all types in parallel to maximize throughput
        await Promise.all(entityTypes.map((type) => this.flush(type)));
    }

    /**
     * Flushes changes for a specific entity type using optimized bulk SQL.
     * Uses a CASE statement pattern to update multiple rows and columns in one query.
     */
    private async flush(entityType: string): Promise<void> {
        const typeBuffer = this.buffer.get(entityType);
        if (!typeBuffer || typeBuffer.size === 0) return;

        // Atomically extract and clear the buffer for this type to prevent race conditions
        const items = Array.from(typeBuffer.values());
        this.buffer.delete(entityType);

        try {
            logger.info(
                `[SmartAggregator] Bulk updating ${items.length} rows for ${entityType} ` +
                    `(ids: [${items.map((i) => i.entityId).join(', ')}], firstTraceId: ${items[0]?.traceId})`,
            );

            await this.executeBulkUpdate(entityType, items);
        } catch (error: any) {
            logger.error(
                `[SmartAggregator] Bulk update failed for ${entityType}: ${error.message}. Restoring buffer...`,
                {
                    entityType,
                    itemCount: items.length,
                    firstTraceId: items[0]?.traceId,
                },
            );
            // Restore failed items back to the buffer to prevent data loss.
            const currentBuffer = this.buffer.get(entityType) || new Map();
            for (const item of items) {
                if (!currentBuffer.has(item.entityId)) {
                    currentBuffer.set(item.entityId, item);
                } else {
                    // Merge older changes with newer modifications that arrived in the meantime
                    const existing = currentBuffer.get(item.entityId)!;
                    currentBuffer.set(item.entityId, {
                        ...item,
                        changes: { ...item.changes, ...existing.changes },
                        traceId: existing.traceId,
                        depth: existing.depth,
                    });
                }
            }
            this.buffer.set(entityType, currentBuffer);
            throw error;
        }
    }

    /**
     * Constructs and executes a single SQL query for multiple row updates.
     * Pattern:
     * UPDATE table
     * SET field1 = CASE id WHEN 'id1' THEN 'val1' ... ELSE field1 END
     * WHERE id IN ('id1', 'id2', ...)
     */
    private async executeBulkUpdate(
        entityType: string,
        items: AggregationItem[],
    ): Promise<void> {
        if (items.length === 0) return;

        // 1. Determine all unique fields being updated across the entire batch
        const allFields = new Set<string>();
        for (const item of items) {
            for (const field of Object.keys(item.changes)) {
                allFields.add(field);
            }
        }

        const fields = Array.from(allFields);
        const ids = items.map((i) => i.entityId);

        logger.debug(
            `[SmartAggregator] executing bulk update for table="${entityType}": columns=[${fields.join(', ')}], ids=[${ids.join(', ')}]`,
        );

        // 2. Construct the SET clauses using SQL CASE statements
        const setClauses: any[] = [];

        for (const field of fields) {
            // Start the CASE statement: CASE id
            let caseSql = sql`CASE id`;

            for (const item of items) {
                if (item.changes[field] !== undefined) {
                    // WHEN 'some-id' THEN 'some-value'
                    caseSql = sql`${caseSql} WHEN ${item.entityId}::uuid THEN ${item.changes[field]}`;
                }
            }

            // ELSE field END
            caseSql = sql`${caseSql} ELSE ${sql.ref(field)} END`;

            // field = CASE ... END
            setClauses.push(sql`${sql.ref(field)} = ${caseSql}`);
        }

        // 3. Execute the single bulk UPDATE query
        if (entityType === 'project_task') {
            // Construct the CASE statements for traceId and depth maps to pass them into outbox CTE
            let traceIdCase = sql`CASE id`;
            let depthCase = sql`CASE id`;
            for (const item of items) {
                traceIdCase = sql`${traceIdCase} WHEN ${item.entityId}::uuid THEN ${item.traceId}`;
                depthCase = sql`${depthCase} WHEN ${item.entityId}::uuid THEN ${item.depth}::integer`;
            }
            traceIdCase = sql`${traceIdCase} END`;
            depthCase = sql`${depthCase} END`;

            // We use sql.table and sql.ref for identifier safety.
            await sql`
                WITH old_state AS (
                    SELECT id, fk_team_id, fk_member_id, title, status 
                    FROM project_task 
                    WHERE id IN (${sql.join(
                        ids.map((id) => sql`${id}::uuid`),
                        sql`, `,
                    )})
                ),
                updated_task AS (
                    UPDATE project_task
                    SET ${sql.join(setClauses, sql`, `)}
                    WHERE id IN (${sql.join(
                        ids.map((id) => sql`${id}::uuid`),
                        sql`, `,
                    )})
                    RETURNING id, fk_project_id, fk_team_id, fk_member_id, title, status
                ),
                inserted_outbox AS (
                    INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
                    SELECT 
                        'task-events',
                        u.fk_project_id::text,
                        jsonb_build_object(
                            'type', 'task.updated',
                            'taskId', u.id,
                            'projectId', u.fk_project_id,
                            'old', jsonb_build_object(
                                'teamId', o.fk_team_id,
                                'memberId', o.fk_member_id,
                                'title', o.title,
                                'status', o.status
                            ),
                            'new', jsonb_build_object(
                                'teamId', u.fk_team_id,
                                'memberId', u.fk_member_id,
                                'title', u.title,
                                'status', u.status
                            ),
                            'actorId', 'system:autopilot',
                            'traceId', ${traceIdCase},
                            'depth', ${depthCase}
                        )
                    FROM updated_task u
                    JOIN old_state o ON u.id = o.id
                )
                SELECT 1
            `.execute(db);
        } else {
            // Fallback simple update
            await sql`
                UPDATE ${sql.table(entityType)}
                SET ${sql.join(setClauses, sql`, `)}
                WHERE id IN (${sql.join(
                    ids.map((id) => sql`${id}::uuid`),
                    sql`, `,
                )})
            `.execute(db);
        }
    }
}

/**
 * Export a singleton instance for global use in the orchestrator.
 */
export const smartAggregator = new SmartAggregator();
