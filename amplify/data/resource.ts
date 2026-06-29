import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * Data layer.
 *
 * TARGET: an existing RDS/Aurora **PostgreSQL** instance (the app is relational
 * — hubs/events/rsvps with joins + reference tables — so we keep Postgres rather
 * than remodel for DynamoDB).
 *
 * Once the RDS instance is provisioned, replace the placeholder schema below
 * with the generated SQL schema:
 *
 *   1. store the connection string as a secret:
 *        npx ampx sandbox secret set SQL_CONNECTION_STRING
 *   2. generate the typed schema from the live DB:
 *        npx ampx generate schema-from-database \
 *          --connection-uri-secret SQL_CONNECTION_STRING \
 *          --out amplify/data/schema.sql.ts
 *   3. import it here and add authorization rules:
 *        import { schema as sqlSchema } from "./schema.sql";
 *        export const data = defineData({ schema: sqlSchema.authorization(...) });
 *
 * The `Health` model below is a deployable placeholder so the backend stands up
 * (and the Auth/Storage wiring can be verified) before the SQL schema lands.
 */
const schema = a.schema({
  Health: a
    .model({
      status: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
