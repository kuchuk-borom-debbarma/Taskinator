/**
 * @file ConditionRepository.test.ts
 * @description Integration tests for ConditionRepository.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database/index.js';
import { ConditionRepository } from './ConditionRepository.js';
import type { ConditionAST } from './types.js';

describe('ConditionRepository', () => {
    const repo = new ConditionRepository();
    const userId = uuidv4();
    let projectId: string;

    beforeAll(async () => {
        // Create a project
        const projResult = await db
            .insertInto('project')
            .values({
                name: 'Repo Test Project',
                fk_user_id: userId,
            })
            .returning('id')
            .executeTakeFirstOrThrow();
        projectId = projResult.id;
    });

    afterAll(async () => {
        // Cleanup labels and project
        await db
            .deleteFrom('condition_labels')
            .where('project_id', '=', projectId)
            .execute();
        await db.deleteFrom('project').where('id', '=', projectId).execute();
    });

    it('should save a condition and retrieve it by label', async () => {
        const ast: ConditionAST = {
            field: 'status',
            operator: 'eq',
            value: 'DONE',
        };
        const label = 'is_done';

        const hash = await repo.saveCondition(label, ast, projectId, userId);
        expect(hash).toBeDefined();

        const retrieved = await repo.getConditionByLabel(label, projectId);
        expect(retrieved).toEqual(ast);
    });

    it('should deduplicate identical conditions', async () => {
        const ast: ConditionAST = {
            field: 'priority',
            operator: 'gt',
            value: 5,
        };

        const hash1 = await repo.saveCondition(
            'high_priority',
            ast,
            projectId,
            userId,
        );
        const hash2 = await repo.saveCondition(
            'urgent',
            ast,
            projectId,
            userId,
        );

        expect(hash1).toBe(hash2);

        // Check DB directly to ensure only one record in conditions table
        const countResult = await db
            .selectFrom('conditions')
            .select(sql<number>`count(*)`.as('count'))
            .where('id', '=', hash1)
            .executeTakeFirstOrThrow();

        expect(Number(countResult.count)).toBe(1);
    });

    it('should update label mapping if same label is used for different AST', async () => {
        const label = 'dynamic_label';
        const ast1: ConditionAST = { field: 'a', operator: 'eq', value: 1 };
        const ast2: ConditionAST = { field: 'b', operator: 'eq', value: 2 };

        const hash1 = await repo.saveCondition(label, ast1, projectId, userId);
        const hash2 = await repo.saveCondition(label, ast2, projectId, userId);

        expect(hash1).not.toBe(hash2);

        const retrieved = await repo.getConditionByLabel(label, projectId);
        expect(retrieved).toEqual(ast2);
    });

    it('should retrieve a condition by hash', async () => {
        const ast: ConditionAST = {
            field: 'test',
            operator: 'exists',
        };
        const hash = await repo.saveCondition(
            'test_hash',
            ast,
            projectId,
            userId,
        );

        const retrieved = await repo.getConditionByHash(hash);
        expect(retrieved).toEqual(ast);
    });
});
