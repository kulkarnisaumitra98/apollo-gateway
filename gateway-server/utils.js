import fetch from "node-fetch";
import { print, buildSchema, GraphQLScalarType } from "graphql";
import { introspectSchema } from "@graphql-tools/wrap";
import { stitchSchemas } from "@graphql-tools/stitch";
import { delegateToSchema } from "@graphql-tools/delegate";
import {
  linkToExecutor,
  createServerHttpLink,
  GraphQLUpload,
} from "@graphql-tools/links";

const serviceUrls = [
  "http://localhost:4001/graphql",
  "http://localhost:4002/graphql",
];

const linkSchemaDef = `
  extend type Author {
    books: [Book]
  }
`;

const uploadSchema = buildSchema(`
      scalar Upload
      
      type Mutation {
        uploadBookFile(file: Upload!): String
      }
`);

export const getRemoteSchema = async (url) => {
  async function executor({ document, variables }) {
    const query = print(document);
    const fetchResult = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  }

  const schema = {
    schema: await introspectSchema(executor),
    executor,
  };

  return schema;
};

export const getRemoteSchemas = async () => {
  const remoteSchemas = await Promise.all(
    serviceUrls.map((serviceUrl) => getRemoteSchema(serviceUrl))
  );

  const uploadSubSchema = {
    schema: uploadSchema,
    executor: linkToExecutor(
      createServerHttpLink({ uri: serviceUrls[0], fetch })
    ),
  };

  return stitchSchemas({
    subschemas: [...remoteSchemas.filter(Boolean), uploadSubSchema],
    resolvers: [
      {
        Author: {
          books: {
            selectionSet: `{ authorName }`,
            resolve(author, args, context, info) {
              return delegateToSchema({
                schema: remoteSchemas[0],
                operation: "query",
                fieldName: "booksByName",
                args: { authorName: author.name },
                context,
                info,
              });
            },
          },
        },
        Upload: GraphQLUpload,
      },
    ],
    typeDefs: [linkSchemaDef],
  });
};
