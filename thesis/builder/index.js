const { Document, Packer, LevelFormat, AlignmentType, Footer, Paragraph, TextRun, PageNumber } = require('docx');
const fs = require('fs');
const { F, pageBreak } = require('./utils');

const getCover = require('./sections/00_cover');
const getDeclarationAndCertificate = require('./sections/01_declaration_certificate');
const getAbstractAndAck = require('./sections/02_abstract_ack');
const getListsAndTOC = require('./sections/03_lists_toc');
const getChapter1_1 = require('./sections/04_chapter_1_1_problem_overview');
const getChapter1_2 = require('./sections/04_chapter_1_2_hardware_software_specs');
const getChapter2_1 = require('./sections/05_chapter_2_1_research_gaps');
const getChapter2_2 = require('./sections/05_chapter_2_2_summary');
const getChapter2_3 = require('./sections/05_chapter_2_3_theory_dags');
const getChapter2_4 = require('./sections/05_chapter_2_4_theory_btrees');
const getChapter2_5 = require('./sections/05_chapter_2_5_distributed_theory');
const getChapter3_1 = require('./sections/06_chapter_3_1_architecture');
const getChapter3_2 = require('./sections/06_chapter_3_2_domain_modeling');
const getChapter3_3 = require('./sections/06_chapter_3_3_database_optimization');
const getChapter3_4 = require('./sections/06_chapter_3_4_data_dictionary_1');
const getChapter3_5 = require('./sections/06_chapter_3_5_data_dictionary_2');
const getChapter3_6 = require('./sections/06_chapter_3_6_graphql_api_1');
const getChapter3_7 = require('./sections/06_chapter_3_7_graphql_api_2');
const getChapter3_8 = require('./sections/06_chapter_3_8_kysely_code_listing');
const getChapter3_9 = require('./sections/06_chapter_3_9_edge_identity');
const getChapter4_1 = require('./sections/07_chapter_4_1_wcte_outbox');
const getChapter4_2 = require('./sections/07_chapter_4_2_skip_locked');
const getChapter4_3 = require('./sections/07_chapter_4_3_smart_aggregator');
const getChapter4_4 = require('./sections/07_chapter_4_4_chunked_deletion');
const getChapter4_5 = require('./sections/07_chapter_4_5_smart_agg_code_listing');
const getChapter4_6 = require('./sections/07_chapter_4_6_driver_batching');
const getChapter4_7 = require('./sections/07_chapter_4_7_e2e_trace');
const getChapter5_1 = require('./sections/08_chapter_5_1_atomic_authorization');
const getChapter5_2 = require('./sections/08_chapter_5_2_team_inheritance');
const getChapter5_3 = require('./sections/08_chapter_5_3_team_management');
const getChapter5_4 = require('./sections/08_chapter_5_4_optimistic_concurrency');
const getChapter6_1 = require('./sections/09_chapter_6_1_react_d3');
const getChapter6_2 = require('./sections/09_chapter_6_2_redis_routing');
const getChapter6_3 = require('./sections/09_chapter_6_3_apollo_cache');
const getChapter6_4 = require('./sections/09_chapter_6_4_react_code_listing');
const getChapter7_1 = require('./sections/10_chapter_7_1_testcontainers');
const getChapter7_2 = require('./sections/10_chapter_7_2_mutation_testing');
const getChapter7_3 = require('./sections/10_chapter_7_3_performance');
const getChapter3_10 = require('./sections/06_chapter_3_10_task_graph_design');
const getChapter3_11 = require('./sections/06_chapter_3_11_protocols');
const getChapter4_8 = require('./sections/07_chapter_4_8_outbox_relay_deep_dive');
const getChapter5_5 = require('./sections/08_chapter_5_5_event_orchestration');
const getChapter5_6 = require('./sections/08_chapter_5_6_data_lifecycle_flows');
const getChapter6_5 = require('./sections/09_chapter_6_5_targeted_realtime');
const getChapter6_6 = require('./sections/09_chapter_6_6_security');
const getChapter7_4 = require('./sections/10_chapter_7_4_infrastructure');
const getChapter7_5 = require('./sections/10_chapter_7_5_scaling_analysis');
const getChapter11 = require('./sections/11_chapter_11_deployment');
const getChapter12 = require('./sections/11_chapter_12_devexp');
const getChapter13 = require('./sections/11_chapter_13_disaster');
const getChapter8 = require('./sections/11_chapter_8_conclusion');
const getChapter8_2 = require('./sections/11_chapter_8_2_future_work');
const getChapter9 = require('./sections/11_chapter_9_comparative_analysis');
const getChapter10 = require('./sections/11_chapter_10_frontend_ux');
const getReferences = require('./sections/12_references');
const getAppendix = require('./sections/13_appendix');

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
      ...getChapter2_3(),
      ...getChapter2_4(),
      ...getChapter2_5(),
      ...getChapter3_1(),
      ...getChapter3_2(),
      ...getChapter3_3(),
      ...getChapter3_4(),
      ...getChapter3_5(),
      ...getChapter3_6(),
      ...getChapter3_7(),
      ...getChapter3_8(),
      ...getChapter3_9(),
      ...getChapter3_10(),
      ...getChapter3_11(),
      ...getChapter4_1(),
      ...getChapter4_2(),
      ...getChapter4_3(),
      ...getChapter4_4(),
      ...getChapter4_5(),
      ...getChapter4_6(),
      ...getChapter4_7(),
      ...getChapter4_8(),
      ...getChapter5_1(),
      ...getChapter5_2(),
      ...getChapter5_3(),
      ...getChapter5_4(),
      ...getChapter5_5(),
      ...getChapter5_6(),
      ...getChapter6_1(),
      ...getChapter6_2(),
      ...getChapter6_3(),
      ...getChapter6_4(),
      ...getChapter6_5(),
      ...getChapter6_6(),
      ...getChapter7_1(),
      ...getChapter7_2(),
      ...getChapter7_3(),
      ...getChapter7_4(),
      ...getChapter7_5(),
      ...getChapter11(),
      ...getChapter12(),
      ...getChapter13(),
      ...getChapter8(),
      ...getChapter8_2(),
      ...getChapter9(),
      ...getChapter10(),
      ...getReferences(),
      ...getAppendix(),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(__dirname + "/taskinator_thesis_v2.docx", buf);
  console.log("Done! Written to", __dirname + "/taskinator_thesis_v2.docx");
}).catch(e => { console.error(e); process.exit(1); });
