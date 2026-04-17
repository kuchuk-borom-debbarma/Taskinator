import React from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { scenes } from "./architecture-data";

const palette = {
  bg: "#08111f",
  bg2: "#132943",
  panel: "rgba(11, 23, 39, 0.88)",
  panelSoft: "rgba(20, 38, 62, 0.78)",
  text: "#eff6ff",
  muted: "#9eb2c9",
  cyan: "#67e8f9",
  blue: "#60a5fa",
  green: "#86efac",
  gold: "#facc15",
  red: "#fb7185",
};

const sceneStart = (id: string) => {
  let acc = 0;
  for (const scene of scenes) {
    if (scene.id === id) return acc;
    acc += scene.frames;
  }
  return 0;
};

const shellStyle: React.CSSProperties = {
  padding: 64,
  color: palette.text,
  fontFamily:
    '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
};

const Background: React.FC<{ frame: number }> = ({ frame }) => {
  const drift = interpolate(frame, [0, 900], [0, -120], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 20% 20%, rgba(96,165,250,0.20), transparent 30%),
          radial-gradient(circle at 80% 15%, rgba(250,204,21,0.10), transparent 20%),
          radial-gradient(circle at 70% 80%, rgba(103,232,249,0.18), transparent 30%),
          linear-gradient(135deg, ${palette.bg} 0%, ${palette.bg2} 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -120,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: `translateY(${drift}px) rotate(-6deg) scale(1.15)`,
          opacity: 0.45,
        }}
      />
    </AbsoluteFill>
  );
};

const SceneText: React.FC<{
  eyebrow: string;
  title: string;
  body: string;
  frame: number;
}> = ({ eyebrow, title, body, frame }) => {
  const { fps } = useVideoConfig();
  const rise = spring({
    fps,
    frame,
    config: { damping: 16, stiffness: 120, mass: 0.7 },
  });

  return (
    <div
      style={{
        width: 760,
        transform: `translateY(${interpolate(rise, [0, 1], [50, 0])}px)`,
        opacity: rise,
      }}
    >
      <div
        style={{
          color: palette.cyan,
          textTransform: "uppercase",
          letterSpacing: 4,
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontSize: 78,
          lineHeight: 1.02,
          whiteSpace: "pre-line",
          fontWeight: 800,
          letterSpacing: -2.5,
          marginBottom: 28,
          textWrap: "balance",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 30,
          lineHeight: 1.35,
          color: palette.muted,
          maxWidth: 720,
        }}
      >
        {body}
      </div>
    </div>
  );
};

const Card: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle?: string;
  accent?: string;
  frame: number;
  delay?: number;
  children?: React.ReactNode;
}> = ({ x, y, w, h, title, subtitle, accent = palette.blue, frame, delay = 0, children }) => {
  const { fps } = useVideoConfig();
  const enter = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 18, stiffness: 150, mass: 0.9 },
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: palette.panel,
        border: `1px solid ${accent}55`,
        boxShadow: `0 30px 90px ${accent}18`,
        borderRadius: 28,
        padding: 24,
        transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px) scale(${interpolate(
          enter,
          [0, 1],
          [0.96, 1],
        )})`,
        opacity: enter,
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          width: 54,
          height: 5,
          borderRadius: 999,
          background: accent,
          marginBottom: 18,
        }}
      />
      <div style={{ fontSize: 28, fontWeight: 750, lineHeight: 1.08 }}>{title}</div>
      {subtitle ? (
        <div
          style={{
            marginTop: 12,
            color: palette.muted,
            fontSize: 18,
            lineHeight: 1.35,
            whiteSpace: "pre-line",
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {children}
    </div>
  );
};

const Pill: React.FC<{
  text: string;
  color: string;
  frame: number;
  delay?: number;
  x: number;
  y: number;
}> = ({ text, color, frame, delay = 0, x, y }) => {
  const { fps } = useVideoConfig();
  const enter = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 20, stiffness: 170 },
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        padding: "14px 22px",
        borderRadius: 999,
        border: `1px solid ${color}66`,
        background: `${color}18`,
        color,
        fontSize: 22,
        fontWeight: 700,
        transform: `scale(${interpolate(enter, [0, 1], [0.75, 1])})`,
        opacity: enter,
      }}
    >
      {text}
    </div>
  );
};

const Arrow: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  frame: number;
  delay?: number;
  label?: string;
}> = ({ x1, y1, x2, y2, color, frame, delay = 0, label }) => {
  const { fps } = useVideoConfig();
  const enter = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 18, stiffness: 130 },
  });
  const draw = interpolate(enter, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const length = Math.hypot(dx, dy) * draw;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x1,
          top: y1,
          width: length,
          height: 4,
          background: color,
          borderRadius: 999,
          transformOrigin: "left center",
          transform: `rotate(${angle}rad)`,
          boxShadow: `0 0 18px ${color}`,
          opacity: 0.95,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x1 + Math.cos(angle) * length - 12,
          top: y1 + Math.sin(angle) * length - 12,
          width: 0,
          height: 0,
          borderTop: "12px solid transparent",
          borderBottom: "12px solid transparent",
          borderLeft: `20px solid ${color}`,
          transform: `rotate(${angle}rad)`,
          opacity: enter,
        }}
      />
      {label ? (
        <div
          style={{
            position: "absolute",
            left: (x1 + x2) / 2 - 80,
            top: (y1 + y2) / 2 - 36,
            color,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1,
            opacity: enter,
          }}
        >
          {label}
        </div>
      ) : null}
    </>
  );
};

const ModuleScene: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <>
      <Card x={930} y={110} w={280} h={182} title="Project" subtitle="ownership\nmembership\nproject lifecycle" accent={palette.blue} frame={frame} />
      <Card x={1240} y={110} w={280} h={182} title="Team" subtitle="grouping\nteam members\nteam cleanup" accent={palette.green} frame={frame} delay={4} />
      <Card x={930} y={330} w={280} h={182} title="Task" subtitle="task CRUD\nlinks / DAG\nrealtime signals" accent={palette.gold} frame={frame} delay={8} />
      <Card x={1240} y={330} w={280} h={182} title="Automation" subtitle="batched triggers\nrule dispatch\ndepth tracking" accent={palette.red} frame={frame} delay={12} />
      <Card x={930} y={550} w={280} h={182} title="Auth" subtitle="signup flow\nmiddleware\nuser creation events" accent={palette.cyan} frame={frame} delay={16} />
      <Card x={1240} y={550} w={280} h={182} title="Notifications" subtitle="internal + external\nrequested -> created" accent={palette.blue} frame={frame} delay={20} />
      <Card
        x={1090}
        y={800}
        w={360}
        h={140}
        title="Shared Backbone"
        subtitle="Kafka topics\nOutbox relay\nRedis bridge\nGraphQL pubsub"
        accent={palette.cyan}
        frame={frame}
        delay={24}
      />
    </>
  );
};

const WritePathScene: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <>
      <Pill text="Browser / Client" color={palette.cyan} frame={frame} x={960} y={140} />
      <Pill text="REST + GraphQL" color={palette.blue} frame={frame} x={1190} y={140} delay={4} />
      <Pill text="TaskServiceImpl" color={palette.gold} frame={frame} x={1470} y={140} delay={8} />
      <Arrow x1={1110} y1={170} x2={1180} y2={170} color={palette.cyan} frame={frame} delay={4} />
      <Arrow x1={1350} y1={170} x2={1460} y2={170} color={palette.blue} frame={frame} delay={8} />

      <Card
        x={950}
        y={250}
        w={720}
        h={265}
        title="Single SQL Mutation"
        subtitle={
          "WITH updated_task AS (...),\ninserted_outbox AS (...)\nSELECT ...\n\nBusiness data and durable outbox rows are persisted together."
        }
        accent={palette.green}
        frame={frame}
        delay={12}
      />

      <Card
        x={940}
        y={560}
        w={270}
        h={150}
        title="Postgres"
        subtitle="project_task\nproject / team tables"
        accent={palette.blue}
        frame={frame}
        delay={18}
      />
      <Card
        x={1230}
        y={560}
        w={270}
        h={150}
        title="Outbox"
        subtitle="status=PENDING\nkafka_topic\npayload"
        accent={palette.red}
        frame={frame}
        delay={22}
      />
      <Card
        x={1520}
        y={560}
        w={220}
        h={150}
        title="Relay"
        subtitle="poll\nbatch\npublish"
        accent={palette.cyan}
        frame={frame}
        delay={26}
      />
      <Arrow x1={1110} y1={510} x2={1075} y2={555} color={palette.green} frame={frame} delay={18} />
      <Arrow x1={1310} y1={510} x2={1365} y2={555} color={palette.green} frame={frame} delay={22} />
      <Arrow x1={1495} y1={635} x2={1510} y2={635} color={palette.red} frame={frame} delay={26} label="publish batch" />
    </>
  );
};

const DualLaneScene: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <>
      <Card
        x={930}
        y={170}
        w={300}
        h={170}
        title="Task Update"
        subtitle="version check\nauth check\nreturn updated row"
        accent={palette.gold}
        frame={frame}
      />
      <Card
        x={1290}
        y={110}
        w={330}
        h={180}
        title="Display Lane"
        subtitle="event: project.task.updated\npurpose: keep UI fresh"
        accent={palette.cyan}
        frame={frame}
        delay={8}
      />
      <Card
        x={1290}
        y={360}
        w={330}
        h={210}
        title="Logic Lane"
        subtitle="event: automation.trigger.task\ncontains oldState + newState\nplus correlationId + depth"
        accent={palette.red}
        frame={frame}
        delay={12}
      />
      <Card
        x={1345}
        y={670}
        w={280}
        h={150}
        title="AutomationListener"
        subtitle="50ms buffer\n100-event batch\n3 bulk rule queries"
        accent={palette.green}
        frame={frame}
        delay={18}
      />
      <Arrow x1={1225} y1={255} x2={1280} y2={200} color={palette.cyan} frame={frame} delay={8} label="UI lane" />
      <Arrow x1={1225} y1={255} x2={1280} y2={450} color={palette.red} frame={frame} delay={12} label="logic lane" />
      <Arrow x1={1455} y1={570} x2={1480} y2={665} color={palette.green} frame={frame} delay={18} />
      <Pill text="Same mutation, specialized internal consequences" color={palette.gold} frame={frame} x={980} y={900} delay={20} />
    </>
  );
};

const RealtimeScene: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <>
      <Card x={930} y={150} w={250} h={150} title="Kafka Event" subtitle="task.updated\nnotification.created" accent={palette.gold} frame={frame} />
      <Card x={1240} y={150} w={300} h={170} title="RealtimeRouterConsumer" subtitle="single static group id\nonly one node routes each event" accent={palette.cyan} frame={frame} delay={8} />
      <Card x={1580} y={150} w={240} h={160} title="Redis Sets" subtitle="route:user:* \nroute:project:*" accent={palette.green} frame={frame} delay={12} />
      <Card x={1240} y={430} w={300} h={170} title="instance:{ID}" subtitle="targeted Redis publish\nonly active nodes receive" accent={palette.red} frame={frame} delay={18} />
      <Card x={1580} y={430} w={240} h={160} title="Redis Bridge" subtitle="subscribe local channel\npush to local pubsub" accent={palette.blue} frame={frame} delay={22} />
      <Card x={1455} y={730} w={280} h={170} title="GraphQL SSE" subtitle="yield TaskCreated / TaskUpdated / TaskDeleted / InternalNotification" accent={palette.cyan} frame={frame} delay={28} />

      <Arrow x1={1180} y1={225} x2={1230} y2={225} color={palette.gold} frame={frame} delay={8} />
      <Arrow x1={1540} y1={235} x2={1570} y2={235} color={palette.green} frame={frame} delay={12} label="SMEMBERS" />
      <Arrow x1={1390} y1={320} x2={1390} y2={420} color={palette.red} frame={frame} delay={18} label="publish instance payload" />
      <Arrow x1={1540} y1={510} x2={1570} y2={510} color={palette.blue} frame={frame} delay={22} />
      <Arrow x1={1700} y1={590} x2={1595} y2={730} color={palette.cyan} frame={frame} delay={28} />
      <Pill text="No active listeners? Event is dropped early." color={palette.green} frame={frame} x={1030} y={920} delay={24} />
    </>
  );
};

const AutomationScene: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <>
      <Card x={930} y={170} w={300} h={170} title="Trigger Batch" subtitle="taskIds\nprojectIds\nteamIds" accent={palette.red} frame={frame} />
      <Card x={1270} y={120} w={230} h={150} title="Task Rules" subtitle="query by task ids" accent={palette.gold} frame={frame} delay={6} />
      <Card x={1530} y={120} w={230} h={150} title="Team Rules" subtitle="query by team ids" accent={palette.green} frame={frame} delay={10} />
      <Card x={1270} y={320} w={230} h={150} title="Project Rules" subtitle="query by project ids" accent={palette.cyan} frame={frame} delay={14} />
      <Card x={1530} y={320} w={230} h={180} title="dispatchRules()" subtitle="evaluate conditions\nresolve actions\ncarry correlation + depth" accent={palette.blue} frame={frame} delay={18} />
      <Card x={1370} y={600} w={350} h={170} title="Recursion Safety" subtitle="events carry origin context\nsystem actions can be recognized\nloops can be bounded" accent={palette.red} frame={frame} delay={24} />

      <Arrow x1={1230} y1={255} x2={1260} y2={190} color={palette.gold} frame={frame} delay={6} />
      <Arrow x1={1230} y1={255} x2={1520} y2={190} color={palette.green} frame={frame} delay={10} />
      <Arrow x1={1230} y1={255} x2={1260} y2={395} color={palette.cyan} frame={frame} delay={14} />
      <Arrow x1={1500} y1={195} x2={1530} y2={395} color={palette.blue} frame={frame} delay={18} />
      <Arrow x1={1645} y1={500} x2={1550} y2={595} color={palette.red} frame={frame} delay={24} />
    </>
  );
};

const DeleteScene: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <>
      <Card x={930} y={150} w={260} h={150} title="deleteTasks()" subtitle="DELETE FROM project_task\nRETURNING *" accent={palette.gold} frame={frame} />
      <Card x={1240} y={150} w={290} h={170} title="Outbox Event" subtitle="project.task.deleted\npayload includes task snapshot" accent={palette.red} frame={frame} delay={6} />
      <Card x={1570} y={150} w={270} h={170} title="Realtime Consumer" subtitle="route to project viewers\nemit task_deleted" accent={palette.cyan} frame={frame} delay={10} />

      <Card x={1090} y={430} w={320} h={170} title="Task Links / DAG" subtitle="current code notes link cleanup is handled separately\nlegacy recursive task cleanup listener is disabled" accent={palette.green} frame={frame} delay={16} />
      <Card x={1450} y={430} w={360} h={190} title="Architecture Evolution" subtitle="Docs still describe a materialized-path sweeper for recursive child deletion.\nCurrent listener logs that this legacy path is disabled." accent={palette.blue} frame={frame} delay={20} />

      <Arrow x1={1190} y1={225} x2={1230} y2={225} color={palette.gold} frame={frame} delay={6} />
      <Arrow x1={1530} y1={235} x2={1560} y2={235} color={palette.red} frame={frame} delay={10} />
      <Pill text="Video reflects code + docs, and explicitly marks the mismatch." color={palette.cyan} frame={frame} x={1100} y={880} delay={24} />
    </>
  );
};

const SummaryBadges: React.FC<{ frame: number }> = ({ frame }) => {
  const badges = [
    { text: "Atomic SQL + Outbox", color: palette.green },
    { text: "Kafka Topic Partitioning", color: palette.gold },
    { text: "Redis Targeted Routing", color: palette.cyan },
    { text: "Batched Automation", color: palette.red },
  ];

  return (
    <>
      {badges.map((badge, index) => (
        <Pill
          key={badge.text}
          text={badge.text}
          color={badge.color}
          frame={frame}
          delay={index * 4}
          x={980 + (index % 2) * 330}
          y={360 + Math.floor(index / 2) * 110}
        />
      ))}
    </>
  );
};

const SceneVisuals: React.FC<{ sceneId: string; frame: number }> = ({ sceneId, frame }) => {
  switch (sceneId) {
    case "modules":
      return <ModuleScene frame={frame} />;
    case "write-path":
      return <WritePathScene frame={frame} />;
    case "dual-lane":
      return <DualLaneScene frame={frame} />;
    case "realtime":
      return <RealtimeScene frame={frame} />;
    case "automation":
      return <AutomationScene frame={frame} />;
    case "delete-task":
      return <DeleteScene frame={frame} />;
    case "summary":
      return <SummaryBadges frame={frame} />;
    default:
      return (
        <>
          <Pill text="Modular Monolith" color={palette.cyan} frame={frame} x={980} y={360} />
          <Pill text="Event-Driven Backbone" color={palette.gold} frame={frame} x={1280} y={360} delay={4} />
          <Pill text="Realtime + Automation" color={palette.green} frame={frame} x={1110} y={480} delay={8} />
        </>
      );
  }
};

const Scene: React.FC<{
  eyebrow: string;
  title: string;
  body: string;
  sceneId: string;
}> = ({ eyebrow, title, body, sceneId }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ ...shellStyle, opacity: fadeOut }}>
      <SceneText eyebrow={eyebrow} title={title} body={body} frame={frame} />
      <SceneVisuals sceneId={sceneId} frame={frame} />
    </AbsoluteFill>
  );
};

export const MyComposition: React.FC = () => {
  const currentFrame = useCurrentFrame();
  const activeScenes = scenes.filter((scene) => currentFrame >= sceneStart(scene.id));
  const activeScene = activeScenes[activeScenes.length - 1] ?? scenes[0];

  return (
    <AbsoluteFill>
      <Background frame={currentFrame} />
      {scenes.reduce<React.ReactNode[]>((acc, scene, index) => {
        const from = scenes.slice(0, index).reduce((sum, item) => sum + item.frames, 0);
        acc.push(
          <Sequence key={scene.id} from={from} durationInFrames={scene.frames}>
            <Scene
              eyebrow={scene.eyebrow}
              title={scene.title}
              body={scene.body}
              sceneId={scene.id}
            />
          </Sequence>,
        );
        return acc;
      }, [])}

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          padding: "40px 64px",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#dbeafe",
            fontSize: 20,
            textTransform: "uppercase",
            letterSpacing: 3,
            opacity: 0.9,
          }}
        >
          <div>Taskinator Architecture Film</div>
          <div>{activeScene?.eyebrow}</div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            alignSelf: "center",
            marginBottom: 24,
          }}
        >
          {scenes.map((scene) => {
            const start = sceneStart(scene.id);
            const end = start + scene.frames;
            const active = currentFrame >= start && currentFrame < end;
            return (
              <div
                key={scene.id}
                style={{
                  width: active ? 96 : 42,
                  height: 8,
                  borderRadius: 999,
                  background: active ? palette.cyan : "rgba(255,255,255,0.18)",
                }}
              />
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
