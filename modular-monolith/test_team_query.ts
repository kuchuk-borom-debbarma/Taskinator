import { db } from './src/database/index.ts';
import { searchTeamUsers } from './src/modules/team/internal/TeamQueries.ts';

async function test() {
    try {
        const res = await searchTeamUsers({
            actorId: '3cde0ca8-092e-4fa4-97d6-3bf4665b37ba',
            projectId: '3cde0ca8-092e-4fa4-97d6-3bf4665b37ba', // dummy uuids just to test syntax
            teamId: '3cde0ca8-092e-4fa4-97d6-3bf4665b37ba',
            search: '',
            cursor: undefined,
        });
        console.log(res);
    } catch (e: any) {
        console.error(e.message);
    }
    process.exit(0);
}

test();
