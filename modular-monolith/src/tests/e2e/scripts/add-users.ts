import { db } from '../../../database/index.ts';

/**
 * Converts a 0-indexed integer into a base-26 alphabetical string.
 * Examples: 0 -> a, 1 -> b, ..., 25 -> z, 26 -> aa, 27 -> ab, etc.
 */
function getLetterSequence(index: number): string {
    let result = '';
    let curr = index;
    while (curr >= 0) {
        result = String.fromCharCode(97 + (curr % 26)) + result;
        curr = Math.floor(curr / 26) - 1;
    }
    return result;
}

async function addUsers(count: number) {
    console.log(`Adding ${count} users...`);

    const batchSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < count; i += batchSize) {
        const users = [];
        const end = Math.min(i + batchSize, count);

        for (let j = i; j < end; j++) {
            const seq = getLetterSequence(j);
            users.push({
                email: `${seq}@a.a`,
                username: `${seq}_${Math.random().toString(36).substring(2, 8)}`,
                password_hash: 'a', // Explicitly setting password to 'a'
            });
        }

        // Insert using Kysely in batches for massive performance
        await db.insertInto('users').values(users).execute();

        totalInserted += users.length;
        console.log(`Inserted batch: ${totalInserted} / ${count} users`);
    }

    console.log('Successfully finished adding users.');
    process.exit(0);
}

// Read from CLI arguments
const args = process.argv.slice(2);
const countInput = args[0] || '';
const count = parseInt(countInput, 10);

if (Number.isNaN(count) || count <= 0) {
    console.error('❌ Please provide a valid number of users to add.');
    console.error(
        '👉 Usage: bun run src/tests/e2e/scripts/add-users.ts <count>',
    );
    console.error('👉 Example: bun run src/tests/e2e/scripts/add-users.ts 100');
    process.exit(1);
}

addUsers(count).catch((err) => {
    console.error('❌ Error adding users:', err);
    process.exit(1);
});
