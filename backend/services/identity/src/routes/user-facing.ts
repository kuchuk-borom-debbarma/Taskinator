import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { Bindings, Variables } from "../util/env";
import { authService, notiService } from "../services";
import { createJwtToken, verifyJwtToken } from "../util/jwt";
import { createJwe, decryptJwe } from "../util/jwe";
import { authMiddleware } from "../middlewares/auth";
import { getVerificationLink } from "../util/url";

/// Routes that are exposed to the end users
const publicRoute = new OpenAPIHono<{
  Bindings: Bindings;
  Variables: Variables;
}>({ strict: false });

// Common Schemas
const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
}).openapi("SuccessResponse");

const ErrorResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
}).openapi("ErrorResponse");

// --- Routes Definitions ---

const signUpRoute = createRoute({
  method: "post",
  path: "/sign-up",
  summary: "Initializes user sign up",
  description: "Sends a verification email with a link to complete the sign up process.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(8),
            username: z.string(),
            displayName: z.string(),
          }).openapi("SignUpRequest"),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Verification email sent",
    },
    400: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Invalid input",
    },
  },
});

const completeSignUpRoute = createRoute({
  method: "get",
  path: "/complete-sign-up",
  summary: "Completes user sign up",
  request: {
    query: z.object({
      token: z.string().openapi({ example: "jwe_token_here" }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Sign up successful",
    },
    400: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Invalid or expired token",
    },
  },
});

const signInRoute = createRoute({
  method: "post",
  path: "/sign-in",
  summary: "User sign in",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            key: z.string(),
            method: z.enum(["email", "user"]),
            password: z.string(),
          }).openapi("SignInRequest"),
        },
      },
    },
  },
  responses: {
    200: {
      content: { 
        "application/json": { 
          schema: SuccessResponseSchema.extend({
            data: z.string(),
          }).openapi("SignInSuccessResponse") 
        } 
      },
      description: "Sign in successful",
    },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Invalid credentials",
    },
  },
});

const resetPasswordRoute = createRoute({
  method: "post",
  path: "/reset-password",
  summary: "Request password reset",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            password: z.string().length(6),
          }).openapi("ResetPasswordRequest"),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Reset link sent",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "User not found",
    },
  },
});

const completeResetPasswordRoute = createRoute({
  method: "get",
  path: "/complete-reset-password",
  summary: "Complete password reset",
  request: {
    query: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Password updated successfully",
    },
    403: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Token missing or invalid",
    },
  },
});

const updatePasswordRoute = createRoute({
  method: "post",
  path: "/update-password",
  summary: "Update password for logged in user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            currentPassword: z.string(),
            newPassword: z.string().length(6),
          }).openapi("UpdatePasswordRequest"),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Password updated",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Invalid credentials",
    },
  },
});

const getMeRoute = createRoute({
  method: "get",
  path: "/me/info",
  summary: "Get current user info",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      content: { 
        "application/json": { 
          schema: SuccessResponseSchema.extend({
            data: z.any(),
          }).openapi("GetMeSuccessResponse")
        } 
      },
      description: "User identity returned",
    },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Unauthorized",
    },
  },
});

// --- Implementations ---

publicRoute.openapi(signUpRoute, (async (c: any) => {
  const validated = c.req.valid("json");
  const jwe = await authService.createUserJWEToken(validated);
  const verificationLink = getVerificationLink(c, "complete-sign-up", jwe);

  await notiService.sendNotification(
    validated.email,
    "Sign up link",
    `Link to sign up is ${verificationLink}`,
  );

  return c.json({
    success: true,
    message: "Verification email sent.",
  }, 200);
}) as any);

publicRoute.openapi(completeSignUpRoute, (async (c: any) => {
  const { token } = c.req.valid("query");
  const userData = await authService.verifyUserFromJWEToken(token);

  if (userData === undefined) {
    return c.json({ success: false, message: "Invalid or expired token" }, 400);
  }

  await authService.createUser(userData);

  return c.json({ success: true, message: "Sign up complete" }, 200);
}) as any);

publicRoute.openapi(signInRoute, (async (c: any) => {
  const v = c.req.valid("json");
  const user = await authService.getUserByCredential({
    key: v.key,
    method: v.method,
    password: v.password,
  });

  if (user === null) {
    return c.json({ success: false, message: "Invalid credentials" }, 401);
  }

  const token = await createJwtToken({
    subject: user.id,
    claims: {},
    expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  });

  return c.json({ success: true, data: token, message: "Sign in successful" }, 200);
}) as any);

publicRoute.openapi(resetPasswordRoute, (async (c: any) => {
  const { email, password } = c.req.valid("json");
  const user = await authService.getUserByFilter({ email });
  
  if (user === null) {
    return c.json({ success: false, message: "User with email not found" }, 404);
  }

  const jwe = await createJwe(
    JSON.stringify({ userId: user.id, password: password }),
  );

  const verificationLink = getVerificationLink(c, "complete-reset-password", jwe);
  
  await notiService.sendNotification(
    email,
    "Reset Password",
    `Link to reset password is ${verificationLink}`,
  );

  return c.json({ success: true, message: "Link set successfully" }, 200);
}) as any);

publicRoute.openapi(completeResetPasswordRoute, (async (c: any) => {
  const { token } = c.req.valid("query");
  const jsonString = await decryptJwe(token);
  const data = (await JSON.parse(jsonString)) as {
    userId: string;
    password: string;
  };

  await authService.updateUserById({
    id: data.userId,
    update: { password: data.password },
  });

  return c.json({ success: true, message: "Successfully updated password" }, 200);
}) as any);

publicRoute.openapi(updatePasswordRoute, (async (c: any) => {
  const { email, currentPassword, newPassword } = c.req.valid("json");
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

  return c.json({ success: true, message: "Updated password successfully" }, 200);
}) as any);

// Use middleware explicitly before the openapi route to avoid 404 issues
publicRoute.use("/me/info", authMiddleware);
publicRoute.openapi(getMeRoute, (async (c: any) => {
  const identity = c.get("identity");
  return c.json({
    success: true,
    data: identity,
    message: "User identity returned"
  }, 200);
}) as any);

export default publicRoute;