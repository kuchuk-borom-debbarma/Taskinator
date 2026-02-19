import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from "@apollo/gateway";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "320e5c96f36f30c09c6d25fd0c6836a1";
const secret = new TextEncoder().encode(JWT_SECRET);

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: "identity", url: "http://localhost:8787/graphql" },
      { name: "workspace", url: "http://localhost:8080/graphql" },
    ],
  }),
  buildService({ url }) {
    return new RemoteGraphQLDataSource({
      url,
      async willSendRequest({ request, context }) {
        if (context.authHeader) {
          const token = context.authHeader.replace("Bearer ", "");
          try {
            const { payload } = await jwtVerify(token, secret);
            if (payload.sub) {
              request.http?.headers.set("X-User-Id", payload.sub);
            }
          } catch (e) {
            console.warn("Invalid token received at gateway:", (e as Error).message);
          }
          
          // Still forward the original Authorization header
          request.http?.headers.set("Authorization", context.authHeader);
        }
      },
    });
  },
});

const server = new ApolloServer({
  gateway,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    return {
      authHeader: req.headers.authorization,
    };
  },
});

console.log(`🚀 Gateway ready at ${url}`);
