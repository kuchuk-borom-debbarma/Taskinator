const { Paragraph, TextRun } = require('docx');
const { h2, h3, body, emptyLine, insertImage, figCaption, F } = require('../utils');

module.exports = function getChapter8_2() {
  return [
    h2("8.2 Future Roadmap and Research Trajectory"),
    body("While the current iteration of the Taskinator platform provides a robust and high-performance foundation for project orchestration, several advanced research avenues remain open for exploration. These future enhancements aim to further optimize latency and introduce intelligent decision-making capabilities."),

    h3("8.2.1 AI-Driven Proactive Task Graph Optimization"),
    body("Future versions will incorporate Large Language Models (LLMs) to analyze the Task Graph and suggest optimizations. For example, the system could identify 'Bottleneck Tasks'—nodes that frequently block entire subgraphs—and suggest parallelization strategies or resource reallocation to project managers."),

    h3("8.2.2 Edge-Compute Trigger Execution"),
    body("To further reduce latency, we aim to offload 'Pure Triggers' (automations that do not require complex database lookups) to the Cloudflare Edge tier. By executing business logic in V8 isolates at the network perimeter, the system could provide sub-10ms response times for simple status updates and validation checks, completely bypassing the internal backbone for certain operation classes."),

    h3("8.2.3 Conflict-Free Replicated Data Types (CRDTs)"),
    body("As the platform expands to support offline-first mobile clients, the integration of CRDTs for collaborative document and task editing will become essential. This would allow multiple users to edit the same entity concurrently without ever experiencing merge conflicts, as the mathematical properties of CRDTs guarantee eventual convergence to the same state across all distributed instances."),

    h3("8.2.4 Final Concluding Remarks"),
    body("In conclusion, Taskinator represents a significant advancement in the design of high-throughput, event-driven orchestration systems. By combining the safety of transactional relational databases with the scalability of partitioned event streams and reactive frontends, the platform successfully addresses the complex challenges of modern project management at scale. The architectural patterns documented in this thesis serve as a blueprint for the next generation of resilient, collaborative, and hyper-reactive enterprise applications."),
  ];
};
