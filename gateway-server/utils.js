import fetch from "node-fetch";
import { print } from "graphql";
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

export const getRemoteSchema = async (url) => {
  let executor = async ({ document, variables }) => {
    const query = print(document);
    const fetchResult = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  };

  if (url === serviceUrls[0]) {
    executor = linkToExecutor(createServerHttpLink({ uri: url, fetch }));
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

  return stitchSchemas({
    subschemas: remoteSchemas.filter(Boolean),
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
