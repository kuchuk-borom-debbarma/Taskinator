import pg from 'pg';

const pool = new pg.Pool({
  user: 'admin',
  password: 'password',
  host: 'localhost',
  port: 5434,
  database: 'test',
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Adding priority column to project_task...');
    await client.query(`
      ALTER TABLE project_task 
      ADD COLUMN IF NOT EXISTS priority INT DEFAULT 3;
    `);
    console.log('Success!');
  } catch (err) {
    console.error('Error adding priority column:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
