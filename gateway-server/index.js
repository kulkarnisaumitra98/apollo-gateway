const { ApolloServer, gql } = require("apollo-server-express");
var express = require("express");
const {
  graphqlUploadExpress, // A Koa implementation is also exported.
} = require("graphql-upload");
import { getRemoteSchemas } from "./utils";
import merge from "lodash/merge";

const main = async () => {
  const mergedSchema = await getRemoteSchemas();

  const server = new ApolloServer({
    schema: mergedSchema,
    context: ({ req }) => {
      return { request: req };
    },
  });

  await server.start();
  const app = express();

  app.use(graphqlUploadExpress());

  server.applyMiddleware({ app });

  await new Promise((r) => app.listen({ port: 4000 }, r));

  console.log(`🚀  Server ready at http://localhost:4000/graphql`);
};

try {
  main();
} catch (e) {
  console.log(e, e.message, e.stack);
}
