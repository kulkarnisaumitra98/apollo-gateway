import fetch from "node-fetch";
import { setContext } from "@apollo/client/link/context";
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
  // Fetch our schemas
  try {
    const fetcher = createServerHttpLink({ uri: url, fetch });

    const fetcherWithContext = setContext(async (request, context) => {
      let headers = {};

      if (
        context &&
        context.graphqlContext &&
        context.graphqlContext.request &&
        context.graphqlContext.request.headers
      ) {
        headers = context.graphqlContext.request.headers;
        // Need to delete content-type and content-length as there
        // is mis-match between client request content-length and gateway processed request content-length
        delete headers["content-type"];
        delete headers["content-length"];
      }

      return { headers };
    }).concat(fetcher);

    const executorVal = linkToExecutor(fetcherWithContext);
    return {
      schema: await introspectSchema(executorVal),
      executor: executorVal,
    };
  } catch (e) {
    console.log(e);
    return false;
  }
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
