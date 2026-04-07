import { db } from './src/database/index.ts';

async function run() {
    const res = await db.selectFrom('project_task').where('id', '=', '00000000-0000-0000-0000-000000000000' as any).execute();
    console.log('RES EMPTY:', res);
    process.exit(0);
}
run();
