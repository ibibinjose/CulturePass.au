// aws/amplify-config.ts
import { Amplify } from "aws-amplify";

// IMPORTANT: this is an Expo app, not Vite. Only `EXPO_PUBLIC_*` env vars are
// inlined into the client bundle — `VITE_*` vars resolve to `undefined` here.
//
// In Amplify v6 the Cognito region is encoded in the user-pool id
// (e.g. "ap-southeast-2_aBcD1234"), so there is no separate `region` field on
// the user-pool config.
const userPoolId = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? "";
const userPoolClientId = process.env.EXPO_PUBLIC_COGNITO_APP_CLIENT_ID ?? "";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
    },
  },
  // Add a REST API here once API Gateway/Lambda exists, e.g.:
  // API: {
  //   REST: {
  //     myApi: {
  //       endpoint: process.env.EXPO_PUBLIC_API_ENDPOINT ?? "",
  //       region: process.env.EXPO_PUBLIC_AWS_REGION ?? "ap-southeast-2",
  //     },
  //   },
  // },
});
