// aws/aws-client.ts
import { signIn, signUp, signOut, getCurrentUser } from "aws-amplify/auth";
import { get, post, put, del } from "aws-amplify/api";
import type { DocumentType } from "@aws-amplify/core/internals/utils";

// Side-effect import: ensures Amplify.configure() runs before any auth/API call.
import "./amplify-config";

const API_NAME = "myApi";

// Minimal structural shape of a REST operation's response — enough to read the
// JSON body without importing Amplify's @internal types.
type RestOperation = { response: Promise<{ body: { json(): Promise<DocumentType> } }> };

async function jsonBody(operation: RestOperation): Promise<DocumentType> {
  const { body } = await operation.response;
  return body.json();
}

/**
 * Thin wrapper that mimics the Supabase client surface on top of Amplify v6, so
 * call sites can move off Supabase with minimal churn. Auth runs on Cognito;
 * data runs on a REST API (configure the `myApi` endpoint in `amplify-config.ts`
 * once API Gateway/Lambda exists).
 */
export const awsClient = {
  // — Auth —
  signIn(email: string, password: string) {
    return signIn({ username: email, password });
  },
  signUp(email: string, password: string) {
    return signUp({ username: email, password });
  },
  signOut() {
    return signOut();
  },
  getUser() {
    return getCurrentUser();
  },

  // — Data (REST) —
  from(table: string) {
    return {
      async select(...fields: string[]) {
        const data = await jsonBody(
          get({
            apiName: API_NAME,
            path: `/${table}`,
            options: fields.length ? { queryParams: { fields: fields.join(",") } } : undefined,
          }),
        );
        return { data };
      },
      async insert(record: DocumentType) {
        const data = await jsonBody(
          post({ apiName: API_NAME, path: `/${table}`, options: { body: record } }),
        );
        return { data };
      },
      async update(id: string, changes: DocumentType) {
        const data = await jsonBody(
          put({ apiName: API_NAME, path: `/${table}/${id}`, options: { body: changes } }),
        );
        return { data };
      },
      async delete(id: string) {
        const data = await jsonBody(del({ apiName: API_NAME, path: `/${table}/${id}` }));
        return { data };
      },
    };
  },
};
