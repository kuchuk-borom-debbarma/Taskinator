const { Paragraph, TextRun, AlignmentType } = require('docx');
const { emptyLine, centeredBold, insertImage, pageBreak, body, sigBlock, F } = require('../utils');

module.exports = function getDeclarationAndCertificate() {
  return [
    // ══════════════════════════════════════════════════════════════
    // DECLARATION
    // ══════════════════════════════════════════════════════════════
    emptyLine(),
    insertImage("logo.png"),
    emptyLine(),
    centeredBold("The ICFAI University, Tripura", 22),
    centeredBold("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", 22),
    emptyLine(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 180 }, children: [new TextRun({ text: "Declaration of Student", size: 24, font: F })] }),
    body('I hereby declare that the project entitled "Design and Implementation of a High-Throughput Event-Driven Project and Task Management Application" submitted for the Thesis Report II CSE620P, is my original work and the project has not formed the basis for the award of any other degree, diploma, fellowship or any other similar titles.'),
    emptyLine(), emptyLine(),
    new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Date: ", bold: true, size: 22, font: F }), new TextRun({ text: "20/05/2026", size: 22, font: F })] }),
    new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Signature: ", bold: true, size: 22, font: F }), new TextRun({ text: "_________________", size: 22, font: F })] }),
    new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Name: ", bold: true, size: 22, font: F }), new TextRun({ text: "Kuchuk Borom Debbarma", size: 22, font: F })] }),
    new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Department of CSE", bold: true, size: 22, font: F })] }),

    pageBreak(),

    // ══════════════════════════════════════════════════════════════
    // CERTIFICATE
    // ══════════════════════════════════════════════════════════════
    emptyLine(),
    insertImage("logo.png"),
    emptyLine(),
    centeredBold("The ICFAI University, Tripura", 22),
    centeredBold("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", 22),
    emptyLine(),
    centeredBold("CERTIFICATE", 24),
    emptyLine(),
    body('This is to certify that the project titled "Design and Implementation of a High-Throughput Event-Driven Project and Task Management Application" is the bonafide work carried out by Kuchuk Borom Debbarma student of M.Tech of Department of Computer Science and Engineering, during the Thesis report 2026, in partial fulfillment of the requirements for the award of the degree and that the project has not formed the basis for the award previously of any other degree, diploma, fellowship or any other similar title.'),
    emptyLine(), emptyLine(),
    sigBlock({ name: "Dr. Abhijit Biswas", title: "Coordinator CSE & CA" }, { name: "Dr. Saptarshi Chakraborty", title: "Head of the Department (CSE)" }),
    emptyLine(),
    sigBlock({ name: "", title: "" }, { name: "Dr. Prasanta Kumar Sinha", title: "Principal, ITS" }),

    pageBreak(),
  ];
};
