// aws/aws-client.ts
import { Auth, API } from "./amplify-config";

// Simple wrapper mimicking Supabase client API for auth
export const awsClient = {
  // Auth helpers
  async signIn(email: string, password: string) {
    return Auth.signIn({ username: email, password });
  },
  async signUp(email: string, password: string) {
    return Auth.signUp({ username: email, password });
  },
  async signOut() {
    return Auth.signOut();
  },
  async getUser() {
    const user = await Auth.getCurrentUser();
    return user;
  },
  // Data helpers – using Amplify API (expects API endpoint configured)
  from(table: string) {
    return {
      async select(...fields: string[]) {
        // Example: GET /{table}?fields=...
        const query = fields.length ? `?fields=${fields.join(',')}` : "";
        const response = await API.get("myApi", `/${table}${query}`, {});
        return { data: response };
      },
      async insert(record: any) {
        const response = await API.post("myApi", `/${table}`, { body: record });
        return { data: response };
      },
      async update(id: string, changes: any) {
        const response = await API.put("myApi", `/${table}/${id}`, { body: changes });
        return { data: response };
      },
      async delete(id: string) {
        const response = await API.del("myApi", `/${table}/${id}`, {});
        return { data: response };
      },
    };
  },
};
