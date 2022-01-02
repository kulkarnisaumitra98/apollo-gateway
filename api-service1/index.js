import { ApolloServer, gql } from "apollo-server-express";
import express from "express";
const { GraphQLUpload, graphqlUploadExpress } = require("graphql-upload");

const books = [
  {
    authorName: "Rex",
    title: "The Awakening",
    file: null,
  },
  {
    authorName: "Rex",
    title: "City of Glass",
    file: null,
  },
  {
    authorName: "Brook",
    title: "Brook's Book",
    file: null,
  },
  {
    authorName: "Sam",
    title: "Slayer Sam",
    file: null,
  },
];

const typeDefs = gql`
  scalar Upload

  type Book {
    authorName: String
    title: String
    file: String
  }

  type Query {
    books: [Book]
    booksByName(authorName: String): [Book]
  }

  type Mutation {
    uploadBookFile(file: Upload!): String
  }
`;

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    books: (obj, args, context, info) => {
      return books;
    },
    booksByName: (obj, args, context, info) => {
      return books.filter((book) => book.authorName === args.authorName);
    },
  },
  Mutation: {
    uploadBookFile: async (parent, { file }) => {
      const { createReadStream, filename } = await file;

      await new Promise((res) =>
        createReadStream()
          .pipe(require("fs").createWriteStream(filename))
          .on("close", res)
      );

      return filename;
    },
  },
};

const main = async () => {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  const app = express();

  // This middleware should be added before calling `applyMiddleware`.
  app.use(graphqlUploadExpress());

  server.applyMiddleware({ app });

  await new Promise((r) => app.listen({ port: 4001 }, r));

  console.log(`🚀  Server ready at http://localhost:4001/graphql`);
};

try {
  main();
} catch (e) {
  console.log(e, e.message, e.stack);
}
