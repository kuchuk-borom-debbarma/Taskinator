const { centeredBold, emptyLine, pageBreak, TableOfContents } = require('../utils');

module.exports = function getListsAndTOC() {
  return [
    // ══════════════════════════════════════════════════════════════
    // LIST OF FIGURES
    // ══════════════════════════════════════════════════════════════
    centeredBold("List of Figures", 24),
    emptyLine(),
    new TableOfContents("", {
      hyperlink: true,
      headingStyleRange: "4-4",
    }),
    emptyLine(), emptyLine(), emptyLine(),

    // ══════════════════════════════════════════════════════════════
    // LIST OF TABLES
    // ══════════════════════════════════════════════════════════════
    centeredBold("List of Tables", 24),
    emptyLine(),
    new TableOfContents("", {
      hyperlink: true,
      headingStyleRange: "5-5",
    }),
    emptyLine(), emptyLine(),

    pageBreak(),

    // ══════════════════════════════════════════════════════════════
    // TABLE OF CONTENTS
    // ══════════════════════════════════════════════════════════════
    centeredBold("Table of Contents", 24),
    emptyLine(),
    new TableOfContents("", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),

    pageBreak(),
  ];
};
