import { createMiddleware } from "hono/factory";
import { verifyJwtToken } from "../util/jwt";
import { Bindings, Variables } from "../util/env";

export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, nxt) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.split(" ")[1]; //Bearer <token>

  if (!token) return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyJwtToken({ token });
  if (payload == null || !payload.sub)
    return c.json({ success: false, message: "Invalid token" }, 401);

  c.set("identity", payload);
  await nxt();
});
