/**
 * Backend is exclusively AWS (Amplify Gen 2 / Cognito / AppSync / DynamoDB / S3).
 * Supabase has been fully removed.
 */
export type BackendKind = "aws";
export const BACKEND: BackendKind = "aws";
export const isAwsBackend = true as const;
export const isSupabaseBackend = false as const;
