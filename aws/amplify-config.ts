// aws/amplify-config.ts
import { Amplify, Auth, API } from "aws-amplify";

// Load env vars (Expo automatically prefixes with VITE_ for client side)
const region = process.env.VITE_AWS_REGION || "us-east-1";
const userPoolId = process.env.VITE_COGNITO_USER_POOL_ID || "";
const clientId = process.env.VITE_COGNITO_APP_CLIENT_ID || "";

Amplify.configure({
  Auth: {
    region,
    userPoolId,
    userPoolWebClientId: clientId,
  },
  API: {
    // Define any API endpoints here if you use API Gateway/Lambda.
    // Example placeholder:
    // endpoints: [{ name: "myApi", endpoint: process.env.VITE_API_ENDPOINT }],
  },
});

export { Auth, API };
