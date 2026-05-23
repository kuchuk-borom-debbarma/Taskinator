import { sql } from 'kysely';
import { db } from './src/database/index.ts';

async function list() {
    try {
        const res =
            await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`.execute(
                db,
            );
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

list();
