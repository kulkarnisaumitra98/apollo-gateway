var express = require("express");
var { graphqlHTTP } = require("express-graphql");
var { buildSchema } = require("graphql");

const authors = [{ name: "Sam" }, { name: "Brook" }, { name: "Rex" }];

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Author {
    name: String
  }

  type Query {
    authors: [Author]
  }
`);

// The root provides a resolver function for each API endpoint
var root = {
  authors: (obj, args, context, info) => {
    return authors;
  },
};

var app = express();

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  })
);
app.listen(4002);
console.log("Running a GraphQL API server at http://localhost:4002/graphql");
