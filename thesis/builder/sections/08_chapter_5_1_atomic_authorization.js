const { h1, h2, h3, body, emptyLine, imgPlaceholder, figCaption, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter5_1() {
  return [
    h1("5. SECURITY AND ACCESS CONTROL"),
    body("In a multi-tenant enterprise orchestration tool, robust data segregation and authorization are paramount. Users must be mathematically proven to have access to specific project entities before any mutation can occur. However, calculating these permissions synchronously during high-throughput HTTP requests typically incurs massive database overhead due to the required JOIN operations."),

    h2("5.1 CTE-Based Atomic Authorization"),
    body("To avoid executing multiple sequential roundtrips to an external authorization service or executing separate SELECT permission verification queries before every single mutation, Taskinator bakes the Role-Based Access Control (RBAC) security matrix directly into the underlying SQL mutation utilizing Common Table Expressions (CTEs)."),
    emptyLine(),
    imgPlaceholder("Figure 5.1: RBAC Authorization Flow"),
    figCaption("Figure 5.1: RBAC Authorization Flow"),
    
    h3("5.1.1 The Single-Trip Security Paradigm"),
    body("Traditional monolithic APIs often utilize a middleware approach: a request arrives, the middleware pauses execution, queries the database to verify if the user's ID exists in the project_member mapping table, waits for the boolean result, and then either rejects the request or allows the controller to proceed with the mutation."),
    body("At 10,000 RPS, this doubling of query volume (one for auth, one for mutation) halves the effective capacity of the database connection pool. Taskinator implements Single-Trip Atomic Security:"),
    codeLine("WITH auth_check AS (", 120),
    codeLine("    SELECT 1 FROM project_member"),
    codeLine("    WHERE fk_project_id = $1 AND fk_user_id = $2"),
    codeLine("    AND role IN ('OWNER', 'ADMIN', 'EDITOR')"),
    codeLine(")"),
    codeLine("UPDATE project_task SET title = $3"),
    codeLine("WHERE id = $4 AND EXISTS (SELECT 1 FROM auth_check)"),
    codeLine("RETURNING *;", 0, 120),
    body("The query execution planner evaluates the EXISTS clause first. If the user lacks the necessary hierarchical permissions, the CTE returns empty, the EXISTS clause evaluates to FALSE, and the UPDATE statement is safely and silently aborted at the engine level without locking the target row. The database immediately returns 0 affected rows to the Node.js API, which translates this into an HTTP 403 Forbidden or 404 Not Found response, obscuring the exact failure reason from potential attackers to prevent enumeration vectors."),
  ];
};
