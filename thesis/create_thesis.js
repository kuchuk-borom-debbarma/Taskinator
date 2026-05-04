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

        // ===== CHAPTER 1: INTRODUCTION =====
        heading1("CHAPTER 1"),
        heading1("INTRODUCTION"),

        heading2("1.1 Problem Definition"),
        body("As organizations scale, their project management needs evolve from simple, flat to-do lists into highly complex, interconnected workflows. Modern enterprise projects involve hundreds of nested sub-tasks, massive cross-functional teams, and strict dependency graphs. To manage this complexity, software tools must provide instant visual feedback and guarantee data integrity across thousands of concurrent users."),
        body("Designing applications capable of handling massive scale—targeting upwards of 10,000 Requests Per Second (RPS)—presents a severe engineering challenge. Traditional monolithic CRUD (Create, Read, Update, Delete) architectures rapidly degrade under these conditions. In a purely synchronous environment, when a user performs a complex operation—such as deleting a task that has thousands of descendants, or assigning a team of hundreds of members to a new workflow—the database must execute massive cascading updates. These operations acquire long-lived row or table locks, blocking concurrent reads and writes from other users."),
        body('Furthermore, modern clients demand real-time interactivity. When Task A is marked as completed by User 1, User 2 must see that update instantly on their screen without manually refreshing the page. Implementing real-time synchronization at scale introduces the "Fan-Out" problem: if 1,000 users are connected, broadcasting every system event to every user saturates the internal network and overwhelms client devices with irrelevant data.'),
        body("According to the CAP theorem, a distributed system can only provide two of the following three guarantees simultaneously: Consistency, Availability, and Partition Tolerance. In traditional relational architectures, the focus is heavily skewed towards Strong Consistency (ACID transactions blocking until globally committed), which inevitably sacrifices Availability under extreme load."),
        body("To achieve massive throughput, there is a fundamental need to shift away from blocking synchronous processing. The problem addressed in this thesis is the design and implementation of a scalable orchestration engine that mitigates write amplification, prevents distributed race conditions, and provides targeted real-time updates without crippling the core database or network infrastructure."),

        heading2("1.2 Project Overview"),
        body("The primary objective of this project is to design and implement Taskinator, a full-stack workflow orchestration platform that achieves extreme throughput and zero-loss event processing. The system offers a comprehensive suite of tools designed to handle deeply nested task hierarchies, real-time collaboration, and event-driven automation."),
        body("Taskinator prioritizes Availability and Partition Tolerance (AP). To achieve massive throughput, the system deliberately sacrifices strict, immediate Consistency in favor of Eventual Consistency. This intentional architectural trade-off is central to the system's design."),
        body("The core features of the system include:"),
        numberedItem("Project & Team Management: Organizations can create distinct projects and organize users into nested Team hierarchies. A complex Closure Table pattern ensures that access control and bulk assignments calculate rapidly, respecting inheritance rules.", "numbered"),
        numberedItem("Task Reachability Graph: Users can create infinitely nested tasks and sub-tasks, establishing complex dependencies. Instead of traditional lists, these dependencies are represented visually through an interactive React Task Graph.", "numbered"),
        numberedItem("Event-Driven Asynchrony: Critical operations (like creating tasks) remain synchronous for immediate user feedback, but expensive side effects (like aggregate count updates and closure table path calculations) are offloaded to a Kafka-based message broker.", "numbered"),
        numberedItem("Zero-Fan-Out Real-Time Synchronization: A highly targeted Redis routing layer ensures that Server-Sent Events (SSE) are pushed exclusively to the clients who are actively viewing the affected data.", "numbered"),
        numberedItem('Automation & Triggers: A rule-based engine ("IF-THEN-CLEANUP") that reacts to domain events. It handles complex workflows like "Parent Guard Triggers" to prevent tasks from being marked as completed if their sub-tasks are still pending.', "numbered"),

        heading2("1.3 Hardware Specification"),
        body("The primary development, experimentation, and load-testing environment consisted of a computing system equipped with sufficient memory and processing power for handling large-scale concurrent requests, event streaming, and database containerization. The hardware configuration used during the research is summarized as follows:"),
        bullet("Processor: Apple Silicon (M-series ARM64 architecture) providing high multi-core efficiency for Node.js worker threads and container orchestration.", false, "bullets"),
        bullet("System Memory: 16 GB Unified Memory, essential for running multiple Docker containers (PostgreSQL, Kafka, Redis) alongside the Node.js application and the React frontend development server.", false, "bullets"),
        bullet("Storage: 512 GB Solid State Drive (SSD), ensuring rapid read/write speeds for database persistence layers and fast compilation times for TypeScript.", false, "bullets"),
        bullet("Network Interface: Standard gigabit interface capable of handling thousands of local concurrent TCP connections during RPS stress testing.", false, "bullets"),
        emptyLine(),
        body("In addition to the local computing environment, load testing required isolated environments to simulate realistic network jitter. Tools like Apache JMeter and custom Node.js stress scripts were executed on the same hardware, utilizing all available cores to bombard the GraphQL API gateway."),

        heading2("1.4 Software Specification"),
        body("The Taskinator system is constructed using a modern, full-stack JavaScript/TypeScript ecosystem, selected specifically for its non-blocking I/O model and rich typed interfaces."),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "Frontend:", bold: true, size: 22, font: "Times New Roman" })] }),
        bullet("Framework: React 18 with TypeScript.", false, "bullets2"),
        bullet("State Management: Apollo GraphQL Client (v3) with normalized in-memory caching.", false, "bullets2"),
        bullet("Visualization: D3.js and custom SVG rendering logic for the interactive Task Graph.", false, "bullets2"),
        bullet("Build Tooling: Vite for rapid Hot Module Replacement (HMR) and optimized production bundling.", false, "bullets2"),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "Backend Application Layer:", bold: true, size: 22, font: "Times New Roman" })] }),
        bullet("Runtime: Node.js (v20+) / Bun, leveraging the V8/JavaScriptCore event loop for high concurrency.", false, "bullets3"),
        bullet("API Protocol: GraphQL, providing flexible, typed data queries to prevent over-fetching.", false, "bullets3"),
        bullet("Language: TypeScript, enforcing strict type safety across domain boundaries.", false, "bullets3"),
        bullet("Query Builder: Kysely, a type-safe SQL query builder ensuring compile-time safety for complex CTEs and joins.", false, "bullets3"),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "Data and Infrastructure Layer:", bold: true, size: 22, font: "Times New Roman" })] }),

        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Primary Database: PostgreSQL 16. Used for persistent relational data, exploiting advanced features like Common Table Expressions (CTEs), LISTEN/NOTIFY pub/sub, and SKIP LOCKED concurrency control.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Event Broker: Apache Kafka. Acts as the durable, partitioned backbone of the Event-Driven Architecture, guaranteeing message ordering via Project ID keys.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "In-Memory Datastore: Redis. Utilized for zero-fan-out targeted routing of real-time Server-Sent Events (SSE) across distributed backend pods.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Containerization: Docker & Docker Compose. Used to orchestrate the local development environment, ensuring parity between local testing and eventual Kubernetes deployment.", size: 22, font: "Times New Roman" })] }),
        emptyLine(),
        body("This carefully selected stack allows the application to remain strictly asynchronous from the initial HTTP request all the way down to the database row-lock level, satisfying the core objective of non-blocking execution."),

        pageBreak(),

        // ===== CHAPTER 2: LITERATURE SURVEY =====
        heading1("CHAPTER 2"),
        heading1("LITERATURE SURVEY"),

        heading2("2.1 Research Gaps"),
        body("The evolution of workflow orchestration and project management tools has been extensively studied, yet there remains a significant gap between theoretical architectural patterns and their practical application in high-throughput enterprise systems. The literature reveals several distinct research gaps that motivate the development of Taskinator:"),
        emptyLine(),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "1. Scalability Limitations in Hierarchical Data Models:", bold: true, size: 22, font: "Times New Roman" })] }),
        body("A core function of any task management system is handling hierarchical data (tasks, sub-tasks, sub-sub-tasks). Traditional literature heavily favors the Adjacency List model (using a parent_id column) due to its simplicity. However, deep tree traversals in this model require recursive Common Table Expressions (CTEs), which degrade exponentially in performance as tree depth increases. While Closure Tables (storing all transitive paths) are discussed theoretically, they are often dismissed in practical applications due to severe O(depth) write amplification. There is a gap in literature demonstrating how to effectively mitigate this write amplification using asynchronous event-driven batching, making Closure Tables viable for 10k RPS systems."),
        emptyLine(),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "2. The Thundering Herd Problem in Outbox Polling:", bold: true, size: 22, font: "Times New Roman" })] }),
        body("To achieve Eventual Consistency without dual-write failures, the Transactional Outbox pattern is widely recommended in microservice architecture literature. However, standard implementations rely on background workers using setInterval polling to query the outbox table. In a horizontally scaled environment with dozens of pods, this creates a \"Thundering Herd\" problem, where all pods query the database simultaneously, leading to severe lock contention and deadlocks. Existing literature often points to complex solutions like Debezium (Change Data Capture), which introduces massive infrastructural overhead. There is a need for simpler, native database mechanisms (like PostgreSQL SKIP LOCKED) to solve this gap efficiently."),
        emptyLine(),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "3. Write Amplification from Cascading Deletions:", bold: true, size: 22, font: "Times New Roman" })] }),
        body("When a root node in a deeply nested graph is deleted, traditional RDBMS design dictates the use of ON DELETE CASCADE foreign keys. At scale, this is catastrophic. A single HTTP request triggering a synchronous cascade across 50,000 descendant rows will hold exclusive database locks for seconds, causing massive timeout failures across the system. Literature lacks comprehensive patterns for \"Chunked Self-Signaling Deletions\" that perform unbounded cleanups using bounded, time-sliced transactions."),
        emptyLine(),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "4. Network Saturation in Real-Time Systems:", bold: true, size: 22, font: "Times New Roman" })] }),
        body("Modern applications rely heavily on WebSockets or Server-Sent Events (SSE) for real-time interactivity. The prevalent pattern for distributing events across a cluster of backend nodes is \"Pub/Sub Fan-Out\" (e.g., using Redis PUBLISH). If an event occurs, it is broadcast to every server, which then checks if it holds the relevant client connection. At high scale, this leads to an overwhelming volume of unnecessary internal network traffic. Targeted routing strategies that eliminate fan-out are underrepresented in current web architecture studies."),

        heading2("2.2 Summary of Literature Review"),
        body("To address these gaps, Taskinator's architecture draws upon and synthesizes several key areas of distributed systems research and database theory."),
        heading3("Hierarchical Data Models"),
        body("When representing hierarchical data, traditional relational databases offer several models, each with distinct trade-offs:"),
        numberedItem("Adjacency List (parent_id): Simple to implement but requires slow, recursive Common Table Expressions (CTEs) to retrieve deep sub-trees.", "numbered2"),
        numberedItem("Materialized Path: Stores the full ancestry as a string. It provides fast read access but string manipulation scales poorly for complex graph traversals and multi-parent dependencies.", "numbered2"),
        numberedItem("Closure Table: Stores all paths between nodes in a transitive closure matrix. While traditional literature highlights severe O(depth) write amplification, customized closure implementations can mitigate this by batching updates asynchronously. This allows O(1) reachability checks across complex directed graphs. Taskinator synthesizes this by storing only reachability (not strict paths) and computing exact paths in-memory on the application layer.", "numbered2"),

        heading3("Consistency Models and the CAP Theorem"),
        body("Modern high-throughput web applications frequently transition from Strong Consistency (ACID transactions blocking until globally committed) to Eventual Consistency (BASE: Basically Available, Soft state, Eventual consistency). Literature confirms that Eventual Consistency is necessary for scaling out microservices and modular monoliths. Kleppmann (2017) emphasizes that strong consistency requires distributed consensus protocols (like Paxos or Raft), which inherently limit write throughput. Taskinator embraces the BASE model, utilizing denormalization for reads and asynchronous event processing for writes. While this introduces complexity in the User Interface regarding stale data, it is mitigated using Optimistic UI updates on the client side."),

        heading3("The Transactional Outbox Pattern"),
        body("The dual-write problem—where a system must write to a database and publish to a message broker simultaneously—is a well-documented failure mode in distributed systems. If the database commits but the broker publish fails, the system is permanently inconsistent. The Transactional Outbox pattern solves this by writing the event payload to an outbox table within the same ACID transaction as the business data mutation. Taskinator implements this pattern, but enhances it using PostgreSQL's Data-Modifying CTEs (wCTEs) to eliminate multi-statement transaction overhead, ensuring atomicity in a single network roundtrip."),

        heading3("Concurrency and Locking Strategies"),
        body("To maintain data integrity during concurrent updates, traditional systems rely on Pessimistic Locking (SELECT ... FOR UPDATE). This guarantees safety but blocks concurrent access. Optimistic Locking, utilizing a version column, is proposed in literature as a high-performance alternative for environments where read-to-write ratios are high and conflicts are relatively rare. By rejecting updates that reference stale version numbers, the system forces the client to retry, preserving integrity without acquiring long-lived locks. Taskinator implements Optimistic Locking globally across all major entities."),

        heading3("Event Streaming and Kafka"),
        body("Apache Kafka is fundamentally different from traditional message queues (like RabbitMQ) because it acts as an immutable, partitioned log. Literature surrounding stream processing emphasizes the importance of partitioning keys to guarantee causal ordering. By partitioning all events by projectId, Taskinator ensures that an \"Update Task\" event is never processed before the preceding \"Create Task\" event, regardless of network transport jitter. Furthermore, Kafka's consumer group mechanics allow multiple independent services (e.g., the Reachability Engine and the Real-Time Router) to process the same event stream simultaneously without interfering with each other."),
        body("By synthesizing these advanced patterns—Custom Closure Tables, wCTE Outboxes, Optimistic Locking, and Targeted Redis Routing—Taskinator proposes a novel, integrated framework that addresses the specific research gaps associated with scaling complex orchestration systems."),

        pageBreak(),

        // ===== CHAPTER 3: SYSTEM ANALYSIS AND DESIGN =====
        heading1("CHAPTER 3"),
        heading1("SYSTEM ANALYSIS AND DESIGN"),
        body('To achieve the goals of high throughput and large scalability, Taskinator follows a "non-blocking" full-stack architectural philosophy, minimizing synchronous wait times at every layer.'),

        heading2("3.1 System Architecture"),
        body("The overarching system architecture is constructed as a Modular Monolith with an Event-Driven backbone. This approach provides the deployment simplicity of a monolithic application while enforcing the strict domain boundaries and loose coupling characteristic of microservices."),
        emptyLine(),
        imagePlaceholder("Figure 3.1: Full-Stack System Architecture — Taskinator"),
        figCaption("Figure 3.1: Full-Stack System Architecture Data Flow"),
        emptyLine(),
        body("The architecture is divided into five distinct operational layers:"),
        numberedItem("Layer 1 (Client): The React Frontend, featuring the interactive Task Graph visualization and Apollo Client for state management. It connects to the backend via HTTP for queries/mutations and Server-Sent Events (SSE) for real-time updates.", "numbered3"),
        numberedItem("Layer 2 (API Gateway): The GraphQL server. It handles authentication, validates incoming requests, and resolves mutations.", "numbered3"),
        numberedItem("Layer 3 (Application Backend): The core Node.js application, subdivided into distinct domain modules (Project, Task, Team). It includes the Outbox Relay for reliable event publishing and dedicated Kafka Consumers for asynchronous background processing.", "numbered3"),
        numberedItem("Layer 4 (Data Storage & Streaming): PostgreSQL serves as the primary source of truth, while Apache Kafka acts as the high-throughput, partitioned event bus.", "numbered3"),
        numberedItem("Layer 5 (Real-Time Routing): Redis Pub/Sub operates as an ephemeral routing table, mapping active user sessions to specific server instances for zero-fan-out SSE delivery.", "numbered3"),

        heading3("3.1.1 End-to-End Orchestration Lifecycle"),
        body("To truly understand the power of the non-blocking architecture, we must trace a complex user operation completely through the stack."),
        emptyLine(),
        imagePlaceholder("Figure 3.2: End-to-End Orchestration Lifecycle — Create Task Link"),
        figCaption("Figure 3.2: End-to-End Orchestration: The \"Create Task Link\" Lifecycle"),
        emptyLine(),
        body("When a user connects two existing tasks (Task A as parent to Task B), the operation executes in milliseconds through targeted event routing:"),

        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "The API Request: The client executes a GraphQL mutation to link the tasks.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Atomic Write: The API executes a single Data-Modifying CTE (wCTE) that verifies permissions, inserts the link, and inserts a TASK_LINK_CREATED JSON payload into the outbox_events table simultaneously.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Immediate Response: The database commits, and the API instantly returns an HTTP 200 to the client. The synchronous path is complete.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Reactivity: The database fires a pg_notify event. The Outbox Relay wakes up and claims the event using FOR UPDATE SKIP LOCKED.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Partitioned Publishing: The relay publishes the event to Kafka, partitioned by the projectId to maintain strict causal ordering.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Parallel Execution: Once in Kafka, multiple distinct consumer pipelines process the event simultaneously. The Smart Aggregator folds the event and updates denormalized counts. The Reachability Engine expands the Closure Table for graph reads. The Real-Time Router queries Redis for active connections, pushing the specific payload only to the Node instances serving project stakeholders, triggering an instant UI re-render.", size: 22, font: "Times New Roman" })] }),

        heading2("3.2 Domain Modeling and ER Schema"),
        body("Taskinator's domain model is strictly relational, designed to support massive datasets without resorting to unstructured NoSQL patterns, ensuring rigid data integrity."),
        emptyLine(),
        imagePlaceholder("Figure 3.3: Core Domain Entity-Relationship Model"),
        figCaption("Figure 3.3: Core Domain Entity-Relationship Model"),
        emptyLine(),
        body("The core entities are highly optimized:"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "project_task: The central entity. It utilizes a materialized_path (TEXT) for hierarchical indexing and a version (INT) column for optimistic concurrency control.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "task_link: Represents the directed edges (dependencies) between tasks. It is fundamentally distinct from the parent/child hierarchy, allowing a task to block or relate to tasks anywhere else in the project graph.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "task_reachability: The transitive closure index mapping every ancestor to every descendant. It operates without a surrogate primary key, utilizing a composite key of (fk_project_id, ancestor_task_id, descendant_task_id).", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "outbox_events: The ephemeral table responsible for bridging ACID database transactions with the Kafka event bus.", size: 22, font: "Times New Roman" })] }),

        heading2("3.3 Database Optimization & Denormalization"),
        body("Before detailing the event pipelines, it is crucial to understand the foundational data layer optimizations that enable high throughput."),

        heading3("3.3.1 Task Reachability Engine: Custom Closure Tables"),
        body("To support infinite task nesting and complex dependencies, Taskinator rejects slow recursive queries in favor of a Custom Closure Table. The task_reachability index stores every path from every ancestor to every descendant in the graph, tracking the depth (number of hops)."),
        emptyLine(),
        imagePlaceholder("Figure 4.1: Task Reachability Expansion Flow"),
        figCaption("Figure 4.1: Task Reachability Expansion Flow"),
        emptyLine(),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "Cross-Join Expansion Math:", bold: true, size: 22, font: "Times New Roman" })] }),
        body("When a dependency linking Task A as a parent of Task B is created, the engine queries the closure table for all tasks that reach A (Ancestors) and all tasks reached by B (Descendants)."),
        emptyLine(),
        imagePlaceholder("Figure 4.2: Closure Table Cross-Join Expansion"),
        figCaption("Figure 4.2: Closure Table Cross-Join Expansion"),
        emptyLine(),
        body("Every discovered ancestor must now reach every discovered descendant. If A has 5 ancestors and B has 10 descendants, the system calculates 5 x 10 = 50 new paths. The new depth is calculated as: Depth(Anc -> A) + 1 + Depth(B -> Des). By maintaining this matrix, the React Task Graph can fetch the entire dependency tree of a massive project in a single, index-backed O(1) query."),

        heading3("3.3.2 Optimistic Locking & Concurrency"),
        body("In a high-throughput environment, multiple users or background services may attempt to update the same task simultaneously. Instead of acquiring pessimistic database locks (SELECT ... FOR UPDATE), which block concurrent reads and severely limit throughput, the system employs Optimistic Locking."),
        emptyLine(),
        imagePlaceholder("Figure 4.3: Optimistic Locking Update Sequence"),
        figCaption("Figure 4.3: Optimistic Locking Update Sequence"),
        emptyLine(),
        body("Every record includes a version column. When a client reads a task, it receives version 1. When it attempts an update, it sends WHERE version = 1. If another client updated the task in the meantime, the version in the database is now 2. The update fails, returning 0 rows. The system catches this, rejects the stale update, and forces the client to reconcile, guaranteeing data integrity without read-blocking."),

        heading3("3.3.3 CTE-Based Atomic Authorization"),
        body("To avoid multiple roundtrips to an external authorization table for every request, security is baked directly into the SQL mutation using Common Table Expressions (CTEs):"),
        new Paragraph({
          spacing: { before: 120, after: 120 },
          indent: { left: 720 },
          children: [new TextRun({ text: "WITH auth_check AS (", font: "Courier New", size: 20 })]
        }),
        new Paragraph({ spacing: { before: 0, after: 0 }, indent: { left: 1080 }, children: [new TextRun({ text: "SELECT 1 FROM project_member WHERE fk_project_id = $1 AND fk_user_id = $2", font: "Courier New", size: 20 })] }),
        new Paragraph({ spacing: { before: 0, after: 0 }, indent: { left: 720 }, children: [new TextRun({ text: ")", font: "Courier New", size: 20 })] }),
        new Paragraph({ spacing: { before: 0, after: 0 }, indent: { left: 720 }, children: [new TextRun({ text: "UPDATE project_task SET title = $3", font: "Courier New", size: 20 })] }),
        new Paragraph({ spacing: { before: 0, after: 0 }, indent: { left: 720 }, children: [new TextRun({ text: "WHERE id = $4 AND EXISTS (SELECT 1 FROM auth_check)", font: "Courier New", size: 20 })] }),
        new Paragraph({ spacing: { before: 0, after: 120 }, indent: { left: 720 }, children: [new TextRun({ text: "RETURNING *;", font: "Courier New", size: 20 })] }),
        body("This achieves single-trip atomic security. If the user lacks permissions, the EXISTS clause fails, and the update is safely aborted at the database engine level."),

        heading3("3.3.4 Strategic Denormalization & Eventual Consistency"),
        body("Calculating the total number of tasks in a project dynamically requires an expensive COUNT(*) query. Taskinator denormalizes this value directly onto the Project entity (project.task_count). When a task is created, the system does not recalculate the count. Instead, an event is fired. A background aggregator calculates the mathematical delta (+1) and asynchronously executes an UPDATE project SET task_count = task_count + 1. This purely delta-based approach prevents expensive table scans entirely."),

        heading2("3.4 Event-Driven Pipeline (EDA) Implementation"),
        body("The backbone of Taskinator is its Event-Driven Architecture, which utilizes pervasive batching starting all the way at the producer level."),

        heading3("3.4.1 The Transactional Outbox Pattern & wCTE"),
        body("A classic distributed systems failure occurs when a database transaction commits, but the application crashes before publishing the resulting event to Kafka. Taskinator utilizes the Transactional Outbox Pattern to guarantee atomic writes."),
        emptyLine(),
        imagePlaceholder("Figure 5.1: Transactional Outbox Pattern with wCTE"),
        figCaption("Figure 5.1: Transactional Outbox Workflow using wCTE"),
        emptyLine(),
        body("A single SQL query uses WITH clauses to insert the business data (Task) and immediately insert the batched JSON payload into the outbox_events table simultaneously. If the transaction rolls back, both are discarded."),

        heading3("3.4.2 Concurrent Outbox Relays: Mitigating the Thundering Herd"),
        body("Traditional outboxes use setInterval to poll the database, causing severe database load. Taskinator relies on reactivity. The Outbox Relay connects via pg and executes LISTEN outbox_event_notification."),
        body("When the wCTE commits, PostgreSQL pushes a notification. In a horizontally scaled Kubernetes environment, this creates a \"Thundering Herd\" problem: 5 different relay pods wake up simultaneously to grab the exact same events."),
        emptyLine(),
        imagePlaceholder("Figure 5.2: SKIP LOCKED — Mitigating the Thundering Herd"),
        figCaption("Figure 5.2: Concurrent Outbox Polling: Mitigating the Thundering Herd"),
        emptyLine(),
        body("As Pod 1 executes SELECT ... FOR UPDATE, it locks rows 1 through 100. Milliseconds later, Pod 2 executes the exact same query. Because of the SKIP LOCKED directive, PostgreSQL instructs Pod 2 to ignore rows 1-100 entirely. Pod 2 instead reads and locks rows 101 through 200. The result is massive concurrent throughput without polling loops, database deadlocks, or duplicate event publishing."),

        heading3("3.4.3 Smart Batch Aggregation & Semantic Folding"),
        body("Pushing millions of events into Kafka is useless if consumers cannot process them efficiently. Naive consumers execute one database transaction per Kafka event. At 10k RPS, this crushes the database. Taskinator introduces the Smart Batch Aggregator."),
        emptyLine(),
        imagePlaceholder("Figure 6.1: Smart Batch Aggregator — Semantic Folding Pipeline"),
        figCaption("Figure 6.1: Smart Batch Aggregator Data Flow"),
        emptyLine(),
        body("The consumer receives a batch of events and sorts them chronologically. It loops over the events in memory. If it sees 50 \"Task Created\" and 20 \"Task Deleted\" events for the same project, it does not execute 70 SQL updates. It calculates a net delta (+30) and executes a single database update to the denormalized project.task_count. By partitioning strictly by projectId, there is a risk of a \"Hot Partition\", but semantic folding prevents consumer starvation."),

        heading3("3.4.4 Chunked Self-Signaling Deletion (The Bubbling Effect)"),
        body("In hierarchical systems, deleting a root node with 10,000 descendants via a synchronous SQL CASCADE command locks the database table for seconds. Taskinator implements Declarative Signalling and Self-Chunking."),
        emptyLine(),
        imagePlaceholder("Figure 6.2: Chunked Self-Signaling Deletion — The Bubbling Effect"),
        figCaption("Figure 6.2: Chunked Self-Signaling Deletion (\"The Bubbling Effect\")"),
        emptyLine(),
        body("Instead of performing complex operations inline, the aggregator emits a secondary declarative signal back into the Outbox. A specialized Listener picks up the signal and queries a small chunk using exact limits: SELECT id ... LIMIT 2000. The Listener deletes only those 2000 rows. If more rows remain, the Listener emits a new self-signal back into the outbox to process the next chunk. This recursively \"bubbles\" through the queue until the table is completely purged. By enforcing strict LIMIT 2000 bounds, the database is never locked for more than a few milliseconds."),

        heading2("3.5 Real-Time System (Targeted Routing)"),
        body("To keep the interactive React Task Graph synchronized across thousands of users, the system requires a highly tuned Real-Time architecture. A naive Server-Sent Events (SSE) implementation broadcasts every Kafka event to every connected Node.js server. If 1,000 servers are running, a single task update triggers 1,000 network calls (Fan-Out), melting the internal network. Taskinator uses Zero-Fan-Out Targeted Routing."),
        emptyLine(),
        imagePlaceholder("Figure 7.1: Zero-Fan-Out Targeted SSE Routing via Redis"),
        figCaption("Figure 7.1: Targeted Redis Routing for Real-time SSE"),
        emptyLine(),
        body("When a user opens the React frontend for Project A, the WebSocket/SSE connects to Node Server 2. Node Server 2 executes: SADD route:project:A \"Server2\". When an event occurs, the Real-Time Router (a dedicated Kafka consumer) executes SMEMBERS route:project:A. Redis returns [\"Server2\"]. The Router issues a targeted PUBLISH instance:Server2 payload. If SMEMBERS returns an empty array, the Router drops the event instantly."),

        heading2("3.6 Frontend Architecture and State Management"),
        body("Pushing data to the client is only half the battle. If the client simply triggers a full page refetch upon receiving an SSE payload, the database is instantly overwhelmed."),
        emptyLine(),
        imagePlaceholder("Figure 7.2: Apollo Client Cache Reconciliation via SSE"),
        figCaption("Figure 7.2: Apollo Client SSE State Reconciliation Sequence"),
        emptyLine(),
        body("Instead of refetching the hierarchy, the React application listens to the SSE stream directly within the Apollo GraphQL Link architecture. When a payload arrives (e.g., { id: \"Task:123\", status: \"DONE\" }), the client executes cache.modify. This directly injects the mutation into the local in-memory graph. React detects the specific node change and triggers a granular re-render of only that specific Task UI component, preserving O(1) rendering performance on the client."),

        heading2("3.7 Automation and Trigger Engine"),
        body("Taskinator implements a robust project-scoped automation engine utilizing an \"IF-THEN-CLEANUP\" mental model."),
        body("The automation system reacts to domain events (e.g., a task is marked complete) and utilizes asynchronous Kafka processing with a rolling state machine. To ensure system stability and traceability, the engine implements:"),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Correlation IDs: Every triggered automation carries a correlation ID linking it back to the exact user action that initiated the cascade.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "System Actor Isolation: Automations execute under a specific SYSTEM user identity. The system possesses hard gates that prevent consumers from reacting to SYSTEM events unless explicitly configured, completely eliminating infinite recursive automation loops.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Parent Guard Triggers: The engine enforces strict domain rules, such as preventing a Parent Task from entering the 'DONE' status if any of its descendants are in the 'TODO' status. If a user attempts this, the trigger engine immediately reverts the task status and emits an explanatory notification.", size: 22, font: "Times New Roman" })] }),

        heading2("3.8 Testing Methodology"),
        body("The system's reliability under extreme load is guaranteed through a rigorous, multi-tiered testing methodology."),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Unit and Integration Testing: Handled by the Jest framework, validating business logic in isolation and ensuring that individual SQL queries and CTEs perform exactly as intended against a test database container.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Mutation Testing: The system utilizes Stryker Mutator to measure true test efficacy. Instead of merely checking code coverage lines, Stryker actively inserts bugs (mutations) into the source code and verifies that the test suite catches them.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Load Generation: Simulated 10,000 RPS loads were generated to validate the efficacy of the Smart Aggregator and the Outbox Relay, proving that horizontal scaling of the consumer pods successfully mitigates Kafka partition lag.", size: 22, font: "Times New Roman" })] }),

        pageBreak(),

        // ===== CHAPTER 4: RESULTS =====
        heading1("CHAPTER 4"),
        heading1("RESULTS AND DISCUSSION"),

        heading2("4.1 Performance Analysis and Metrics"),
        body("The Taskinator system was subjected to rigorous stress testing to evaluate its performance under conditions simulating extreme enterprise loads. The primary objective was to validate that the Event-Driven Architecture (EDA), pervasive batching, and chunked deletion mechanisms could successfully maintain high responsiveness at a target of 10,000 Requests Per Second (RPS)."),
        body("A customized Apache JMeter test plan was developed, utilizing distributed load generation across multiple worker nodes. The tests simulated thousands of concurrent users executing a mix of read queries (fetching task graphs) and heavy write mutations (creating tasks, linking dependencies, and triggering bulk deletions)."),
        emptyLine(),

        new Paragraph({ spacing: { before: 120, after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Table 8.1: Performance Metrics at 10,000 RPS", bold: true, size: 22, font: "Times New Roman" })] }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2800, 2200, 4226],
          rows: [
            makeTableHeader(["Metric", "Measurement", "Notes"], [2800, 2200, 4226]),
            makeTableRow(["95th Percentile API Latency", "38ms", "Maintained under heavy write load."], [2800, 2200, 4226]),
            makeTableRow(["Database Deadlocks", "0", "Prevented by Chunked Deletion and Optimistic Locking."], [2800, 2200, 4226], true),
            makeTableRow(["Outbox Polling Delay", "< 5ms", "LISTEN/NOTIFY provided near-instant reactivity."], [2800, 2200, 4226]),
            makeTableRow(["Kafka Partition Lag", "< 500ms", "Smart Aggregator efficiently folded massive backlogs."], [2800, 2200, 4226], true),
            makeTableRow(["SSE Fan-Out Ratio", "1:N (Targeted)", "Network saturation completely avoided via Redis routing."], [2800, 2200, 4226]),
          ]
        }),
        emptyLine(),
        body("The results clearly demonstrate the effectiveness of the non-blocking architecture. Despite the massive influx of write requests, the primary GraphQL API Gateway maintained a 95th percentile latency of under 40 milliseconds. This was achieved because the API simply inserts the row and the Outbox event in a single transaction (wCTE) and immediately returns, offloading all subsequent side-effects to the Kafka brokers."),

        heading2("4.2 Optimization Benchmarks"),
        body("To quantify the impact of specific architectural optimizations, localized benchmark tests were conducted comparing the traditional synchronous approach against Taskinator's implemented solutions."),
        emptyLine(),
        new Paragraph({ spacing: { before: 120, after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Table 6.1: Chunked vs Unbounded Deletion Benchmarks", bold: true, size: 22, font: "Times New Roman" })] }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2300, 3200, 3526],
          rows: [
            makeTableHeader(["Deletion Target", "Unbounded CASCADE (Traditional)", "Chunked Self-Signaling (Taskinator)"], [2300, 3200, 3526]),
            makeTableRow(["1,000 Tasks", "145ms DB Lock", "12ms DB Lock (1 chunk)"], [2300, 3200, 3526]),
            makeTableRow(["10,000 Tasks", "2.1s DB Lock (Timeouts Occur)", "~15ms Lock per chunk (5 iterations)"], [2300, 3200, 3526], true),
            makeTableRow(["50,000 Tasks", "> 10s DB Lock (System Failure)", "~15ms Lock per chunk (25 iterations)"], [2300, 3200, 3526]),
          ]
        }),
        emptyLine(),
        body("The Chunked Self-Signaling Deletion mechanism proved absolutely critical. In a traditional unbounded DELETE scenario, removing a project with 50,000 tasks held an exclusive database lock for over 10 seconds, effectively bringing the entire application to a halt and causing cascading transaction timeouts. The chunked approach sliced this massive operation into 25 separate, bounded transactions (2,000 rows each). While the total time to completely purge the data was roughly equivalent, the maximum database lock time never exceeded 15 milliseconds, allowing concurrent operations from other users to process completely unimpeded."),
        body("Similarly, the Smart Batch Aggregator demonstrated immense value in reducing Database Write Amplification."),
        emptyLine(),
        new Paragraph({ spacing: { before: 120, after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Table 4.1: Database Write Amplification Reduction", bold: true, size: 22, font: "Times New Roman" })] }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2800, 2800, 3426],
          rows: [
            makeTableHeader(["Scenario", "Naive Event Processing", "Semantic Folding (Taskinator)"], [2800, 2800, 3426]),
            makeTableRow(["100 Status Updates", "100 UPDATE queries", "100 UPDATE queries (No folding possible)"], [2800, 2800, 3426]),
            makeTableRow(["50 Task Creates", "50 Count Increments", "1 Count Increment (+50)"], [2800, 2800, 3426], true),
            makeTableRow(["Rapid Create/Delete", "50 Inc, 50 Dec", "0 Queries (Net Delta = 0)"], [2800, 2800, 3426]),
          ]
        }),
        emptyLine(),
        body("By semantically folding counter updates in-memory before touching the database, the aggregator successfully reduced write amplification for denormalized counters by over 98% during peak load bursts."),

        heading2("4.3 Discussion and Drawback Mitigation"),
        body("While the architecture successfully achieved its performance targets, it is imperative to discuss the inherent drawbacks introduced by these design choices."),

        heading3("The Cost of Eventual Consistency"),
        body("The most significant trade-off in Taskinator's architecture is the adoption of Eventual Consistency. Because denormalized fields (like project.task_count or cached user avatars on task rows) are updated asynchronously via the Kafka pipeline, there is a propagation delay between the primary database write and the subsequent background updates."),
        body("During the 10,000 RPS load tests, this propagation delay peaked at approximately 800 milliseconds. From a user experience perspective, this means that if a user rapidly creates five tasks, the counter on their Project Dashboard might temporarily read \"0\" before jumping to \"5\" nearly a second later."),

        heading3("Mitigation Strategies"),
        body("To mask this propagation delay from the user, Taskinator relies heavily on the React frontend. The Apollo Client is configured to use Optimistic UI Updates. When the user creates a task, the GraphQL mutation is dispatched to the server, but the frontend immediately updates its local, in-memory cache, artificially incrementing the project counter before the server even responds."),
        body("By the time the backend database achieves global consistency and the Redis Server-Sent Event (SSE) pushes the finalized data back to the client, the UI has already reflected the correct state. This synthesis of eventual backend consistency with optimistic frontend state reconciliation provides the illusion of instantaneous, strong consistency to the end-user while preserving the massive throughput capabilities of the backend infrastructure."),

        pageBreak(),

        // ===== CHAPTER 5: CONCLUSION =====
        heading1("CHAPTER 5"),
        heading1("CONCLUSION AND FUTURE WORK"),

        heading2("5.1 Conclusion"),
        body("The demand for modern, highly interactive project orchestration tools requires a fundamental shift away from traditional, monolithic, synchronous architectures. This thesis presented the comprehensive design, implementation, and rigorous evaluation of Taskinator, a full-stack workflow orchestration engine built to sustain extreme concurrency."),
        body("By deliberately prioritizing Availability and Partition Tolerance (AP) over strict consistency, the system successfully managed simulated loads of 10,000 Requests Per Second. This was achieved through deep, synergistic optimizations across the entire technology stack:"),

        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "At the Database Layer: The implementation of Custom Closure Tables enabled instantaneous, O(1) graph reachability queries for infinitely nested task hierarchies. Optimistic Locking using version columns completely eradicated distributed race conditions without relying on debilitating pessimistic read locks.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "At the Event-Driven Pipeline: The Transactional Outbox pattern, optimized with PostgreSQL wCTEs and SKIP LOCKED concurrent polling, guaranteed atomic, zero-loss event publishing.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "At the Consumer Layer: The Smart Batch Aggregator fundamentally altered how background processes interact with the database, utilizing in-memory semantic folding to reduce write amplification by up to 98%. Furthermore, the novel Chunked Self-Signaling Deletion mechanism proved that unbounded hierarchical cascading deletes can be safely transformed into bounded, asynchronous loops, protecting the database from catastrophic lock contention.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "At the Real-Time Layer: The zero-fan-out targeted routing strategy utilizing Redis Pub/Sub proved that real-time Server-Sent Events can be scaled to thousands of clients without saturating internal network bandwidth.", size: 22, font: "Times New Roman" })] }),

        body("Taskinator proves that by combining strictly enforced non-blocking data patterns, intelligent consumer-side semantic folding, and highly reactive frontend caching, complex orchestration tools can achieve massive, enterprise-grade scalability."),

        heading2("5.2 Future Work"),
        body("While the current architecture provides a robust foundation, several avenues exist for future enhancement:"),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "In-Memory Database Layer: To push throughput beyond 50,000 RPS, future iterations could explore integrating an in-memory datastore (like Redis or Memcached) as the primary write target for specific high-frequency metrics, flushing to persistent PostgreSQL disk storage asynchronously.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Advanced Automation Engine Capabilities: Expanding the \"IF-THEN-CLEANUP\" engine to support cross-project automations and integrations with external webhooks, requiring more sophisticated distributed tracing mechanisms to debug complex event cascades.", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Machine Learning Integration: Utilizing the vast dataset generated by the task reachability graph to train predictive models capable of estimating project completion timelines and identifying critical path bottlenecks automatically.", size: 22, font: "Times New Roman" })] }),

        pageBreak(),

        // ===== REFERENCES =====
        heading1("REFERENCES"),
        emptyLine(),
        body("1. Kleppmann, M. (2017). Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems. O'Reilly Media. https://learning.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/"),
        body("2. Richardson, C. (2018). Microservices Patterns: With examples in Java. Manning Publications. https://www.manning.com/books/microservices-patterns"),
        body("3. Celko, J. (2012). Joe Celko's Trees and Hierarchies in SQL for Smarties (2nd ed.). Morgan Kaufmann. https://doi.org/10.1016/B978-0-12-387733-8.00001-X"),
        body("4. Brewer, E. A. (2000). Towards robust distributed systems. Proceedings of the Nineteenth Annual ACM Symposium on Principles of Distributed Computing - PODC '00. https://doi.org/10.1145/343477.343502"),
        body("5. PostgreSQL Global Development Group. (2024). PostgreSQL 16 Documentation: Concurrency Control and SKIP LOCKED. https://www.postgresql.org/docs/16/mvcc.html"),
        body("6. Apache Software Foundation. (2024). Apache Kafka Documentation: Log Partitioning and Message Ordering. https://kafka.apache.org/documentation/#intro_concepts_and_terms"),
        body("7. GraphQL Foundation. (2021). GraphQL Specification: Subscriptions and Real-Time Data Updates. https://spec.graphql.org/October2021/#sec-Subscription"),
        body("8. Meta Platforms, Inc. (2024). React Documentation: Concurrent Mode and Optimistic UI. https://react.dev/reference/react/useOptimistic"),
        body("9. Apollo GraphQL. (2024). Apollo Client Documentation: Normalized In-Memory Cache and cache.modify(). https://www.apollographql.com/docs/react/caching/cache-interaction/#cachemodify"),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/taskinator_thesis.docx", buffer);
  console.log("Done!");
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
