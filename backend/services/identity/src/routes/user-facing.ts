import { Hono } from "hono";
import { Bindings } from "../util/env";
import { zValidator } from "@hono/zod-validator";
import * as z from "zod";
import { authService, notiService } from "../services";
import { User } from "../services/auth/IAuthService";
import { auth } from "hono/utils/basic-auth";
import { verifyPassword } from "../util/crypto";
import { validator } from "hono/validator";
import { createJwtToken } from "../util/jwt";

/// Routes that are exposed to the end users
const publicRoute = new Hono<{
  Bindings: Bindings;
}>();

publicRoute.post(
  "/sign-up",
  zValidator(
    "json",
    z.object({
      email: z.email(),
      password: z.string().min(8),
      username: z.string(),
      displayName: z.string(),
    }),
  ),
  async (c) => {
    const validated = c.req.valid("json");

    // 1. Generate JWE token
    const jwe = await authService.createUserJWEToken(validated);

    // 2. Prepare Link
    const url = new URL(c.req.url);
    const currentPath = c.req.path; //doing this because if main router changes the prefix route later, it will still work
    const basePath = currentPath.substring(0, currentPath.lastIndexOf("/"));
    const verificationLink = `${url.origin}${basePath}/complete-sign-up?token=${jwe}`;

    // 3. Send Notification
    await notiService.sendNotification(
      validated.email,
      "Sign up link",
      `Link to sign up is ${verificationLink}`,
    );

    return c.json({
      success: true,
      message: "Verification email sent.",
    });
  },
);

publicRoute.get("/complete-sign-up", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ success: false, message: "Token is required" }, 400);
  }
  const userData = await authService.verifyUserFromJWEToken(token);

  if (userData === undefined) {
    return c.json({ success: false, message: "Invalid or expired token" }, 400);
  }

  authService.createUser(userData);
});

publicRoute.post(
  "/sign-in",
  zValidator(
    "json",
    z.object({
      key: z.string(),
      method: z.enum(["email", "user"]),
      password: z.string(),
    }),
  ),
  async (c) => {
    const v = c.req.valid("json");

    //Get the user with credential
    const user = await authService.getUserByCredential({
      key: v.key,
      method: v.method,
      password: v.password,
    });
    if (user === null) {
      return c.json({ success: false, message: "Invalid credentials" }, 401);
    }

    //Create token with subject as userId and role as USER.
    const token = await createJwtToken({
      subject: user.id,
      claims: {},
      expiresAt: 100, //TODO
    });

    return c.json(
      { succes: true, data: token, message: "Sign in successful" },
      200,
    );
  },
);

publicRoute.post("/reset-password", (c) => {
  return c.text("Password Reset Endpoint");
});

publicRoute.get("/", (c) => {
  return c.text(
    "Info about the current user based on authorization token. Add middleware",
  );
});

export default publicRoute;
