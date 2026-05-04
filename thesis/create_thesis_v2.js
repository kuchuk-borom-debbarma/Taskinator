const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  TableOfContents, PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader
} = require('docx');
const fs = require('fs');

// ── helpers ──────────────────────────────────────────────────────────────────
const CONTENT_W = 9026; // A4 1" margins

const border = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function para(text, opts = {}) {
  const {
    bold = false, size = 22, font = "Times New Roman", align = AlignmentType.JUSTIFIED,
    spaceBefore = 0, spaceAfter = 120, italic = false, underline = false,
    heading = null, indent = null
  } = opts;

  const runProps = { text, bold, size, font };
  if (italic) runProps.italics = true;
  if (underline) runProps.underline = {};

  const pProps = { alignment: align, spacing: { before: spaceBefore, after: spaceAfter } };
  if (heading) {
    pProps.heading = heading;
  }
  if (indent) pProps.indent = indent;

  return new Paragraph({ ...pProps, children: [new TextRun(runProps)] });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 240 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Times New Roman" })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 180 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Times New Roman" })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22, font: "Times New Roman" })]
  });
}

function centeredBold(text, size = 24) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [new TextRun({ text, bold: true, size, font: "Times New Roman" })]
  });
}

function centered(text, size = 22, italic = false) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size, font: "Times New Roman", italics: italic })]
  });
}

function body(text, spaceBefore = 0) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: spaceBefore, after: 120 },
    children: [new TextRun({ text, size: 22, font: "Times New Roman" })]
  });
}

function emptyLine() {
  return new Paragraph({ children: [new TextRun("")], spacing: { before: 0, after: 120 } });
}

function bullet(text, numbered = false, numRef = "bullets") {
  return new Paragraph({
    numbering: { reference: numRef, level: 0 },
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Times New Roman" })]
  });
}

function numberedItem(text, numRef = "numbered") {
  return new Paragraph({
    numbering: { reference: numRef, level: 0 },
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Times New Roman" })]
  });
}

function subBullet(text) {
  return new Paragraph({
    numbering: { reference: "subbullets", level: 0 },
    spacing: { before: 0, after: 60 },
    indent: { left: 1440, hanging: 360 },
    children: [new TextRun({ text, size: 22, font: "Times New Roman" })]
  });
}

function pageBreak() {
  return new Paragraph({
    children: [new PageBreak()]
  });
}

function signatureLine(left, right) {
  const cellW = CONTENT_W / 2;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [cellW, cellW],
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: cellW, type: WidthType.DXA },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: ".......................................................", size: 22, font: "Times New Roman" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: "Signature", size: 22, font: "Times New Roman" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: left.name, bold: true, size: 22, font: "Times New Roman" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: left.title, bold: true, size: 22, font: "Times New Roman" })] }),
            ]
          }),
          new TableCell({
            width: { size: cellW, type: WidthType.DXA },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: ".......................................................", size: 22, font: "Times New Roman" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: "Signature", size: 22, font: "Times New Roman" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: right.name, bold: true, size: 22, font: "Times New Roman" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: right.title, bold: true, size: 22, font: "Times New Roman" })] }),
            ]
          })
        ]
      })
    ]
  });
}

function imagePlaceholder(label) {
  const inner = { style: BorderStyle.DASHED, size: 6, color: "888888" };
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_W, type: WidthType.DXA },
            borders: { top: inner, bottom: inner, left: inner, right: inner },
            shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `[ Image Placeholder: ${label} ]`, italics: true, size: 20, font: "Times New Roman", color: "666666" })]
              })
            ]
          })
        ]
      })
    ]
  });
}

function tocEntry(text, pageNum, indent = 0) {
  return new Paragraph({
    spacing: { before: 0, after: 80 },
    indent: indent ? { left: indent } : undefined,
    children: [
      new TextRun({ text, size: 22, font: "Times New Roman" }),
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
        font: "Times New Roman",
      }),
    ],
  });
}

function figCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 200 },
    children: [new TextRun({ text, italics: true, bold: true, size: 20, font: "Times New Roman" })]
  });
}

function makeTableHeader(cells, widths) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((c, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: "D9E1F2", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: c, bold: true, size: 20, font: "Times New Roman" })] })]
    }))
  });
}

function makeTableRow(cells, widths, shade = false) {
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: shade ? "F5F5F5" : "FFFFFF", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: c, size: 20, font: "Times New Roman" })] })]
    }))
  });
}

// ── DOCUMENT ─────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "subbullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2013",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } }
        }]
      },
      {
        reference: "numbered",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "numbered2",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "numbered3",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "bullets2",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "bullets3",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
    ]
  },
  styles: {
    default: {
      document: { run: { font: "Times New Roman", size: 22 } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [
    // ── SECTION 1: Cover + Front Matter ──────────────────────────────────────
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ children: [PageNumber.CURRENT], size: 20, font: "Times New Roman" }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ===== COVER PAGE =====
        emptyLine(),
        emptyLine(),
        centeredBold("A THESIS REPORT", 28),
        centered("On", 22),
        emptyLine(),
        centeredBold("Design and Implementation of a High-Throughput Event-Driven Project and Task Management Application", 24),
        emptyLine(),
        emptyLine(),
        centered("Submitted by", 22, true),
        emptyLine(),
        centeredBold("Kuchuk Borom Debbarma", 24),
        emptyLine(),
        centered("In partial fulfillment for the award of the degree", 22),
        centered("of", 22),
        centeredBold("M.Tech (CSE)", 24),
        emptyLine(),
        emptyLine(),
        centeredBold("Under the Guidance of", 22),
        emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Guide Name: ", bold: true, size: 22, font: "Times New Roman" }), new TextRun({ text: "Dr. Abhijit Biswas", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Designation: ", bold: true, size: 22, font: "Times New Roman" }), new TextRun({ text: "Coordinator CSE & CA", size: 22, font: "Times New Roman" })] }),
        emptyLine(),
        emptyLine(),

        // Logo placeholder
        imagePlaceholder("ICFAI University Logo"),
        emptyLine(),

        centeredBold("The ICFAI University, Tripura", 24),
        centeredBold("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", 22),
        centeredBold("ICFAI Technical School Faculty of Science and Technology", 22),
        emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Course Code: ", bold: true, size: 22, font: "Times New Roman" }), new TextRun({ text: "CSE620P", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Course Title: ", bold: true, size: 22, font: "Times New Roman" }), new TextRun({ text: "Thesis Report II", size: 22, font: "Times New Roman" })] }),
        centered("2025-2026", 22),

        pageBreak(),

        // ===== DECLARATION =====
        emptyLine(),
        imagePlaceholder("ICFAI University Logo"),
        emptyLine(),
        centeredBold("The ICFAI University, Tripura", 22),
        centeredBold("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", 22),
        emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 180 }, children: [new TextRun({ text: "Declaration of Student", size: 24, font: "Times New Roman" })] }),
        body('I hereby declare that the project entitled "Design and Implementation of a High-Throughput Event-Driven Project and Task Management Application" submitted for the Thesis Report II CSE620P, is my original work and the project has not formed the basis for the award of any other degree, diploma, fellowship or any other similar titles.'),
        emptyLine(),
        emptyLine(),
        new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Date: ", bold: true, size: 22, font: "Times New Roman" }), new TextRun({ text: "20/05/2026", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Signature: ", bold: true, size: 22, font: "Times New Roman" }), new TextRun({ text: "_________________", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Name: ", bold: true, size: 22, font: "Times New Roman" }), new TextRun({ text: "Kuchuk Borom Debbarma", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Department of CSE", bold: true, size: 22, font: "Times New Roman" })] }),

        pageBreak(),

        // ===== CERTIFICATE =====
        emptyLine(),
        imagePlaceholder("ICFAI University Logo"),
        emptyLine(),
        centeredBold("The ICFAI University, Tripura", 22),
        centeredBold("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", 22),
        emptyLine(),
        centeredBold("CERTIFICATE", 24),
        emptyLine(),
        body('This is to certify that the project titled "Design and Implementation of a High-Throughput Event-Driven Project and Task Management Application" is the bonafide work carried out by Kuchuk Borom Debbarma student of M.Tech of Department of Computer Science and Engineering, during the Thesis report 2026, in partial fulfillment of the requirements for the award of the degree and that the project has not formed the basis for the award previously of any other degree, diploma, fellowship or any other similar title.'),
        emptyLine(),
        emptyLine(),
        signatureLine(
          { name: "Dr. Abhijit Biswas", title: "Coordinator CSE & CA" },
          { name: "Dr. Saptarshi Chakraborty", title: "Head of the Department (CSE)" }
        ),
        emptyLine(),
        signatureLine(
          { name: "", title: "" },
          { name: "Dr. Prasanta Kumar Sinha", title: "Principal, ITS" }
        ),

        pageBreak(),

        // ===== ABSTRACT =====
        centeredBold("ABSTRACT", 26),
        emptyLine(),
        body("The demand for highly performant project management tools has grown exponentially as modern enterprises manage complex, deeply nested workflows. Traditional task management applications rely on strictly normalized database schemas and synchronous APIs that struggle to scale when subjected to massive task hierarchies, real-time synchronization demands, and high-frequency event triggers."),
        body('This thesis presents the design, implementation, and performance evaluation of "Taskinator," a full-stack project and task management application engineered for extreme scalability and real-time responsiveness. The system integrates a modern, interactive React-based frontend featuring a dynamic Task Graph visualization with a high-performance, event-driven Node.js backend.'),
        body("The core contribution of this thesis is a comprehensive architectural framework capable of sustaining 10,000 Requests Per Second (RPS) without sacrificing data integrity. This is achieved through deep technical optimizations across three primary layers. First, at the Database Layer, the system implements a Custom Closure Table pattern (Task Reachability Engine) for ultra-fast querying of infinite task hierarchies, combined with Optimistic Locking to prevent distributed race conditions. Second, at the Event-Driven Architecture (EDA) Layer, a Transactional Outbox pattern is powered by atomic Data-Modifying Common Table Expressions (wCTE). Pervasive batching begins at the producer level, and reactive PostgreSQL LISTEN/NOTIFY mechanics combined with SKIP LOCKED concurrency controls ensure zero-loss event publishing across horizontally scaled pods. Third, at the Consumer Layer, a Smart Batch Aggregator performs strict chronological sorting and semantic event folding to trim down batches into net deltas, drastically reducing database write amplification and preventing infinite recursive loops."),
        body("Crucially, this thesis explores the necessary architectural trade-offs required to achieve this scale, specifically analyzing the drawbacks of Eventual Consistency. To maintain high read-throughput, the system employs aggressive Denormalization strategies for aggregate counts and user metadata. Instead of re-calculating counts from the source, the system processes calculated deltas asynchronously. Furthermore, real-time client updates are achieved via a zero-fan-out targeted routing mechanism using Redis and Server-Sent Events (SSE), directly intercepted by the Apollo GraphQL cache for instant UI reconciliation."),
        body("Experimental evaluations demonstrate that the application's asynchronous, batch-first processing model—including chunked self-signaling recursive deletions—successfully eliminates long-transaction database locks. The proposed architecture proves that by combining strict data access patterns, reactive frontend visualization, and a highly tuned event-driven backend, complex orchestration tools can achieve extreme scalability."),

        pageBreak(),

        // ===== ACKNOWLEDGEMENT =====
        centeredBold("ACKNOWLEDGEMENT", 26),
        emptyLine(),
        body("I would like to express my special thanks of gratitude to my guide Dr. Abhijit Biswas for his able guidance and support in completing the project. A special thanks to the university administration, including the Principal, HOD, and Dean, for providing us with the necessary resources and opportunities to gain knowledge."),
        body("I would also like to thank God for giving me the strength and capability to complete this project. Finally, I extend my sincere thanks to my family, friends, and the entire ICFAI family for their continuous support."),
        emptyLine(),
        new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Name: ", bold: true, size: 22, font: "Times New Roman" }), new TextRun({ text: "Kuchuk Borom Debbarma", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Course: ", bold: true, size: 22, font: "Times New Roman" }), new TextRun({ text: "M.Tech CSE", size: 22, font: "Times New Roman" })] }),

        pageBreak(),

        // ===== LIST OF FIGURES =====
        centeredBold("List of Figures", 24),
        emptyLine(),
        tocEntry("Figure 3.1: Full-Stack System Architecture — Taskinator", "15"),
        tocEntry("Figure 3.2: Core Domain Entity-Relationship Model", "17"),
        tocEntry("Figure 4.1: Task Reachability Expansion Flow", "20"),
        tocEntry("Figure 4.2: Closure Table Cross-Join Expansion", "21"),
        tocEntry("Figure 4.3: Optimistic Locking Update Sequence", "22"),
        tocEntry("Figure 5.1: Transactional Outbox Pattern with wCTE", "24"),
        tocEntry("Figure 5.2: SKIP LOCKED — Mitigating the Thundering Herd", "25"),
        tocEntry("Figure 6.1: Smart Batch Aggregator — Semantic Folding Pipeline", "27"),
        tocEntry("Figure 6.2: Chunked Self-Signaling Deletion — The Bubbling Effect", "28"),
        tocEntry("Figure 7.1: Zero-Fan-Out Targeted SSE Routing via Redis", "30"),
        tocEntry("Figure 7.2: Apollo Client Cache Reconciliation via SSE", "31"),
        emptyLine(),

        centeredBold("List of Tables", 24),
        emptyLine(),
        tocEntry("Table 2.1: Comparison of Hierarchical Data Storage Models", "12"),
        tocEntry("Table 3.1: Hardware Specifications for System Development", "7"),
        tocEntry("Table 3.2: Software Specifications and Technologies Used", "8"),
        tocEntry("Table 4.1: Database Write amplification factors across schemas", "37"),
        tocEntry("Table 6.1: Chunked vs Unbounded Deletion Benchmarks", "36"),
        tocEntry("Table 8.1: Performance Metrics at 10,000 RPS", "35"),
        tocEntry("Table 8.2: Feature Importance and Resource Utilization", "38"),
        tocEntry("Table 8.3: System Accuracy and Consistency Metrics", "39"),

        pageBreak(),

        // ===== TABLE OF CONTENTS =====
        centeredBold("Table of Contents", 24),
        emptyLine(),
        tocEntry("1. INTRODUCTION", "6"),
        tocEntry("1.1 Problem Definition", "6", 360),
        tocEntry("1.2 Project Overview", "7", 360),
        tocEntry("1.3 Hardware Specification", "7", 360),
        tocEntry("1.4 Software Specification", "8", 360),
        tocEntry("2. LITERATURE SURVEY", "10"),
        tocEntry("2.1 Research Gaps", "10", 360),
        tocEntry("2.2 Summary of Literature Review", "11", 360),
        tocEntry("3. SYSTEM ANALYSIS AND DESIGN", "14"),
        tocEntry("3.1 System Architecture", "14", 360),
        tocEntry("3.2 Domain Modeling and ER Schema", "17", 360),
        tocEntry("3.3 Database Optimization & Denormalization", "18", 360),
        tocEntry("3.4 Event-Driven Pipeline (EDA) Implementation", "23", 360),
        tocEntry("3.5 Real-Time System (Targeted Routing)", "29", 360),
        tocEntry("3.6 Frontend Architecture and State Management", "30", 360),
        tocEntry("3.7 Automation and Trigger Engine", "32", 360),
        tocEntry("3.8 Testing Methodology", "33", 360),
        tocEntry("4. RESULTS AND DISCUSSION", "34"),
        tocEntry("4.1 Performance Analysis and Metrics", "34", 360),
        tocEntry("4.2 Optimization Benchmarks", "36", 360),
        tocEntry("4.3 Discussion and Drawback Mitigation", "38", 360),
        tocEntry("5. CONCLUSION AND FUTURE WORK", "40"),
        tocEntry("5.1 Conclusion", "40", 360),
        tocEntry("5.2 Future Work", "41", 360),
        tocEntry("REFERENCES", "43"),

        pageBreak(),

