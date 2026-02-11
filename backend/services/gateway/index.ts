import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from "@apollo/gateway";

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
      willSendRequest({ request, context }) {
        // Forward the Authorization header from the client to the subgraphs
        if (context.authHeader) {
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
