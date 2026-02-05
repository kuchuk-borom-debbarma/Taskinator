import { Hono } from "hono";
import { Bindings } from "../util/env";
import { zValidator } from "@hono/zod-validator";
import * as z from "zod";
import { authService, notiService } from "../services";
import { createJwtToken } from "../util/jwt";
import { createJwe, decryptJwe } from "../util/jwe";

/// Routes that are exposed to the end users
const publicRoute = new Hono<{
  Bindings: Bindings;
}>();

//Sign up
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

//Complete sign up
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

  return c.json({ success: true, message: "Sign up complete" });
});

//sign in
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
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    });

    return c.json(
      { succes: true, data: token, message: "Sign in successful" },
      200,
    );
  },
);

//reset-password
publicRoute.post(
  "/reset-password",
  zValidator(
    "json",
    z.object({
      email: z.email(),
      password: z.string().length(6),
    }),
  ),
  async (c) => {
    const v = c.req.valid("json");
    const { email, password } = v;
    // get user by email
    const user = await authService.getUserByFilter({ email });
    if (user === null) {
      return c.json(
        { success: false, message: "User with email not found" },
        404,
      );
    }
    // create JWE containing new password and userId
    const jwe = await createJwe(
      JSON.stringify({
        userId: user.id,
        password: password,
      }),
    );
    // use noti service to send notification to email
    // 2. Prepare Link
    const url = new URL(c.req.url);
    const currentPath = c.req.path; //doing this because if main router changes the prefix route later, it will still work
    const basePath = currentPath.substring(0, currentPath.lastIndexOf("/"));
    const verificationLink = `${url.origin}${basePath}/complete-reset-password?token=${jwe}`; //TODO turn into helper
    await notiService.sendNotification(
      email,
      "Reset Password",
      `Link to reset password is ${verificationLink}`,
    );
    return c.json({
      success: true,
      message: "Link set successfully",
    });
  },
);

//complete reset password
publicRoute.get("/complete-reset-password", async (c) => {
  const token = c.req.query("token");
  if (token === undefined) {
    return c.json(
      {
        success: false,
        message: "Token not present in query",
      },
      403,
    );
  }
  const jsonString = await decryptJwe(token);
  const data = (await JSON.parse(jsonString)) as {
    userId: string;
    password: string;
  };

  await authService.updateUserById({
    id: data.userId,
    update: {
      password: data.password,
    },
  });

  return c.json({
    success: true,
    message: "Successfully updated password",
  });
});

//update password
publicRoute.post(
  "/update-password",
  zValidator(
    "json",
    z.object({
      email: z.email(),
      currentPassword: z.string(),
      newPassword: z.string().length(6),
    }),
  ),
  async (c) => {
    const { email, currentPassword, newPassword } = c.req.valid("json");
    // get by cred if found update password
    const user = await authService.getUserByCredential({
      key: email,
      method: "email",
      password: currentPassword,
    });

    if (user === null) {
      return c.json({ success: false, message: "Invalid credential" }, 404);
    }

    await authService.updateUserById({
      id: user.id,
      update: { password: newPassword },
    });

    return c.json({
      success: true,
      message: "Updated password successfully",
    });
  },
);

publicRoute.get("/", (c) => {
  return c.text(
    "Info about the current user based on authorization token. Add middleware",
  );
});

export default publicRoute;
