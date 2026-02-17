import { parse } from "graphql";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { createYoga } from "graphql-yoga";
import { authService, notiService } from "../services";
import { createJwtToken } from "../util/jwt";
import { createJwe, decryptJwe } from "../util/jwe";
import { getVerificationLink } from "../util/url";
import schemaRaw from "./schema.graphql";

const typeDefs = parse(schemaRaw);

const resolvers = {
  Query: {
    me: async (_: any, __: any, context: any) => {
      const identity = context.identity;
      if (!identity || !identity.sub) return null;
      return authService.getUserByFilter({ id: identity.sub });
    },
    userById: async (_: any, { id }: { id: string }) => {
      return authService.getUserByFilter({ id });
    },
  },
  Mutation: {
    signUp: async (_: any, { input }: any, context: any) => {
      const jwe = await authService.createUserJWEToken(input);
      const verificationLink = getVerificationLink(context.honoContext, "complete-sign-up", jwe);

      await notiService.sendNotification(
        input.email,
        "Sign up link",
        `Link to sign up is ${verificationLink}`,
      );

      return {
        success: true,
        message: "Verification email sent.",
      };
    },
    completeSignUp: async (_: any, { token }: any) => {
      const userData = await authService.verifyUserFromJWEToken(token);

      if (userData === undefined) {
        return { success: false, message: "Invalid or expired token" };
      }

      await authService.createUser(userData);

      return { success: true, message: "Sign up complete" };
    },
    signIn: async (_: any, { input }: any) => {
      const user = await authService.getUserByCredential({
        key: input.key,
        method: input.method.toLowerCase() as "email" | "user",
        password: input.password,
      });

      if (user === null) {
        return { success: false, message: "Invalid credentials" };
      }

      const token = await createJwtToken({
        subject: user.id,
        claims: {},
        expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      });

      return { success: true, message: "Sign in successful", token };
    },
    resetPassword: async (_: any, { email, password }: any, context: any) => {
      const user = await authService.getUserByFilter({ email });

      if (user === null) {
        return { success: false, message: "User with email not found" };
      }

      const jwe = await createJwe(
        JSON.stringify({ userId: user.id, password: password }),
      );

      const verificationLink = getVerificationLink(context.honoContext, "complete-reset-password", jwe);

      await notiService.sendNotification(
        email,
        "Reset Password",
        `Link to reset password is ${verificationLink}`,
      );

      return { success: true, message: "Link set successfully" };
    },
    completeResetPassword: async (_: any, { token }: any) => {
      const jsonString = await decryptJwe(token);
      const data = (await JSON.parse(jsonString)) as {
        userId: string;
        password: string;
      };

      await authService.updateUserById({
        id: data.userId,
        update: { password: data.password },
      });

      return { success: true, message: "Successfully updated password" };
    },
    updatePassword: async (_: any, { input }: any) => {
      const user = await authService.getUserByCredential({
        key: input.email,
        method: "email",
        password: input.currentPassword,
      });

      if (user === null) {
        return { success: false, message: "Invalid credential" };
      }

      await authService.updateUserById({
        id: user.id,
        update: { password: input.newPassword },
      });

      return { success: true, message: "Updated password successfully" };
    },
  },
  User: {
    __resolveReference: async (reference: { id: string }) => {
      return authService.getUserByFilter({ id: reference.id });
    },
  },
};

export const schema = buildSubgraphSchema({ typeDefs, resolvers });

export const createYogaInstance = (env: any) => {
  return createYoga({
    schema,
    graphqlEndpoint: "/graphql",
    fetchAPI: { Response },
    context: (ctx: any) => {
      // Identity is added by authMiddleware in Hono
      return {
        ...ctx,
        identity: ctx.honoContext?.get("identity"),
      };
    },
  });
};
