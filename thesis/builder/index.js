const { Document, Packer, LevelFormat, AlignmentType, Footer, Paragraph, TextRun, PageNumber } = require('docx');
const fs = require('fs');
const { F } = require('./utils');

const getCover = require('./sections/00_cover');
const getDeclarationAndCertificate = require('./sections/01_declaration_certificate');
const getAbstractAndAck = require('./sections/02_abstract_ack');
const getListsAndTOC = require('./sections/03_lists_toc');
const getChapter1_1 = require('./sections/04_chapter_1_1_problem_overview');
const getChapter1_2 = require('./sections/04_chapter_1_2_hardware_software_specs');
const getChapter2_1 = require('./sections/05_chapter_2_1_research_gaps');
const getChapter2_2 = require('./sections/05_chapter_2_2_summary');
const getChapter3_1 = require('./sections/06_chapter_3_1_architecture');
const getChapter3_2 = require('./sections/06_chapter_3_2_domain_modeling');
const getChapter3_3 = require('./sections/06_chapter_3_3_database_optimization');
const getChapter4 = require('./sections/07_chapter_4_eda');
const getChapter5 = require('./sections/08_chapter_5_frontend');
const getChapter6 = require('./sections/09_chapter_6_testing');
const getChapter7 = require('./sections/10_chapter_7_conclusion');
const getReferences = require('./sections/11_references');

const doc = new Document({
  numbering: {
    config: [
      { reference: "b1", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b3", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b4", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b5", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "n1", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "n2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "n3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "n4", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "n5", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: F, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: F }, paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: F }, paragraph: { spacing: { before: 280, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: F }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: [PageNumber.CURRENT], size: 20, font: F })]
        })]
      })
    },
    children: [
      ...getCover(),
      ...getDeclarationAndCertificate(),
      ...getAbstractAndAck(),
      ...getListsAndTOC(),
      ...getChapter1_1(),
      ...getChapter1_2(),
      ...getChapter2_1(),
      ...getChapter2_2(),
      ...getChapter3_1(),
      ...getChapter3_2(),
      ...getChapter3_3(),
      ...getChapter4(),
      ...getChapter5(),
      ...getChapter6(),
      ...getChapter7(),
      ...getReferences(),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(__dirname + "/taskinator_thesis_v2.docx", buf);
  console.log("Done! Written to", __dirname + "/taskinator_thesis_v2.docx");
}).catch(e => { console.error(e); process.exit(1); });
