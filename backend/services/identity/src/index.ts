import { Hono } from "hono";
import publicRoute from "./routes/user-facing";
import { Bindings } from "./util/env";
import { contextStorage } from "hono/context-storage";
const app = new Hono<{
  Bindings: Bindings;
}>();

app.use("*", contextStorage()); // This "saves" the context for this request only

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: Date.now(),
  });
});

app.route("/api/v1/public", publicRoute);

export default app;
