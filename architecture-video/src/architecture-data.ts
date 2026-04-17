export type TimelineScene = {
  id: string;
  title: string;
  eyebrow: string;
  body: string;
  frames: number;
};

export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

export const scenes: TimelineScene[] = [
  {
    id: "intro",
    eyebrow: "Taskinator v2",
    title: "Modular Monolith\nWith Event-Driven Reflexes",
    body:
      "A single deployable backend composed of focused domain modules, durable outbox publishing, batched automation, and targeted realtime fan-out.",
    frames: 90,
  },
  {
    id: "modules",
    eyebrow: "Bounded Modules",
    title: "Domain Logic Lives Inside One Process",
    body:
      "Project, Team, Task, Automation, Auth, and Notification modules boot together, but communicate through events and dedicated listeners instead of tight direct coupling.",
    frames: 120,
  },
  {
    id: "write-path",
    eyebrow: "Fast Write Path",
    title: "Requests Enter Through REST / GraphQL,\nThen Hit SQL + Outbox Atomically",
    body:
      "Mutations perform business writes and outbox inserts in the same SQL statement, so data changes and durable event emission stay in lockstep.",
    frames: 120,
  },
  {
    id: "dual-lane",
    eyebrow: "Task Update Flow",
    title: "One Update, Two Internal Lanes",
    body:
      "The task module emits a display lane for immediate UI freshness and a logic lane for automation evaluation, both correlated by the same mutation context.",
    frames: 120,
  },
  {
    id: "realtime",
    eyebrow: "Realtime Routing",
    title: "Kafka Finds The Event.\nRedis Finds The Right Node.",
    body:
      "A single router consumer looks up active project or user subscriptions in Redis and publishes only to instances that actually hold live SSE connections.",
    frames: 120,
  },
  {
    id: "automation",
    eyebrow: "Automation Engine",
    title: "Rules Are Fetched In Bulk,\nThen Evaluated In Batches",
    body:
      "Automation triggers are buffered, grouped, and resolved against task-, team-, and project-scoped rules before dispatching actions with depth and correlation tracking.",
    frames: 120,
  },
  {
    id: "delete-task",
    eyebrow: "Example Flow",
    title: "Delete Task: Current Path And Architectural Evolution",
    body:
      "Today the task row is deleted directly and `project.task.deleted` fans out to UI and downstream consumers. Older docs describe a recursive sweeper for child cleanup, but the current listener marks that legacy path as disabled.",
    frames: 120,
  },
  {
    id: "summary",
    eyebrow: "Why It Works",
    title: "Throughput Comes From\nDecoupling Without Fragmenting",
    body:
      "Taskinator keeps one codebase, one deployable, and one local programming model, while still adopting outbox reliability, event fan-out, batching, and selective realtime delivery.",
    frames: 90,
  },
];

export const totalDuration = scenes.reduce((sum, scene) => sum + scene.frames, 0);
