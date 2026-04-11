import { db } from './src/database/index.ts';
import { AuthServiceImpl } from './src/modules/auth/internal/AuthServiceImpl.ts';

async function test() {
    const auth = new AuthServiceImpl();
    try {
        const res = await auth.searchUsers({ search: '', cursor: undefined, actorId: '3cde0ca8-092e-4fa4-97d6-3bf4665b37ba' });
        console.log(res);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

test();
