const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader
} = require('docx');
const fs = require('fs');

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

// Image placeholder
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

function figCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 240 },
    children: [new TextRun({ text, italics: true, bold: true, size: 20, font: F })]
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
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, font: F })]
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

// ── DOCUMENT ──────────────────────────────────────────────────────────────────
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

      // ══════════════════════════════════════════════════════════════
      // COVER PAGE
      // ══════════════════════════════════════════════════════════════
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
      imgPlaceholder("ICFAI University Tripura Logo"),
      emptyLine(),
      centeredBold("The ICFAI University, Tripura", 24),
      centeredBold("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", 22),
      centeredBold("ICFAI Technical School Faculty of Science and Technology", 22),
      emptyLine(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Course Code: ", bold: true, size: 22, font: F }), new TextRun({ text: "CSE620P", size: 22, font: F })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Course Title: ", bold: true, size: 22, font: F }), new TextRun({ text: "Thesis Report II", size: 22, font: F })] }),
      centered("2025-2026", 22),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // DECLARATION
      // ══════════════════════════════════════════════════════════════
      emptyLine(),
      imgPlaceholder("ICFAI University Tripura Logo"),
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
      imgPlaceholder("ICFAI University Tripura Logo"),
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

      // ══════════════════════════════════════════════════════════════
      // ABSTRACT
      // ══════════════════════════════════════════════════════════════
      centeredBold("ABSTRACT", 26),
      emptyLine(),
      body("The demand for highly performant project management tools has grown exponentially as modern enterprises manage complex, deeply nested workflows. Traditional task management applications rely on strictly normalized database schemas and synchronous APIs that struggle to scale when subjected to massive task hierarchies, real-time synchronization demands, and high-frequency event triggers."),
      body('This thesis presents the design, implementation, and performance evaluation of "Taskinator," a full-stack project and task management application engineered for extreme scalability and real-time responsiveness. The system integrates a modern, interactive React-based frontend featuring a dynamic Task Graph visualization with a high-performance, event-driven Node.js backend.'),
      body("The core contribution is a comprehensive architectural framework capable of sustaining 10,000 Requests Per Second (RPS) without sacrificing data integrity. This is achieved through optimizations across three primary layers: (1) at the Database Layer, a Custom Closure Table pattern (Task Reachability Engine) for ultra-fast querying of infinite task hierarchies, combined with Optimistic Locking to prevent distributed race conditions; (2) at the Event-Driven Architecture (EDA) Layer, a Transactional Outbox pattern powered by atomic Data-Modifying Common Table Expressions (wCTE), with reactive PostgreSQL LISTEN/NOTIFY mechanics and SKIP LOCKED concurrency controls ensuring zero-loss event publishing across horizontally scaled pods; (3) at the Consumer Layer, a Smart Batch Aggregator performs strict chronological sorting and semantic event folding to trim down batches into net deltas, drastically reducing database write amplification and preventing infinite recursive loops."),
      body("Crucially, this thesis explores the necessary architectural trade-offs required to achieve this scale, specifically analyzing the drawbacks of Eventual Consistency. To maintain high read-throughput, the system employs aggressive Denormalization strategies for aggregate counts and user metadata. Real-time client updates are achieved via a zero-fan-out targeted routing mechanism using Redis and Server-Sent Events (SSE), directly intercepted by the Apollo GraphQL cache for instant UI reconciliation."),
      body("Experimental evaluations demonstrate that the application's asynchronous, batch-first processing model—including chunked self-signaling recursive deletions—successfully eliminates long-transaction database locks. The proposed architecture proves that by combining strict data access patterns, reactive frontend visualization, and a highly tuned event-driven backend, complex orchestration tools can achieve extreme scalability."),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // ACKNOWLEDGEMENT
      // ══════════════════════════════════════════════════════════════
      centeredBold("ACKNOWLEDGEMENT", 26),
      emptyLine(),
      body("I would like to express my special thanks of gratitude to my guide Dr. Abhijit Biswas for his able guidance and support in completing the project. A special thanks to the university administration, including the Principal, HOD, and Dean, for providing us with the necessary resources and opportunities to gain knowledge."),
      body("I would also like to thank God for giving me the strength and capability to complete this project. Finally, I extend my sincere thanks to my family, friends, and the entire ICFAI family for their continuous support."),
      emptyLine(),
      new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Name: ", bold: true, size: 22, font: F }), new TextRun({ text: "Kuchuk Borom Debbarma", size: 22, font: F })] }),
      new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Course: ", bold: true, size: 22, font: F }), new TextRun({ text: "M.Tech CSE", size: 22, font: F })] }),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // LIST OF FIGURES
      // ══════════════════════════════════════════════════════════════
      centeredBold("List of Figures", 24),
      emptyLine(),
      tocEntry("Figure 3.1: Full-Stack Layered Architecture and Data Flow — Taskinator", "14"),
      tocEntry("Figure 3.2: Core Domain Entity-Relationship (ER) Model", "17"),
      tocEntry("Figure 3.3: Task Reachability Engine — Closure Table Cross-Join Expansion", "19"),
      tocEntry("Figure 4.1: Transactional Outbox Workflow using wCTE", "23"),
      tocEntry("Figure 4.2: Concurrent Outbox Polling: Mitigating the Thundering Herd with SKIP LOCKED", "26"),
      tocEntry("Figure 4.3: Smart Batch Aggregator Data Flow and Semantic Folding", "28"),
      tocEntry("Figure 4.4: Chunked Self-Signaling Deletion (\"The Bubbling Effect\")", "31"),
      tocEntry("Figure 5.1: Targeted Redis Routing for Real-time Server-Sent Events (SSE)", "34"),
      tocEntry("Figure 5.2: Apollo Client SSE State Reconciliation Sequence", "36"),
      tocEntry("Figure 6.1: Automation Trigger Engine and System Actor Flow", "39"),
      tocEntry("Figure 6.2: Containerized Testing Architecture and Mutation Testing", "41"),
      emptyLine(),

      // ══════════════════════════════════════════════════════════════
      // LIST OF TABLES
      // ══════════════════════════════════════════════════════════════
      centeredBold("List of Tables", 24),
      emptyLine(),
      tocEntry("Table 6.1: Performance Metrics at 10,000 RPS", "43"),
      tocEntry("Table 6.2: Chunked vs Unbounded Deletion Benchmarks", "45"),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // TABLE OF CONTENTS
      // ══════════════════════════════════════════════════════════════
      centeredBold("Table of Contents", 24),
      emptyLine(),
      tocEntry("1. INTRODUCTION", "6"),
      tocEntry("1.1 Problem Definition", "6", 360),
      tocEntry("1.2 Project Overview", "7", 360),
      tocEntry("1.3 Hardware Specification", "9", 360),
      tocEntry("1.4 Software Specification", "10", 360),
      tocEntry("2. LITERATURE SURVEY", "13"),
      tocEntry("2.1 Research Gaps in Workflow Orchestration", "13", 360),
      tocEntry("2.2 Summary of Literature Review", "15", 360),
      tocEntry("3. SYSTEM ANALYSIS AND DESIGN", "19"),
      tocEntry("3.1 Overall System Architecture", "19", 360),
      tocEntry("3.2 Domain Modeling and ER Schema", "22", 360),
      tocEntry("3.3 Database Optimization & Denormalization", "24", 360),
      tocEntry("4. EVENT-DRIVEN PIPELINE (EDA) IMPLEMENTATION", "28"),
      tocEntry("4.1 The Transactional Outbox Pattern & wCTE", "28", 360),
      tocEntry("4.2 Concurrent Outbox Relays: Mitigating the Thundering Herd", "31", 360),
      tocEntry("4.3 Smart Batch Aggregation & Semantic Folding", "33", 360),
      tocEntry("4.4 Chunked Self-Signaling Deletion (The Bubbling Effect)", "36", 360),
      tocEntry("5. FRONTEND ARCHITECTURE AND REAL-TIME SYNCHRONIZATION", "38"),
      tocEntry("5.1 The React Task Graph and D3.js Visualization", "38", 360),
      tocEntry("5.2 Zero-Fan-Out Targeted Routing via Redis", "39", 360),
      tocEntry("5.3 Apollo Client Cache Reconciliation", "41", 360),
      tocEntry("6. IMPLEMENTATION, AUTOMATION, AND TESTING", "43"),
      tocEntry("6.1 Automation and Trigger Engine", "43", 360),
      tocEntry("6.2 Testing Methodology", "45", 360),
      tocEntry("6.3 Performance Analysis and Metrics", "47", 360),
      tocEntry("7. CONCLUSION AND FUTURE WORK", "51"),
      tocEntry("7.1 Conclusion", "51", 360),
      tocEntry("7.2 Future Work", "52", 360),
      tocEntry("REFERENCES", "53"),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // CHAPTER 1: INTRODUCTION
      // ══════════════════════════════════════════════════════════════
      h1("1. INTRODUCTION"),

      h2("1.1 Problem Definition"),
      body("As modern organizations scale their operations, project management demands have evolved from simple, flat to-do lists into highly complex, interconnected workflows involving hundreds of cross-functional teams. Enterprise projects are no longer linear; they consist of massively nested sub-tasks, strict multi-node dependency graphs, and multi-stage approval processes. To manage this complexity efficiently, software orchestration tools must provide instant visual feedback to stakeholders while guaranteeing absolute data integrity across thousands of concurrent users."),
      body("Designing software applications capable of handling massive scale—targeting upwards of 10,000 Requests Per Second (RPS)—presents a severe engineering challenge. Traditional monolithic CRUD (Create, Read, Update, Delete) architectures rapidly degrade under these conditions. In a purely synchronous environment, executing a complex business operation—such as deleting a high-level task that possesses thousands of descendants, or assigning a large group of members to a workflow—forces the database to execute massive cascading updates. These operations require long-lived row-level or table-level locks. Consequently, concurrent reads and writes from other users are blocked, transaction queues fill up, and the system experiences cascading timeout failures."),
      body("Furthermore, modern clients demand real-time interactivity. When a task status is updated by one user, other stakeholders viewing the same dashboard expect that update to reflect instantly on their screen without necessitating a manual page refresh. Implementing real-time synchronization at an enterprise scale introduces the infamous \"Fan-Out\" problem: if 1,000 users are concurrently connected to the application, broadcasting every single system event to every connected client saturates the internal network and overwhelms end-user devices with irrelevant data payloads."),
      body("According to the CAP theorem formulated by Eric Brewer, a distributed system can simultaneously provide only two of the following three guarantees: Consistency, Availability, and Partition Tolerance. In traditional relational architectures, design philosophies are heavily skewed towards Strong Consistency, ensuring that ACID (Atomicity, Consistency, Isolation, Durability) transactions block entirely until they are globally committed. However, under extreme load, prioritizing Strong Consistency inevitably sacrifices Availability, leading to system outages."),
      body("To achieve massive throughput without crippling the infrastructure, there is a fundamental need to shift away from blocking synchronous processing. The core problem addressed in this thesis is the design, implementation, and evaluation of a highly scalable workflow orchestration engine. This engine must mitigate database write amplification, prevent distributed race conditions through intelligent concurrency controls, and provide targeted real-time updates without compromising the core database stability or network bandwidth."),

      h2("1.2 Project Overview"),
      body("The primary objective of this thesis is to design and implement Taskinator, a full-stack workflow orchestration platform engineered specifically to achieve extreme throughput and zero-loss event processing. The system offers a comprehensive suite of tools designed to handle deeply nested task hierarchies, real-time multi-user collaboration, and complex event-driven automation."),
      body("Taskinator fundamentally prioritizes Availability and Partition Tolerance (AP in the CAP theorem context). To achieve a massive throughput of 10,000 RPS, the system deliberately sacrifices strict, immediate Consistency in favor of Eventual Consistency. This intentional architectural trade-off forms the foundation of the system's design, allowing the primary data store to process writes rapidly while offloading expensive side-effects to asynchronous background workers."),
      body("The core features and architectural milestones of the system include:"),
      numberedRuns([run("Project & Team Management Contexts: ", true), run("Organizations can create distinct operational projects and organize users into nested Team hierarchies. A sophisticated Custom Closure Table pattern ensures that access control calculations and bulk assignments execute rapidly in O(1) time complexity, natively respecting deep inheritance rules without requiring expensive recursive queries during runtime.")], "n1"),
      numberedRuns([run("Infinite Task Reachability Graph: ", true), run("Users are not constrained by flat lists; they can create infinitely nested tasks and sub-tasks, establishing complex multi-parent dependencies. These dependencies are represented visually through an interactive, heavily optimized React Task Graph, enabling intuitive navigation of massive project structures.")], "n1"),
      numberedRuns([run("Event-Driven Asynchrony (EDA): ", true), run("Critical user operations—such as creating tasks or establishing links—remain strictly synchronous to provide immediate HTTP responses and positive user feedback. However, computationally expensive side effects—such as aggregate count updates, notifications, and closure table path matrix calculations—are atomically offloaded to an Apache Kafka message broker for deferred processing.")], "n1"),
      numberedRuns([run("Zero-Fan-Out Real-Time Synchronization: ", true), run("A highly targeted, memory-resident Redis routing layer maps active user sessions to specific server instances. This ensures that Server-Sent Events (SSE) are pushed exclusively to the specific clients who are actively viewing the mutated data, reducing network fan-out from O(N) to near O(1).")], "n1"),
      numberedRuns([run("Rule-Based Automation & Triggers: ", true), run("The system incorporates a deterministic \"IF-THEN-CLEANUP\" engine that reacts natively to domain events. This handles complex workflows, such as \"Parent Guard Triggers,\" which automatically prevent parent tasks from being marked as completed if any descendant sub-tasks remain pending, preserving logical integrity across the graph.")], "n1"),

      h2("1.3 Hardware Specification"),
      body("The primary development, experimentation, and high-volume load-testing environment consisted of a modern computing system equipped with sufficient memory and processing power to handle large-scale concurrent requests, continuous event streaming, and intensive database container orchestration. The hardware configuration utilized during this research is detailed below:"),
      bulletRuns([run("Processor: ", true), run("Apple Silicon (M-series ARM64 architecture). This processor provided exceptional multi-core efficiency, which proved critical for maximizing the parallel execution capabilities of the Node.js / Bun worker threads and managing the Docker container orchestration overhead.")], "b1"),
      bulletRuns([run("System Memory: ", true), run("16 GB Unified Memory. High memory bandwidth was essential for running multiple persistent Docker containers—including PostgreSQL 16, Apache Kafka, Zookeeper, and Redis—simultaneously alongside the backend application services and the Vite-powered React frontend development server.")], "b1"),
      bulletRuns([run("Storage Layer: ", true), run("512 GB NVMe Solid State Drive (SSD). The extremely low latency of the NVMe storage ensured rapid read/write speeds for the PostgreSQL persistence layer, fast commit logs for the Kafka broker, and accelerated compilation times for the TypeScript codebase.")], "b1"),
      bulletRuns([run("Network Interface: ", true), run("A standard gigabit network interface capable of handling tens of thousands of local concurrent TCP connections during RPS stress testing without encountering port exhaustion or local loopback bottlenecks.")], "b1"),
      body("In addition to the primary local computing environment, simulated load testing required isolated environments to accurately model realistic network latency and jitter. Specialized tools, including Apache JMeter and custom Node.js asynchronous stress scripts, were executed on the same hardware, specifically tuned to utilize all available CPU cores to bombard the GraphQL API gateway at maximum capacity."),

      h2("1.4 Software Specification"),
      body("The Taskinator system is constructed using a modern, carefully curated full-stack JavaScript/TypeScript ecosystem. This ecosystem was selected specifically for its inherently non-blocking I/O model, rich typed interfaces, and expansive community support for event-driven paradigms."),

      h4("Frontend Presentation Layer:"),
      bulletRuns([run("Framework: ", true), run("React 18 with strict TypeScript enforcement.")], "b2"),
      bulletRuns([run("State Management: ", true), run("Apollo GraphQL Client (v3) utilizing normalized, in-memory caching to eliminate redundant network requests.")], "b2"),
      bulletRuns([run("Data Visualization: ", true), run("D3.js combined with custom SVG rendering logic to efficiently draw the interactive, dynamic Task Graph without triggering massive DOM reflows.")], "b2"),
      bulletRuns([run("Build Tooling: ", true), run("Vite, providing rapid Hot Module Replacement (HMR) during development and highly optimized, chunked production bundling.")], "b2"),

      h4("Backend Application Layer:"),
      bulletRuns([run("Runtime Environment: ", true), run("Node.js (v20+) and Bun. These runtimes leverage the V8 and JavaScriptCore engines respectively, exploiting the single-threaded event loop to handle massive concurrent I/O operations without the overhead of thread-per-request context switching.")], "b3"),
      bulletRuns([run("API Protocol: ", true), run("GraphQL (Apollo Server). This allows the frontend to execute flexible, heavily typed data queries, effectively preventing over-fetching and under-fetching of hierarchical task data.")], "b3"),
      bulletRuns([run("Programming Language: ", true), run("TypeScript, utilized to enforce strict domain boundaries, DTO (Data Transfer Object) schemas, and compile-time safety across the entire monorepo.")], "b3"),
      bulletRuns([run("Database Query Builder: ", true), run("Kysely. A robust, type-safe SQL query builder that ensures compile-time safety for complex, multi-stage Common Table Expressions (CTEs), JSON aggregations, and complex lateral joins.")], "b3"),

      h4("Data Persistence and Infrastructure Layer:"),
      bulletRuns([run("Primary Relational Database: ", true), run("PostgreSQL 16. Chosen for its unparalleled reliability and advanced feature set. The system heavily exploits PostgreSQL-specific mechanics, including recursive CTEs, LISTEN/NOTIFY pub/sub for reactive outbox polling, and the SKIP LOCKED directive for highly concurrent queue processing.")], "b4"),
      bulletRuns([run("Event Broker: ", true), run("Apache Kafka. Acts as the durable, partitioned backbone of the Event-Driven Architecture. Kafka guarantees strict message ordering via Project ID partitioning keys, ensuring that causally related events are processed sequentially.")], "b4"),
      bulletRuns([run("In-Memory Datastore: ", true), run("Redis. Utilized purely for ephemeral operations and the zero-fan-out targeted routing of real-time Server-Sent Events (SSE) across distributed backend pods.")], "b4"),
      bulletRuns([run("Containerization and Orchestration: ", true), run("Docker and Docker Compose. Used to orchestrate the complex local development environment, ensuring absolute parity between local testing configurations and eventual Kubernetes production deployments.")], "b4"),
      body("This carefully selected, highly tuned technology stack allows the Taskinator application to remain strictly asynchronous—from the initial HTTP request traversing the GraphQL gateway, all the way down to the database row-lock level—fully satisfying the core research objective of non-blocking, high-throughput execution."),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // CHAPTER 2: LITERATURE SURVEY
      // ══════════════════════════════════════════════════════════════
      h1("2. LITERATURE SURVEY"),

      h2("2.1 Research Gaps in Workflow Orchestration"),
      body("The evolution of workflow orchestration and project management tools has been extensively documented in academic literature and industry whitepapers. However, there remains a significant gap between theoretical architectural patterns and their practical application in high-throughput, real-time enterprise systems. A critical analysis of the current literature reveals several distinct research gaps that motivate the development of the Taskinator platform."),

      h4("1. Scalability Limitations in Hierarchical Data Models:"),
      body("A fundamental requirement of any advanced task management system is the ability to handle deeply hierarchical data (tasks, sub-tasks, sub-sub-tasks, and arbitrary directed dependencies). Traditional database literature heavily favors the Adjacency List model (utilizing a simple parent_id foreign key column) due to its ease of implementation and referential integrity. However, as documented by Celko (2012) in \"Trees and Hierarchies in SQL\", deep tree traversals within this model necessitate the use of recursive Common Table Expressions (CTEs). Recursive CTEs degrade exponentially in performance as tree depth and branching factors increase, making them unsuitable for real-time reads at massive scale."),
      body("Conversely, while the Closure Table pattern—which stores all transitive paths between nodes—is discussed theoretically as a solution for O(1) read performance, it is frequently dismissed in practical large-scale applications due to its severe O(D\u00B2) write amplification factor during insertion and deletion. There is a noticeable gap in current literature demonstrating how to effectively mitigate this write amplification using asynchronous event-driven batching methodologies, a technique that could make Closure Tables viable for systems targeting 10,000 RPS."),

      h4("2. The Thundering Herd Problem in Transactional Outboxes:"),
      body("To achieve Eventual Consistency without suffering from dual-write failures (where a database commits but the message broker publish fails), the Transactional Outbox pattern is widely recommended in microservice architecture literature (Richardson, 2018). However, standard implementations of this pattern rely on background worker threads using setInterval polling to query the outbox table for un-published events."),
      body("In a horizontally scaled cloud environment consisting of dozens of backend pods, this primitive polling strategy creates a catastrophic \"Thundering Herd\" problem. Multiple pods query the exact same database rows simultaneously, leading to severe row-level lock contention, CPU spikes, and eventual deadlocks. While existing literature often points to complex solutions like Change Data Capture (CDC) using Debezium and Kafka Connect to solve this, these solutions introduce massive infrastructural overhead and operational complexity. There is a pressing need for research into simpler, native database mechanisms—such as PostgreSQL's reactive LISTEN/NOTIFY combined with SKIP LOCKED concurrency controls—to bridge this gap efficiently without external CDC dependencies."),

      h4("3. Write Amplification from Cascading Deletions:"),
      body("When a root node in a deeply nested graph is deleted, traditional Relational Database Management System (RDBMS) design dictates the use of ON DELETE CASCADE foreign key constraints to maintain referential integrity. At enterprise scale, this approach is disastrous. A single HTTP request triggering a synchronous cascade across 50,000 descendant rows will acquire and hold exclusive database locks for several seconds. During this window, any concurrent operations touching those tables are blocked, causing massive transaction timeout failures across the entire system."),
      body("Current literature lacks comprehensive, peer-reviewed patterns for \"Chunked Self-Signaling Deletions\" or \"Recursive Queued Cleanups\" that perform unbounded graph deletions using bounded, time-sliced transactions."),

      h4("4. Network Saturation in Real-Time Systems:"),
      body("Modern web applications rely heavily on WebSockets or Server-Sent Events (SSE) to provide real-time interactivity. The prevalent architectural pattern for distributing these events across a cluster of backend nodes is \"Pub/Sub Fan-Out\" (typically implemented via Redis PUBLISH). If a data mutation occurs, the payload is blindly broadcast to every single connected server instance, which then checks its local memory to see if it holds the relevant client connection."),
      body("At high scale, this brute-force fan-out methodology leads to an overwhelming volume of unnecessary internal network traffic, essentially turning internal Pub/Sub into a localized DDoS attack. Highly targeted routing strategies that actively track client locations to eliminate fan-out are severely underrepresented in current distributed web architecture studies."),

      h2("2.2 Summary of Literature Review"),
      body("To effectively address these substantial research gaps, the architecture of Taskinator synthesizes several advanced concepts spanning distributed systems research, database theory, and reactive programming."),

      h3("Hierarchical Data Models"),
      body("When representing hierarchical and graph-based data, traditional relational databases offer several models, each presenting distinct trade-offs between read and write performance:"),
      bulletRuns([run("Adjacency List (parent_id): ", true), run("Extremely simple to implement and update. However, it requires slow, recursive CTEs to retrieve deep sub-trees, making it a severe bottleneck for read-heavy applications displaying complex UI graphs.")], "b5"),
      bulletRuns([run("Materialized Path (Path Enumeration): ", true), run("Stores the full ancestry as a structured string (e.g., 1.2.5.). It provides extremely fast read access using LIKE queries. However, string manipulation operations scale very poorly when a node with thousands of descendants is moved to a new parent, and it cannot easily represent multi-parent dependencies (Directed Acyclic Graphs).")], "b5"),
      bulletRuns([run("Nested Sets: ", true), run("Uses left_id and right_id boundaries to define subsets. While read performance is exceptional, inserting a single node requires recalculating the boundaries for half the table, resulting in unacceptable lock contention in high-write environments.")], "b5"),
      bulletRuns([run("Closure Table: ", true), run("Stores all discrete paths between nodes in a transitive closure matrix. While traditional literature highlights the severe O(depth\u00B2) write amplification, Taskinator proves that customized closure implementations can mitigate this by batching updates asynchronously. By storing only structural reachability rather than strict, weighted paths, and computing the exact visual rendering paths in-memory on the application layer, the database read operations remain consistently O(1).")], "b5"),

      h3("Consistency Models and the CAP Theorem"),
      body("Modern high-throughput web applications frequently transition away from Strong Consistency models (where ACID transactions block until they are globally committed to all replicas) towards Eventual Consistency. Kleppmann (2017) emphasizes in \"Designing Data-Intensive Applications\" that strong consistency requires synchronous distributed consensus protocols (such as Paxos or Raft), which inherently and severely limit write throughput and system availability under partition events."),
      body("Taskinator fully embraces the BASE model (Basically Available, Soft state, Eventual consistency). By utilizing strategic denormalization for reads and asynchronous event processing pipelines for writes, the system prioritizes high Availability. While this introduces inherent complexity in the User Interface regarding stale data reads, Taskinator mitigates this using advanced Optimistic UI update mechanisms on the React client side."),

      h3("The Transactional Outbox Pattern"),
      body("The \"Dual-Write Problem\"—where a system must write business data to a primary database and simultaneously publish a domain event to a message broker—is a well-documented failure mode in distributed systems. If the database commit succeeds but the broker publish fails due to network jitter, the system enters a permanently inconsistent state."),
      body("The Transactional Outbox pattern solves this by writing the event payload to a dedicated outbox table within the exact same ACID transaction as the business data mutation. Taskinator implements this foundational pattern but significantly enhances its performance using PostgreSQL's Data-Modifying CTEs (wCTEs). This enhancement eliminates multi-statement transaction overhead, guaranteeing absolute atomicity in a single network roundtrip."),

      h3("Concurrency and Locking Strategies"),
      body("To maintain data integrity during highly concurrent updates, traditional monolithic systems rely heavily on Pessimistic Locking (SELECT ... FOR UPDATE). While this guarantees safety, it forces concurrent threads to block and wait, severely limiting overall throughput."),
      body("Optimistic Locking, which utilizes an incrementing version column, is proposed in academic literature as a high-performance alternative for environments where read-to-write ratios are high and direct write conflicts on the same record are relatively rare. By outright rejecting update statements that reference stale version numbers, the system forces the client to retry the operation. This preserves data integrity without ever acquiring long-lived, throughput-killing database locks. Taskinator implements Optimistic Locking globally across all major domain entities."),

      h3("Event Streaming and Apache Kafka"),
      body("Apache Kafka fundamentally differs from traditional message queues (like RabbitMQ or ActiveMQ) because it acts as an immutable, partitioned, append-only log. Literature surrounding stream processing emphasizes the critical importance of Partitioning Keys to guarantee causal message ordering. By strictly partitioning all domain events by their associated projectId, Taskinator ensures that an \"Update Task\" event is never accidentally processed before the preceding \"Create Task\" event, regardless of network transport jitter or pod restarts. Furthermore, Kafka's consumer group mechanics allow multiple independent downstream services (e.g., the Reachability Engine and the Real-Time Router) to process the exact same event stream simultaneously without interfering with each other's offsets."),
      body("By actively synthesizing these advanced patterns—Custom Closure Tables, wCTE Outboxes, Optimistic Locking, and Targeted Redis Routing—Taskinator proposes a novel, fully integrated framework that directly addresses the specific research gaps associated with scaling complex orchestration systems."),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // CHAPTER 3: SYSTEM ANALYSIS AND DESIGN
      // ══════════════════════════════════════════════════════════════
      h1("3. SYSTEM ANALYSIS AND DESIGN"),
      body("To achieve the goals of high throughput and extreme scalability, Taskinator follows a strict \"non-blocking\" full-stack architectural philosophy. This philosophy mandates minimizing synchronous wait times at every possible layer of the application."),

      h2("3.1 Overall System Architecture"),
      body("The overarching system architecture of Taskinator is constructed as a Modular Monolith underpinned by an Event-Driven Architecture (EDA) backbone. This hybrid approach provides the deployment simplicity and operational ease of a monolithic application while simultaneously enforcing the strict domain boundaries, loose coupling, and horizontal scalability characteristic of microservice architectures."),
      emptyLine(),
      imgPlaceholder("Figure 3.1: Full-Stack Layered Architecture and Data Flow — Taskinator"),
      figCaption("Figure 3.1: Full-Stack Layered Architecture and Data Flow — Taskinator"),
      body("The architecture is physically and logically divided into five distinct operational layers:"),
      numberedRuns([run("Layer 1 (Client Presentation): ", true), run("The React 18 Frontend, featuring the highly interactive Task Graph visualization powered by D3.js, and Apollo Client for normalized state management. It connects to the backend via HTTP POST for queries and mutations, and utilizing Server-Sent Events (SSE) for unidirectional real-time data ingestion.")], "n2"),
      numberedRuns([run("Layer 2 (API Gateway): ", true), run("The GraphQL server (Apollo Server). This layer handles JWT authentication, validates incoming JSON payloads, and resolves incoming mutations into typed backend service calls.")], "n2"),
      numberedRuns([run("Layer 3 (Application Backend Modules): ", true), run("The core Node.js application, internally subdivided into strongly cohesive domain modules (Project, Task, Team, User). It includes the Outbox Relay for reliable transactional event publishing and dedicated Kafka Consumers for asynchronous background processing.")], "n2"),
      numberedRuns([run("Layer 4 (Data Storage & Streaming): ", true), run("PostgreSQL 16 serves as the primary, persistent source of truth. Apache Kafka acts as the high-throughput, horizontally partitioned event bus bridging the synchronous mutators with the asynchronous side-effect workers.")], "n2"),
      numberedRuns([run("Layer 5 (Real-Time Routing): ", true), run("Redis Pub/Sub operates as a highly volatile, ephemeral routing table, mapping active user websocket/SSE sessions to specific backend server instances for zero-fan-out message delivery.")], "n2"),

      h3("3.1.1 End-to-End Orchestration Lifecycle"),
      body("To truly understand the power of the non-blocking architecture, we must trace a complex user operation completely through the stack. Consider the scenario where a user creates a dependency linking two existing tasks (Task A is marked as a dependency blocking Task B). The operation executes in milliseconds through the targeted event routing pipeline:"),
      numberedRuns([run("The API Request: ", true), run("The client executes a GraphQL mutation createTaskLink to link the tasks.")], "n3"),
      numberedRuns([run("Atomic Write (wCTE): ", true), run("The backend API executes a single Data-Modifying Common Table Expression (wCTE). This atomic query verifies RBAC permissions, inserts the physical link into task_link, and inserts a TASK_LINK_CREATED JSON payload into the outbox_events table simultaneously.")], "n3"),
      numberedRuns([run("Immediate HTTP Response: ", true), run("The database commits the transaction. The API instantly returns an HTTP 200 OK status to the client. The synchronous blocking path is now complete.")], "n3"),
      numberedRuns([run("Reactivity: ", true), run("Upon commit, PostgreSQL fires a pg_notify event. The idle Outbox Relay immediately wakes up and claims the newly inserted event using a SELECT ... FOR UPDATE SKIP LOCKED query.")], "n3"),
      numberedRuns([run("Partitioned Publishing: ", true), run("The relay publishes the serialized event to Kafka, partitioning the message utilizing the projectId to maintain strict causal ordering across the distributed topic.")], "n3"),
      new Paragraph({ numbering: { reference: "n3", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Parallel Execution: ", bold: true, size: 22, font: F }), new TextRun({ text: "Once buffered in Kafka, multiple distinct consumer pipelines process the event simultaneously:", size: 22, font: F })] }),
      new Paragraph({ spacing: { before: 0, after: 60 }, indent: { left: 1440 }, children: [new TextRun({ text: "\u2013 The Smart Aggregator folds the event to update any denormalized analytics counts on the Project entity.", size: 22, font: F })] }),
      new Paragraph({ spacing: { before: 0, after: 60 }, indent: { left: 1440 }, children: [new TextRun({ text: "\u2013 The Reachability Engine reads the event, calculates the necessary graph traversals, and expands the Closure Table to allow rapid future read queries.", size: 22, font: F })] }),
      new Paragraph({ spacing: { before: 0, after: 120 }, indent: { left: 1440 }, children: [new TextRun({ text: "\u2013 The Real-Time Router queries Redis for active connections, pushing the specific payload only to the Node instances serving project stakeholders, triggering an instant UI re-render on their devices.", size: 22, font: F })] }),

      h2("3.2 Domain Modeling and ER Schema"),
      body("Taskinator's domain model is strictly relational, explicitly designed to support massive datasets without resorting to unstructured NoSQL patterns, ensuring rigid data integrity and referential safety."),
      emptyLine(),
      imgPlaceholder("Figure 3.2: Core Domain Entity-Relationship (ER) Model"),
      figCaption("Figure 3.2: Core Domain Entity-Relationship (ER) Model"),
      body("The core entities within the database schema are highly optimized for distinct read/write patterns:"),
      bulletRuns([run("project: ", true), run("Acts as the bounding context for almost all queries. Contains heavily denormalized integer counters (e.g., task_count, completed_task_count) to avoid expensive table scans.")], "b1"),
      bulletRuns([run("project_task: ", true), run("The central operational entity. It utilizes a materialized_path (TEXT) for flat hierarchical indexing and a version (INT) column to enforce optimistic concurrency control across distributed writes.")], "b1"),
      bulletRuns([run("task_link: ", true), run("Represents the directed edges (dependencies) between tasks. It is fundamentally distinct from the parent/child hierarchy, allowing a task to block or relate to tasks located anywhere else within the overarching project graph.")], "b1"),
      bulletRuns([run("task_reachability: ", true), run("The transitive closure index mapping every ancestor task to every descendant task. It deliberately operates without a surrogate primary key to reduce index bloat, utilizing a composite key of (fk_project_id, ancestor_task_id, descendant_task_id).")], "b1"),
      bulletRuns([run("outbox_events: ", true), run("The ephemeral transactional log table responsible for bridging ACID database transactions with the eventual consistency of the Kafka event bus.")], "b1"),

      h2("3.3 Database Optimization & Denormalization"),
      body("Before detailing the Kafka event pipelines, it is crucial to understand the foundational data layer optimizations applied directly within PostgreSQL that enable the high baseline throughput."),

      h3("3.3.1 Task Reachability Engine: Custom Closure Tables"),
      body("To support infinite task nesting and complex DAG (Directed Acyclic Graph) dependencies, Taskinator rejects slow recursive WITH RECURSIVE queries in favor of a Custom Closure Table architecture. The task_reachability index stores every possible path from every ancestor to every descendant in the graph, tracking the exact depth (number of hops)."),
      emptyLine(),
      imgPlaceholder("Figure 3.3: Task Reachability Engine — Closure Table Cross-Join Expansion"),
      figCaption("Figure 3.3: Task Reachability Engine — Closure Table Cross-Join Expansion"),
      h4("Cross-Join Expansion Mathematics:"),
      body("When a user creates a new dependency linking Task A as a parent of Task B, the engine cannot simply insert a single row. It must query the closure table for all tasks that reach A (the Ancestors) and all tasks reached by B (the Descendants)."),
      body("Every discovered ancestor must now be able to reach every discovered descendant. If Task A has 5 ancestors and Task B has 10 descendants, the system calculates the Cartesian product: 5 \u00D7 10 = 50 new paths. The new depth is calculated mathematically as: Depth(Ancestor -> A) + 1 + Depth(B -> Descendant)."),
      body("By proactively maintaining this matrix during write operations, the React Task Graph can fetch the entire dependency tree of a massive project in a single, index-backed O(1) read query. The normally catastrophic write amplification factor of Closure Tables is entirely mitigated by calculating these cross-joins asynchronously within the Kafka consumer pipeline."),

      h3("3.3.2 Optimistic Locking & Concurrency Control"),
      body("In a high-throughput collaborative environment, multiple users, automation engines, or background services may attempt to update the same task simultaneously. Instead of acquiring pessimistic database locks (SELECT ... FOR UPDATE), which block concurrent reads and severely limit throughput, the system employs Optimistic Locking."),
      body("Every mutable record in the database includes an integer version column. When a client reads a task, it receives the data alongside its current version (e.g., version = 1). When the client attempts an update via GraphQL, it sends the mutation including a WHERE version = 1 clause."),
      body("If another client successfully updated the task in the meantime, the version in the database will have incremented to 2. The subsequent update query will fail, returning 0 modified rows. The Kysely query builder catches this, rejects the stale update, throws a ConcurrencyError, and forces the client to reconcile and retry. This guarantees absolute data integrity without ever implementing read-blocking locks at the database level."),

      h3("3.3.3 CTE-Based Atomic Authorization"),
      body("To avoid executing multiple roundtrips to an external authorization table for every single mutation request, RBAC (Role-Based Access Control) security is baked directly into the SQL mutation utilizing Common Table Expressions (CTEs):"),
      codeLine("WITH auth_check AS (", 120),
      codeLine("    SELECT 1 FROM project_member"),
      codeLine("    WHERE fk_project_id = $1 AND fk_user_id = $2"),
      codeLine(")"),
      codeLine("UPDATE project_task SET title = $3"),
      codeLine("WHERE id = $4 AND EXISTS (SELECT 1 FROM auth_check)"),
      codeLine("RETURNING *;", 0, 120),
      body("This strategy achieves single-trip atomic security. If the user lacks the necessary permissions, the EXISTS clause fails instantly, and the update is safely and silently aborted at the database engine level, saving valuable Node.js CPU cycles and reducing network latency."),

      h3("3.3.4 Strategic Denormalization & Delta Processing"),
      body("Calculating the total number of pending tasks in a project dynamically requires an extremely expensive COUNT(*) query scanning potentially millions of rows. Taskinator denormalizes this value directly onto the Project entity (project.task_count)."),
      body("Crucially, when a task is created, the system does not execute a recalculation query. Instead, an event is fired into Kafka. A background aggregator calculates the mathematical delta (+1) and asynchronously executes an UPDATE project SET task_count = task_count + 1. This purely delta-based approach prevents expensive table scans entirely and allows the analytics dashboard to load instantly."),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // CHAPTER 4: EVENT-DRIVEN PIPELINE
      // ══════════════════════════════════════════════════════════════
      h1("4. EVENT-DRIVEN PIPELINE (EDA) IMPLEMENTATION"),
      body("The foundational backbone of Taskinator is its highly tuned Event-Driven Architecture (EDA). This architecture rejects synchronous side-effect processing entirely, instead utilizing pervasive batching strategies that begin all the way upstream at the producer level and carry through to the downstream consumers."),

      h2("4.1 The Transactional Outbox Pattern & wCTE"),
      body("A classic, well-documented failure mode in distributed systems occurs when a database transaction successfully commits, but the application Node.js process crashes milliseconds before publishing the resulting domain event to Apache Kafka. This creates a ghost state: the data exists in the database, but downstream systems (analytics, search indexing, real-time UIs) are completely unaware, leaving the system permanently inconsistent."),
      body("Taskinator utilizes the Transactional Outbox Pattern to guarantee absolute atomic writes without dual-write failures."),
      emptyLine(),
      imgPlaceholder("Figure 4.1: Transactional Outbox Workflow using wCTE"),
      figCaption("Figure 4.1: Transactional Outbox Workflow using wCTE"),
      body("While traditional Outbox implementations execute multiple sequential SQL INSERT statements within a BEGIN...COMMIT block, Taskinator optimizes this using PostgreSQL's Data-Modifying Common Table Expressions (wCTE). A single SQL query uses WITH clauses to insert the business data and immediately insert the serialized JSON payload into the outbox_events table simultaneously:"),
      codeLine("WITH inserted_task AS (", 120),
      codeLine("  INSERT INTO project_task (id, fk_project_id, title, status, version)"),
      codeLine("  VALUES ($1, $2, $3, $4, 1)"),
      codeLine("  RETURNING *"),
      codeLine("),"),
      codeLine("inserted_event AS ("),
      codeLine("  INSERT INTO outbox_events (aggregate_id, event_type, payload)"),
      codeLine("  VALUES ("),
      codeLine("    (SELECT id FROM inserted_task),"),
      codeLine("    'TASK_CREATED',"),
      codeLine("    jsonb_build_object('id', (SELECT id FROM inserted_task), 'status', $4)"),
      codeLine("  )"),
      codeLine(")"),
      codeLine("SELECT * FROM inserted_task;", 0, 120),
      body("If the transaction rolls back due to a constraint violation or a server crash mid-flight, both the task and the event are safely discarded by the database engine. They succeed or fail as a singular, indivisible unit of work, requiring only one network roundtrip."),

      h2("4.2 Concurrent Outbox Relays: Mitigating the Thundering Herd"),
      body("Traditional outbox relays utilize primitive setInterval loops to aggressively poll the database for new events. At 10,000 RPS, this creates severe database CPU load even when the system is idle."),
      body("Taskinator discards polling entirely in favor of reactivity. The Outbox Relay connects via the pg driver and executes a persistent LISTEN outbox_event_notification command. When the aforementioned wCTE commits, PostgreSQL natively pushes a highly efficient, lightweight notification through the socket."),
      body("However, in a horizontally scaled Kubernetes environment, this reactivity creates a catastrophic \"Thundering Herd\" problem: 50 different relay pods wake up simultaneously to grab the exact same batch of events."),
      emptyLine(),
      imgPlaceholder("Figure 4.2: Concurrent Outbox Polling: Mitigating the Thundering Herd with SKIP LOCKED"),
      figCaption("Figure 4.2: Concurrent Outbox Polling: Mitigating the Thundering Herd with SKIP LOCKED"),
      body("To solve this, Taskinator utilizes the advanced FOR UPDATE SKIP LOCKED database directive. When the notification fires, Pod 1 executes SELECT ... FOR UPDATE SKIP LOCKED LIMIT 100. It immediately acquires a row-level lock on rows 1 through 100. Milliseconds later, Pod 2 executes the exact same query. Because of the SKIP LOCKED directive, the PostgreSQL engine instructs Pod 2 to completely bypass rows 1-100 without waiting for the lock to release. Pod 2 instead reads and instantly locks rows 101 through 200."),
      body("The result is massive, lock-free concurrent throughput across dozens of pods without polling loops, database deadlocks, or duplicate event publishing."),

      h2("4.3 Smart Batch Aggregation & Semantic Folding"),
      body("Pushing millions of events efficiently into Kafka is entirely useless if the downstream consumers cannot process them rapidly enough. Naive consumers execute one database transaction per incoming Kafka event. At 10k RPS, executing 10,000 sequential UPDATE transactions crushes the database connection pool."),
      body("Taskinator introduces the Smart Batch Aggregator."),
      emptyLine(),
      imgPlaceholder("Figure 4.3: Smart Batch Aggregator Data Flow and Semantic Folding"),
      figCaption("Figure 4.3: Smart Batch Aggregator Data Flow and Semantic Folding"),
      body("The Kafka consumer receives a massive batch of events (e.g., batchSize: 5000) and buffers them chronologically. It loops over the events strictly in memory. If the aggregator detects 50 \"Task Created\" events and 20 \"Task Deleted\" events pertaining to the exact same project within the batch window, it does not execute 70 individual SQL updates. Instead, it executes a Semantic Folding Algorithm to calculate a net mathematical delta (+30). It then executes a single, batched database update to the denormalized project.task_count metric."),
      codeLine("// Semantic Folding Algorithm Snippet", 120),
      codeLine("const deltas = new Map<string, number>();"),
      codeLine(""),
      codeLine("for (const event of batch) {"),
      codeLine("  if (event.type === 'TASK_CREATED') {"),
      codeLine("    deltas.set(event.projectId, (deltas.get(event.projectId) || 0) + 1);"),
      codeLine("  } else if (event.type === 'TASK_DELETED') {"),
      codeLine("    deltas.set(event.projectId, (deltas.get(event.projectId) || 0) - 1);"),
      codeLine("  }"),
      codeLine("}"),
      codeLine(""),
      codeLine("// Execute folded updates"),
      codeLine("await db.transaction().execute(async (trx) => {"),
      codeLine("  for (const [projectId, delta] of deltas) {"),
      codeLine("    if (delta !== 0) {"),
      codeLine("      await trx.updateTable('project')"),
      codeLine("        .set((eb) => ({ task_count: eb('task_count', '+', delta) }))"),
      codeLine("        .where('id', '=', projectId)"),
      codeLine("        .execute();"),
      codeLine("    }"),
      codeLine("  }"),
      codeLine("});", 0, 120),
      body("By partitioning the Kafka topic strictly by projectId, the system guarantees that related events land on the same consumer thread, making in-memory folding highly effective and drastically reducing database write amplification."),

      h2("4.4 Chunked Self-Signaling Deletion (The Bubbling Effect)"),
      body("In hierarchical systems, deleting a root node that possesses 50,000 descendants via a synchronous SQL ON DELETE CASCADE command will acquire an exclusive database table lock for several seconds. Taskinator circumvents this by implementing Declarative Signalling and Self-Chunking."),
      emptyLine(),
      imgPlaceholder("Figure 4.4: Chunked Self-Signaling Deletion (\"The Bubbling Effect\")"),
      figCaption("Figure 4.4: Chunked Self-Signaling Deletion (\"The Bubbling Effect\")"),
      body("When a user deletes a large project, the API does not execute a SQL DELETE on the tasks. Instead, it merely emits a declarative signal: PROJECT_DELETED into the Outbox. A specialized Background Listener picks up this signal and queries a very small chunk using explicit limits: SELECT id FROM project_task WHERE fk_project_id = X LIMIT 2000. The Listener deletes only those 2000 rows."),
      body("If more rows remain in the project, the Listener deliberately emits a new, identical self-signal (PROJECT_DELETED) back into the outbox. This recursively \"bubbles\" through the message queue until the table is completely purged. By enforcing strict LIMIT 2000 bounds on every operation, the maximum duration of a database lock never exceeds a few milliseconds, ensuring the application remains 100% available to all other users during massive cleanup operations."),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // CHAPTER 5: FRONTEND ARCHITECTURE
      // ══════════════════════════════════════════════════════════════
      h1("5. FRONTEND ARCHITECTURE AND REAL-TIME SYNCHRONIZATION"),
      body("Pushing data to the client efficiently is only half the battle in a real-time system. If the client simply triggers a full-page data refetch upon receiving a Server-Sent Event (SSE) payload, the backend database will be instantly overwhelmed by redundant read queries, defeating the purpose of the Event-Driven Architecture entirely. Taskinator's frontend is engineered to surgically inject updates directly into the in-memory cache, achieving O(1) rendering complexity."),

      h2("5.1 The React Task Graph and D3.js Visualization"),
      body("To represent the deeply nested Directed Acyclic Graphs (DAGs) generated by the Reachability Engine, traditional list-based HTML UI components are fundamentally inadequate. Taskinator employs a custom visualization engine utilizing React 18 and D3.js."),
      body("D3.js is utilized purely for its powerful mathematical layout algorithms (e.g., d3.hierarchy and d3.tree). However, unlike traditional D3 implementations that forcefully manipulate the DOM, Taskinator strictly delegates all DOM rendering to React. D3 calculates the (x, y) SVG coordinates of the tasks and the bezier curves of the linking edges in memory, and React maps over this data array to render pure SVG <circle> and <path> components."),
      body("This hybrid approach prevents costly layout thrashing and allows React's Concurrent Mode to interrupt and prioritize rendering frames smoothly, even when displaying thousands of simultaneous SVG nodes."),

      h2("5.2 Zero-Fan-Out Targeted Routing via Redis"),
      body("In standard real-time web architectures, the prevailing pattern for distributing events across a horizontally scaled cluster of backend instances is \"Pub/Sub Fan-Out\". If a user marks a task as complete, the server handling that request publishes the event to Redis, which blindly broadcasts it to every single Node.js instance in the cluster. Every instance then checks its local memory to see if it holds a WebSocket connection for a user who cares about that project."),
      body("At 10,000 RPS, this creates an enormous volume of useless internal network traffic, essentially turning the internal Pub/Sub network into a localized Distributed Denial of Service (DDoS) attack. Taskinator implements a highly tuned Zero-Fan-Out Targeted Routing layer."),
      emptyLine(),
      imgPlaceholder("Figure 5.1: Targeted Redis Routing for Real-time Server-Sent Events (SSE)"),
      figCaption("Figure 5.1: Targeted Redis Routing for Real-time Server-Sent Events (SSE)"),
      body("When a user opens the React frontend dashboard for Project X, their browser establishes an SSE connection with Node Instance 2. Instance 2 immediately registers this connection in Redis by executing a Set Add operation: SADD route:project:X \"Instance2\"."),
      body("When an asynchronous Kafka event occurs (e.g., a background worker completes a bulk task assignment for Project X), the Real-Time Router (a dedicated Kafka consumer module) executes a query to determine exactly where the interested clients are located: SMEMBERS route:project:X. Redis returns the specific array: [\"Instance2\"]. The Router then issues a highly targeted publish command explicitly to that instance's private channel: PUBLISH instance:Instance2 payload."),
      body("If SMEMBERS returns an empty array, it means no users are currently viewing the project, and the Router drops the event instantly into the void. This architecture completely eliminates Fan-Out, reducing network traffic linearly relative to the number of active, observing connections rather than the total number of system instances."),

      h2("5.3 Apollo Client Cache Reconciliation"),
      body("When the targeted SSE payload arrives at the browser (e.g., { id: \"Task:123\", status: \"DONE\" }), the client must process it without triggering a network refetch."),
      emptyLine(),
      imgPlaceholder("Figure 5.2: Apollo Client SSE State Reconciliation Sequence"),
      figCaption("Figure 5.2: Apollo Client SSE State Reconciliation Sequence"),
      body("Taskinator hooks the SSE stream directly into the Apollo GraphQL Link architecture. Apollo maintains a highly normalized, flat, in-memory cache mapping unique IDs to object fields. Upon receiving the payload, the client executes the cache.modify method. This method surgically locates the specific object in the cache (e.g., Task:123) and injects the delta mutation directly into memory."),
      codeLine("// Apollo Cache Modification Snippet", 120),
      codeLine("apolloClient.cache.modify({"),
      codeLine("  id: apolloClient.cache.identify({ __typename: 'Task', id: event.id }),"),
      codeLine("  fields: {"),
      codeLine("    status() {"),
      codeLine("      return event.status; // Inject the new status without a network request"),
      codeLine("    }"),
      codeLine("  }"),
      codeLine("});", 0, 120),
      body("Because React components are bound to specific cached references via useQuery or useFragment, React instantly detects the specific node change and triggers a granular, localized re-render of only that specific Task UI component. This preserves O(1) rendering performance on the client device, preventing complete screen freezes or layout thrashing."),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // CHAPTER 6: IMPLEMENTATION, AUTOMATION, AND TESTING
      // ══════════════════════════════════════════════════════════════
      h1("6. IMPLEMENTATION, AUTOMATION, AND TESTING"),

      h2("6.1 Automation and Trigger Engine"),
      body("Beyond standard CRUD operations, enterprise systems must support dynamic workflows. Taskinator implements a robust project-scoped Automation Engine utilizing an \"IF-THEN-CLEANUP\" deterministic mental model."),
      emptyLine(),
      imgPlaceholder("Figure 6.1: Automation Trigger Engine and System Actor Flow"),
      figCaption("Figure 6.1: Automation Trigger Engine and System Actor Flow"),
      body("The automation system reacts natively to domain events residing in Kafka (e.g., \"A task is marked complete\"). It utilizes asynchronous processing with a rolling state machine. To ensure system stability and operational traceability, the engine implements the following strict rules:"),
      numberedRuns([run("Correlation IDs: ", true), run("Every triggered automation carries a globally unique Correlation ID linking it back to the exact user HTTP request that initiated the cascade. This ensures trace logs can be grouped and analyzed effectively across distributed microservices.")], "n4"),
      numberedRuns([run("System Actor Isolation: ", true), run("Automations explicitly execute under a specific SYSTEM user identity, bypassing standard user RBAC checks but enforcing domain boundary constraints. Crucially, the system possesses hard code-level gates that actively prevent consumers from reacting to events generated by the SYSTEM actor itself unless explicitly whitelisted. This circuit-breaker pattern completely eliminates the catastrophic risk of infinite recursive automation loops (e.g., Rule A triggers Rule B, which triggers Rule A ad infinitum).")], "n4"),
      numberedRuns([run("Parent Guard Triggers: ", true), run("The engine enforces strict mathematical domain rules without bloating the primary API endpoint. For example, a \"Parent Guard Trigger\" actively prevents a Parent Task from entering the 'DONE' status if any of its descendants are currently in the 'TODO' status. If a user attempts to bypass this via the API, the database allows the optimistic write, but the trigger engine immediately catches the event in Kafka, reverts the task status in the database, and emits an explanatory Server-Sent Event (SSE) notification back to the user's browser, explaining the policy violation.")], "n4"),

      h2("6.2 Testing Methodology"),
      body("The system's reliability and resilience under extreme event-driven load is guaranteed through a rigorous, multi-tiered testing methodology that completely eschews unreliable mocking in favor of true containerized testing."),
      emptyLine(),
      imgPlaceholder("Figure 6.2: Containerized Testing Architecture and Mutation Testing"),
      figCaption("Figure 6.2: Containerized Testing Architecture and Mutation Testing"),

      h3("6.2.1 Integration Testing via TestContainers"),
      body("Unit testing SQL queries against mock objects is fundamentally flawed because it fails to validate specific PostgreSQL dialect mechanics, trigger cascades, and locking behaviors. Taskinator utilizes the Jest framework alongside TestContainers (Docker). Before the test suite runs, a pristine, ephemeral PostgreSQL 16 container is spun up. Migrations are executed, and real SQL wCTE mutations are fired against the live container. This guarantees that complex logic—such as the SKIP LOCKED concurrent polling mechanism—performs exactly as intended in a production-equivalent environment."),

      h3("6.2.2 Mutation Testing with Stryker"),
      body("100% Code Coverage is a deceptive metric; it proves that lines of code were executed, but not that the tests actually assert the correct outcomes. Taskinator utilizes Stryker Mutator to measure true test efficacy."),
      body("Instead of merely parsing the AST (Abstract Syntax Tree) for coverage, Stryker actively injects algorithmic bugs (mutations) directly into the source code (e.g., changing a === to !==, or altering a SQL >= to <). It then runs the Jest test suite. If the test suite passes despite the injected bug, the mutant \"survives,\" indicating a severe flaw in the test assertions. A high \"Mutation Score\" provides unparalleled confidence in the business logic."),

      h2("6.3 Performance Analysis and Metrics"),
      body("The Taskinator system was subjected to rigorous stress testing to evaluate its performance under conditions simulating extreme enterprise loads. The primary objective was to validate that the Event-Driven Architecture (EDA), pervasive batching, and chunked deletion mechanisms could successfully maintain high responsiveness at a target of 10,000 Requests Per Second (RPS)."),
      body("A customized Apache JMeter test plan was developed, utilizing distributed load generation across multiple worker nodes to simulate thousands of concurrent users executing a brutal mix of read queries and heavy write mutations."),
      emptyLine(),
      tblCaption("Table 6.1: Performance Metrics at 10,000 RPS"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2500, 2000, 4526],
        rows: [
          tblHeader(["Metric", "Measurement", "Notes"], [2500, 2000, 4526]),
          tblRow(["95th Percentile API Latency", "38ms", "Maintained under heavy write load. The asynchronous design prevents queuing."], [2500, 2000, 4526]),
          tblRow(["Database Deadlocks", "0", "Prevented entirely by Chunked Deletion and Optimistic Locking mechanics."], [2500, 2000, 4526], true),
          tblRow(["Outbox Polling Delay", "< 5ms", "LISTEN/NOTIFY provided near-instant reactivity across pods."], [2500, 2000, 4526]),
          tblRow(["Kafka Partition Lag", "< 500ms", "The Smart Aggregator efficiently folded massive backlogs in memory."], [2500, 2000, 4526], true),
          tblRow(["SSE Fan-Out Ratio", "1:N (Targeted)", "Internal network saturation was completely avoided via Redis routing."], [2500, 2000, 4526]),
        ]
      }),
      emptyLine(),
      body("The results clearly demonstrate the effectiveness of the non-blocking architecture. Despite the massive influx of write requests, the primary GraphQL API Gateway maintained a 95th percentile latency of under 40 milliseconds. This was achieved because the API simply inserts the row and the Outbox event in a single transaction (wCTE) and immediately returns, offloading all subsequent side-effects to the Kafka brokers."),

      h3("6.3.1 Optimization Benchmarks"),
      body("To mathematically quantify the impact of specific architectural optimizations, localized benchmark tests were conducted comparing the traditional synchronous cascade approach against Taskinator's implemented Chunked Self-Signaling solutions."),
      emptyLine(),
      tblCaption("Table 6.2: Chunked vs Unbounded Deletion Benchmarks"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2200, 3000, 3826],
        rows: [
          tblHeader(["Deletion Target", "Unbounded CASCADE (Traditional)", "Chunked Self-Signaling (Taskinator)"], [2200, 3000, 3826]),
          tblRow(["1,000 Tasks", "145ms DB Lock", "12ms DB Lock (1 chunk)"], [2200, 3000, 3826]),
          tblRow(["10,000 Tasks", "2.1s DB Lock (Timeouts Occur)", "~15ms Lock per chunk (5 iterations)"], [2200, 3000, 3826], true),
          tblRow(["50,000 Tasks", "> 10s DB Lock (System Failure)", "~15ms Lock per chunk (25 iterations)"], [2200, 3000, 3826]),
        ]
      }),
      emptyLine(),
      body("The Chunked Self-Signaling Deletion mechanism proved absolutely critical to system stability. In a traditional unbounded DELETE CASCADE scenario, attempting to remove a deeply nested project containing 50,000 tasks held an exclusive database lock for over 10 seconds. This effectively brought the entire monolithic application to a halt, causing cascading transaction timeouts across unrelated API requests."),
      body("Conversely, the chunked approach computationally sliced this massive operation into 25 separate, bounded transactions (exactly 2,000 rows each). While the total execution time to completely purge the data from the disk was roughly equivalent (accounting for Kafka transport latency), the maximum continuous database lock time never exceeded 15 milliseconds. This allowed concurrent operations from other users to interleave and process completely unimpeded, fulfilling the absolute requirement for high Availability."),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // CHAPTER 7: CONCLUSION
      // ══════════════════════════════════════════════════════════════
      h1("7. CONCLUSION AND FUTURE WORK"),

      h2("7.1 Conclusion"),
      body("The design and implementation of Taskinator definitively prove that scaling complex, highly relational orchestration tools to handle extreme enterprise workloads (10,000+ RPS) is achievable by aggressively pursuing a non-blocking, Event-Driven Architecture."),
      body("By fundamentally challenging traditional synchronous CRUD philosophies, this thesis demonstrates the necessity of structural trade-offs. While sacrificing immediate Strong Consistency initially appears detrimental to user experience, the implementation of Optimistic UI caching and Zero-Fan-Out Real-Time SSE synchronization completely masks this eventual consistency from the end-user."),
      body("Furthermore, the introduction of advanced database patterns—specifically Custom Closure Tables updated asynchronously, wCTE Transactional Outboxes, and Chunked Self-Signaling deletions—provides a robust, academically sound blueprint for modern enterprise applications seeking to escape the limitations of monolithic database locking."),

      h2("7.2 Future Work"),
      body("While the current architecture successfully mitigates database write amplification, future research and development on the Taskinator platform should focus on the deployment topology. Investigating the transition from a Modular Monolith into a fully distributed microservice mesh utilizing Kubernetes auto-scaling (KEDA) based on Kafka lag metrics would provide even greater elastic resilience. Additionally, researching the integration of a specialized graph database (such as Neo4j) to offload the Reachability Engine entirely from PostgreSQL could yield further performance enhancements for projects exceeding one million nested tasks."),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // REFERENCES
      // ══════════════════════════════════════════════════════════════
      h1("REFERENCES"),
      emptyLine(),
      numbered("Kleppmann, M. (2017). Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems. O'Reilly Media.", "n5"),
      numbered("Celko, J. (2012). Joe Celko's Trees and Hierarchies in SQL for Smarties. Morgan Kaufmann.", "n5"),
      numbered("Richardson, C. (2018). Microservices Patterns: With examples in Java. Manning Publications.", "n5"),
      numbered("Stopford, B. (2018). Designing Event-Driven Systems: Concepts and Patterns for Streaming Services with Apache Kafka. O'Reilly Media.", "n5"),
      numbered("Brewer, E. A. (2000). Towards robust distributed systems. Proceedings of the Nineteenth Annual ACM Symposium on Principles of Distributed Computing - PODC '00.", "n5"),
      numbered("Fowler, M. (2006). Patterns of Enterprise Application Architecture. Addison-Wesley Professional.", "n5"),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(__dirname + "/taskinator_thesis_v2.docx", buf);
  console.log("Done!");
}).catch(e => { console.error(e); process.exit(1); });