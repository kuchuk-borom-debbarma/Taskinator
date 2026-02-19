import { OpenAPIHono } from "@hono/zod-openapi";
import publicRoute from "./routes/user-facing";
import { Bindings, Variables } from "./util/env";
import { contextStorage } from "hono/context-storage";
import { Scalar } from "@scalar/hono-api-reference";
import { createYogaInstance } from "./graphql";
import { authMiddleware, optionalAuthMiddleware } from "./middlewares/auth";

const app = new OpenAPIHono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

app.use("*", contextStorage()); // This "saves" the context for this request only

app.onError((err, c) => {
  console.error("Hono Error:", err);
  if (err.cause) {
    console.error("Error Cause:", err.cause);
  }
  return c.json({
    success: false,
    message: err.message || "Internal Server Error",
  }, 500);
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: Date.now(),
  });
});

app.route("/api/v1/public", publicRoute);

// GraphQL Subgraph
app.use("/graphql", optionalAuthMiddleware);
app.all("/graphql", (c) => {
  const yoga = createYogaInstance(c.env);
  return yoga.handle(c.req.raw, { honoContext: c });
});

// OpenAPI Documentation
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Identity Service API",
    description: "Authentication and User Management Service",
  },
});

// Interactive API Reference
app.get(
  "/reference",
  Scalar({
    spec: {
      url: "/doc",
    },
  } as any),
);

// Add Security Scheme
app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

export default app;