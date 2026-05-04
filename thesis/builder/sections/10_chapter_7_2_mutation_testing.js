const { h2, body, pageBreak } = require('../utils');

module.exports = function getChapter7_2() {
  return [
    h2("7.2 Mutation Testing with Stryker"),
    body("Traditional \"100% Code Coverage\" is a highly deceptive metric; it proves mathematically that the test runner executed specific lines of code, but it completely fails to guarantee that the test assertions actually validate the correct business outcomes. A test could execute a function and simply assert 'true === true', achieving coverage without providing any safety."),
    body("To guarantee the integrity of the critical domain rules (such as the Parent Guard Triggers or the RBAC matrix), Taskinator utilizes Stryker Mutator to measure true test efficacy."),
    body("Instead of merely parsing the Abstract Syntax Tree (AST) for execution coverage, Stryker actively injects algorithmic bugs (mutants) directly into the source code during the testing phase. For example, it might change an equality check (=== to !==), alter a SQL comparison boundary (>= to <), or mutate a boolean logic gate (&& to ||)."),
    body("It then runs the Jest test suite against this mutated code. If the test suite passes despite the injected bug, the mutant is considered to have \"survived.\" A surviving mutant indicates a severe flaw in the test assertions, proving that the test suite is incapable of catching regressions. By achieving a high \"Mutation Score,\" the development team gains unparalleled confidence that the complex event-driven business logic is definitively protected against silent degradation."),
  ];
};
