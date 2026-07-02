# AWS Migration Guide for CulturePassAustralia (historical / alternative)

> **Note:** The project uses **AWS Amplify Gen 2** (see `amplify/` at repo root, `npx ampx`, `amplify.yml`). This document describes an older/custom CloudFormation + manual Amplify client approach and is retained only for reference.

## Overview
This guide walks you through moving **CulturePassAustralia** from Supabase to an AWS‑based stack.

### What we replace
| Supabase component | AWS equivalent |
|-------------------|---------------|
| Auth (supabase.auth) | **Amazon Cognito** (User Pools) |
| Postgres DB | **Amazon DynamoDB** (NoSQL) – or **Amazon RDS (PostgreSQL)** if you need relational features |
| Edge Functions | **AWS Lambda** (deployed via API Gateway) |
| Static hosting (`dist/`) | **Amazon S3** + **CloudFront** CDN |
| Secrets | **AWS Secrets Manager** (or Parameter Store) |

## Prerequisites
1. An AWS account with IAM permissions for S3, CloudFront, Cognito, DynamoDB, IAM, CloudFormation, and Lambda.
2. AWS CLI installed and configured (`aws configure`).
3. Node ≥ 18, npm ≥ 10.
4. Existing Supabase data exported (see the `supabase` folder for `seed.sql`).

## Steps
1. **Create AWS resources** – run the CloudFormation template (`aws/cloudformation.yml`).
2. **Configure Amplify** – the `aws/amplify-config.ts` file sets up Cognito, API, and Storage.
3. **Update environment variables** – copy `.env.example` to `.env` and fill the new AWS values.
4. **Replace Supabase client** – see `aws/aws-client.ts` for a thin wrapper that mimics the Supabase API using Amplify.
5. **Deploy front‑end** – run `npm run build` (or `expo export:web`) then `aws/deploy.sh`.
6. **Migrate data** – Export from Supabase (`supabase db dump`) and import into DynamoDB or RDS (scripts in `aws/data-migration/`).
7. **Optional CI/CD** – enable the GitHub Actions workflow (`aws/.github/workflows/deploy.yml`).

## Quick Deploy
```bash
# 1️⃣ Deploy infrastructure
aws cloudformation deploy \
  --template-file aws/cloudformation.yml \
  --stack-name culturepass-australia \
  --capabilities CAPABILITY_NAMED_IAM

# 2️⃣ Build and upload static assets
npm run build   # produces ./dist
bash aws/deploy.sh
```

## Next Tasks
- Implement API endpoints in Lambda (see `aws/lambda/` folder).
- Update React code to use Amplify Auth & API instead of Supabase client.
- Verify data migration.

---
*All files referenced in this guide are added to the repository under the `aws/` directory.*
