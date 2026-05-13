const { Paragraph, TextRun, AlignmentType } = require('docx');
const { emptyLine, centeredBold, centered, insertImage, pageBreak, F } = require('../utils');

module.exports = function getCover() {
  return [
    emptyLine(), emptyLine(),
    centeredBold("A THESIS REPORT", 28),
    centered("On", 22),
    emptyLine(),
    centeredBold("Design and Implementation of a High-Throughput Event-Driven Project and Task Management Application", 24),
    emptyLine(), emptyLine(),
    centered("Submitted by", 22, true),
    emptyLine(),
    centeredBold("Kuchuk Borom Debbarma", 24),
    emptyLine(),
    centered("In partial fulfillment for the award of the degree", 22),
    centered("of", 22),
    centeredBold("M.Tech (CSE)", 24),
    emptyLine(), emptyLine(),
    centeredBold("Under the Guidance of", 22),
    emptyLine(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Guide Name: ", bold: true, size: 22, font: F }), new TextRun({ text: "Dr. Abhijit Biswas", size: 22, font: F })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Designation: ", bold: true, size: 22, font: F }), new TextRun({ text: "Coordinator CSE & CA", size: 22, font: F })] }),
    emptyLine(), emptyLine(),
    insertImage("logo.png"),
    emptyLine(),
    centeredBold("The ICFAI University, Tripura", 24),
    centeredBold("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", 22),
    centeredBold("ICFAI Technical School Faculty of Science and Technology", 22),
    emptyLine(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Course Code: ", bold: true, size: 22, font: F }), new TextRun({ text: "CSE620P", size: 22, font: F })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Course Title: ", bold: true, size: 22, font: F }), new TextRun({ text: "Thesis Report II", size: 22, font: F })] }),
    centered("2025-2026", 22),

    pageBreak(),
  ];
};
