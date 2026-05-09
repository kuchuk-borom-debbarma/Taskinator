const {
  Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageBreak, ImageRun,
  PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
  TableOfContents
} = require('docx');
const fs = require('fs');
const path = require('path');

// ── Constants ─────────────────────────────────────────────────────────────────
const CONTENT_W = 9026; // A4 with 1" margins in DXA

// ── Border helpers ────────────────────────────────────────────────────────────
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── Paragraph helpers ─────────────────────────────────────────────────────────
const F = "Times New Roman";
const CODE_F = "Courier New";

function body(text, spaceBefore = 0, spaceAfter = 120) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: spaceBefore, after: spaceAfter },
    children: [new TextRun({ text, size: 22, font: F })]
  });
}

function bodyRuns(runs, spaceBefore = 0) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: spaceBefore, after: 120 },
    children: runs
  });
}

function run(text, bold = false, italic = false) {
  return new TextRun({ text, bold, italics: italic, size: 22, font: F });
}

function centered(text, size = 22, italic = false, bold = false) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size, font: F, italics: italic, bold })]
  });
}

function centeredBold(text, size = 24) {
  return centered(text, size, false, true);
}

function emptyLine() {
  return new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 0, after: 100 } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 240 },
    pageBreakBefore: true,
    children: [new TextRun({ text, bold: true, size: 28, font: F })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 180 },
    children: [new TextRun({ text, bold: true, size: 24, font: F })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22, font: F })]
  });
}

function h4(text) {
  return new Paragraph({
    spacing: { before: 160, after: 100 },
    children: [new TextRun({ text, bold: true, underline: {}, size: 22, font: F })]
  });
}

function boldLabel(label, rest) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 120, after: 80 },
    children: [new TextRun({ text: label, bold: true, size: 22, font: F }), new TextRun({ text: rest, size: 22, font: F })]
  });
}

function bullet(text, ref = "b1") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text, size: 22, font: F })]
  });
}

function bulletRuns(runs, ref = "b1") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 0, after: 80 },
    children: runs
  });
}

function numbered(text, ref = "n1") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text, size: 22, font: F })]
  });
}

function numberedRuns(runs, ref = "n1") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 0, after: 80 },
    children: runs
  });
}

// Code block (monospaced, indented)
function codeLine(text, spaceBefore = 0, spaceAfter = 0) {
  return new Paragraph({
    spacing: { before: spaceBefore, after: spaceAfter },
    indent: { left: 720 },
    children: [new TextRun({ text, size: 20, font: CODE_F })]
  });
}

function codeBlock(text, spaceBefore = 120, spaceAfter = 120) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const sb = i === 0 ? spaceBefore : 0;
    const sa = i === lines.length - 1 ? spaceAfter : 0;
    return codeLine(line, sb, sa);
  }).flat();
}

// Image placeholder (keep for fallback/backwards compatibility)
function imgPlaceholder(label) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.DASHED, size: 6, color: "888888" },
          bottom: { style: BorderStyle.DASHED, size: 6, color: "888888" },
          left: { style: BorderStyle.DASHED, size: 6, color: "888888" },
          right: { style: BorderStyle.DASHED, size: 6, color: "888888" }
        },
        shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
        margins: { top: 220, bottom: 220, left: 220, right: 220 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `[ Image Placeholder: ${label} ]`, italics: true, size: 20, font: F, color: "666666" })]
        })]
      })]
    })]
  });
}

// Insert real image from diagrams folder
function insertImage(filename) {
  const imagePath = path.join(__dirname, '../diagrams', filename);
  
  if (!fs.existsSync(imagePath)) {
    console.warn(`Warning: Image not found: ${imagePath}`);
    return imgPlaceholder(filename);
  }

  const buf = fs.readFileSync(imagePath);
  let w = 600;
  let h = 400;
  
  // Read PNG dimensions natively from the header
  if (buf.toString('hex', 0, 8) === '89504e470d0a1a0a') {
    w = buf.readUInt32BE(16);
    h = buf.readUInt32BE(20);
  }

  // Max width roughly 6.25 inches (CONTENT_W / 1440). Standard is ~600px width.
  const maxWidth = 600;
  if (w > maxWidth) {
    const ratio = maxWidth / w;
    w = maxWidth;
    h = Math.round(h * ratio);
  }

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [
      new ImageRun({
        data: fs.readFileSync(imagePath),
        transformation: {
          width: w,
          height: h
        }
      })
    ]
  });
}

function figCaption(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_4,
    children: [new TextRun({ text, size: 20, font: F })]
  });
}

// TOC / list entry with dot leader
function tocEntry(text, pageNum, indentLeft = 0) {
  return new Paragraph({
    spacing: { before: 0, after: 80 },
    indent: indentLeft ? { left: indentLeft } : undefined,
    children: [
      new TextRun({ text, size: 22, font: F }),
      new TextRun({
        children: [
          new PositionalTab({
            alignment: PositionalTabAlignment.RIGHT,
            relativeTo: PositionalTabRelativeTo.MARGIN,
            leader: PositionalTabLeader.DOT,
          }),
          pageNum,
        ],
        size: 22,
        font: F,
      }),
    ],
  });
}

// Table helpers
function tblHeader(cells, widths) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((c, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: "D9E1F2", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: c, bold: true, size: 20, font: F })] })]
    }))
  });
}

function tblRow(cells, widths, shade = false) {
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: shade ? "F5F5F5" : "FFFFFF", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: c, size: 20, font: F })] })]
    }))
  });
}

function tblCaption(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_5,
    children: [new TextRun({ text, size: 22, font: F })]
  });
}

// Signature block (2-column, no borders)
function sigBlock(left, right) {
  const hw = Math.floor(CONTENT_W / 2);
  function sigCell(name, title) {
    return new TableCell({
      width: { size: hw, type: WidthType.DXA },
      borders: noBorders,
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: ".......................................................", size: 22, font: F })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: "Signature", size: 22, font: F })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 }, children: [new TextRun({ text: name, bold: true, size: 22, font: F })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: title, bold: true, size: 22, font: F })] }),
      ]
    });
  }
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [hw, hw],
    borders: noBorders,
    rows: [new TableRow({ children: [sigCell(left.name, left.title), sigCell(right.name, right.title)] })]
  });
}

module.exports = {
  CONTENT_W, F, CODE_F,
  body, bodyRuns, run, centered, centeredBold, emptyLine, pageBreak,
  h1, h2, h3, h4, boldLabel, bullet, bulletRuns, numbered, numberedRuns,
  codeLine, codeBlock, imgPlaceholder, insertImage, figCaption, tocEntry,
  tblHeader, tblRow, tblCaption, sigBlock, TableOfContents
};
