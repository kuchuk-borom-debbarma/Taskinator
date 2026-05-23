import { performance } from 'node:perf_hooks';
import {
    createProject,
    createUser,
} from '../../__tests__/helpers/factories.ts';
import { db } from '../../database/index.ts';
import {
    expandTaskReachability,
    syncTaskGraphCounters,
} from '../../modules/task/internal/TaskQueries.ts';

async function setupDeepGraph(
    projectId: string,
    userId: string,
    count: number,
    depth: number,
) {
    const taskIds: string[] = [];

    console.log(`Creating ${count} tasks...`);
    // Create tasks
    for (let i = 0; i < count; i++) {
        const result = await db
            .insertInto('project_task')
            .values({
                fk_project_id: projectId,
                title: `Task ${i}`,
                status: 'TODO',
                priority: 1,
                created_by: userId,
                updated_by: userId,
            })
            .returning('id')
            .executeTakeFirstOrThrow();
        taskIds.push(result.id);
    }

    console.log(`Linking tasks into a chain of depth ${depth}...`);
    // Create a chain of depth levels
    const tasksPerLevel = Math.max(1, Math.floor(count / depth));
    for (let d = 0; d < depth - 1; d++) {
        for (let i = 0; i < tasksPerLevel; i++) {
            const parentIdx = d * tasksPerLevel + i;
            const childIdx = (d + 1) * tasksPerLevel + i;
            if (parentIdx < taskIds.length && childIdx < taskIds.length) {
                const sourceId = taskIds[parentIdx]!;
                const targetId = taskIds[childIdx]!;

                // Insert link
                await db
                    .insertInto('task_link')
                    .values({
                        fk_project_id: projectId,
                        source_task_id: sourceId,
                        target_task_id: targetId,
                        label: 'blocks',
                        created_by: userId,
                    })
                    .execute();

                // Manually expand reachability for profiling
                await expandTaskReachability(
                    db as any,
                    projectId,
                    sourceId,
                    targetId,
                );
            }
        }
    }

    // Sync counters
    await syncTaskGraphCounters(db as any, projectId);

    return taskIds;
}

async function runProfiling() {
    console.log('--- Starting Performance Profiling ---');
    const user = await createUser();
    const project = await createProject(user.id);

    const COUNT = 100;
    const DEPTH = 10;

    console.log(`Setting up deep graph: ${COUNT} tasks, ${DEPTH} levels...`);
    const startSetup = performance.now();
    const taskIds = await setupDeepGraph(project.id, user.id, COUNT, DEPTH);
    const endSetup = performance.now();
    console.log(`Setup took ${(endSetup - startSetup).toFixed(2)}ms`);

    // Test 1: Reachability Descendant Lookup
    console.log(
        'Test 1: Reachability Descendant Lookup (Ancestors -> Descendants)',
    );
    const rootTaskId = taskIds[0]!;
    const startReach = performance.now();
    const descendants = await db
        .selectFrom('task_reachability')
        .selectAll()
        .where('ancestor_task_id', '=', rootTaskId)
        .execute();
    const endReach = performance.now();
    console.log(
        `Found ${descendants.length} descendants for root task in ${(endReach - startReach).toFixed(2)}ms`,
    );

    // Test 2: Blocker Resolution Logic (CascadeService logic)
    console.log('Test 2: Blocker Resolution Logic (Check if target is ready)');
    const startBlocker = performance.now();
    const result = await db
        .selectFrom('task_link')
        .select('target_task_id')
        .where('source_task_id', '=', taskIds[0]!)
        .where('label', '=', 'blocks')
        .where((eb) =>
            eb.not(
                eb.exists(
                    eb
                        .selectFrom('task_link as tl2')
                        .innerJoin(
                            'project_task as pt2',
                            'pt2.id',
                            'tl2.source_task_id',
                        )
                        .whereRef(
                            'tl2.target_task_id',
                            '=',
                            'task_link.target_task_id',
                        )
                        .where('tl2.label', '=', 'blocks')
                        .where('tl2.source_task_id', '!=', taskIds[0]!)
                        .where('pt2.status', '!=', 'DONE'),
                ),
            ),
        )
        .execute();
    const endBlocker = performance.now();
    console.log(
        `Blocker resolution check took ${(endBlocker - startBlocker).toFixed(2)}ms (found ${result.length} potentially ready targets)`,
    );

    process.exit(0);
}

runProfiling().catch((err) => {
    console.error('Profiling failed:', err);
    process.exit(1);
});
