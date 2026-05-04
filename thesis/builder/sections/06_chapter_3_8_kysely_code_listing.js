const { h2, h3, body, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter3_8() {
  return [
    h2("3.8 Architectural Implementation: Kysely wCTE Query Builder"),
    body("To interface with the PostgreSQL database in a strictly typed manner, Taskinator eschews traditional heavy ORMs (like Prisma or TypeORM) in favor of Kysely, a type-safe SQL query builder. Heavy ORMs frequently abstract away crucial performance details and struggle to compile complex WITH clauses efficiently."),

    h3("3.8.1 Atomic Insertion Code Listing"),
    body("The following TypeScript excerpt from TaskService.ts demonstrates the programmatic construction of the Transactional Outbox pattern. The code utilizes Kysely's with method to chain the data insertion and the event emission natively within the database engine."),
    
    codeLine("export async function createTaskWithEvent(db: Kysely<DB>, input: TaskInput) {", 120),
    codeLine("  return await db"),
    codeLine("    .with('inserted_task', (db) => db"),
    codeLine("      .insertInto('project_task')"),
    codeLine("      .values({"),
    codeLine("        id: sql`gen_random_uuid()`, // Native DB execution"),
    codeLine("        fk_project_id: input.projectId,"),
    codeLine("        title: input.title,"),
    codeLine("        status: 'TODO',"),
    codeLine("        version: 1,"),
    codeLine("      })"),
    codeLine("      .returningAll()"),
    codeLine("    )"),
    codeLine("    .with('inserted_event', (db) => db"),
    codeLine("      .insertInto('outbox_events')"),
    codeLine("      .values((eb) => ({"),
    codeLine("        aggregate_id: eb.selectFrom('inserted_task').select('id'),"),
    codeLine("        event_type: 'TASK_CREATED',"),
    codeLine("        // Constructing the JSON payload at the database level"),
    codeLine("        payload: sql`jsonb_build_object('title', ${input.title})`"),
    codeLine("      }))"),
    codeLine("    )"),
    codeLine("    .selectFrom('inserted_task') // Return the business entity"),
    codeLine("    .selectAll()"),
    codeLine("    .executeTakeFirstOrThrow();"),
    codeLine("}", 0, 120),
    
    h3("3.8.2 Code Analysis"),
    body("By chaining the .with() calls, the application ensures that the query planner generates a single execution graph. The line aggregate_id: eb.selectFrom('inserted_task').select('id') is critical: it proves that the system does not need to return the newly generated UUID back to the Node.js process before inserting the event. The UUID is passed directly between the CTE expressions internally within PostgreSQL memory, reducing total latency by an entire network round-trip. This programmatic rigor guarantees the elimination of the Dual-Write problem."),

    pageBreak(),
  ];
};
