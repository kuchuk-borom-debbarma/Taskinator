import { parse } from "graphql";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { createYoga } from "graphql-yoga";
import { authService } from "../services";
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
