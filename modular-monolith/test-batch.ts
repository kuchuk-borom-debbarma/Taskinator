import { db } from './src/database/index.ts';
import {
    createTask,
    createChildTask,
    createUser,
    createProject,
} from './src/__tests__/helpers/factories.ts';
import { deleteChildrenTasksBatch } from './src/modules/task/internal/TaskQueries.ts';

async function run() {
    const user = await createUser();
    const project = await createProject(user.id);

    const parent = await createTask(project.id, user.id, { title: 'Parent' });
    console.log('Parent ID:', parent.id, 'Path:', parent.materializedPath);

    const child = await createChildTask(project.id, user.id, parent, {
        title: 'Child',
    });
    console.log('Child ID:', child.id, 'Path:', child.materializedPath);

    const check = await db
        .selectFrom('project_task')
        .selectAll()
        .where('fk_project_id', '=', project.id as any)
        .execute();
    console.log(
        'ALL TASKS:',
        check.map((t) => ({ id: t.id, path: t.materialized_path })),
    );

    console.log('Deleting children for parentPath:', parent.id);
    const result = await deleteChildrenTasksBatch(project.id, parent.id, 100);
    console.log('Deleted:', result);

    process.exit(0);
}
run();
