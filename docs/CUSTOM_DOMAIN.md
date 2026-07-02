# Connecting culturepass.au to AWS

You **own** `culturepass.au` (registered at an auDA-accredited `.au` registrar —
Route 53 cannot *register* `.au`, but it can host its DNS). Goal: serve the Expo
web app from `https://culturepass.au` on **AWS Amplify Hosting** with HTTPS.

## 0. Prerequisites
- Web frontend builds: `npm run build:web` → `dist/` (spec in [`amplify.yml`](../amplify.yml)).
- A **persistent** backend. The dev sandbox (`ampx sandbox`) is torn down when you
  stop it — for a real domain, deploy a branch backend instead:
  ```bash
  AWS_PROFILE=culturepass-admin npx ampx pipeline-deploy --branch main --app-id <AMPLIFY_APP_ID>
  ```

## 1. Host the web app (Amplify Hosting)
1. Amplify Console → **Create new app → Deploy with GitHub** → pick the repo + branch.
2. It auto-detects [`amplify.yml`](../amplify.yml) (build `expo export`, artifacts `dist`).
3. The `amplify.yml` build spec automatically runs `node scripts/aws-env-from-outputs.mjs` during the frontend phase, so client config is derived from the backend deploy outputs. You normally do **not** need to set the `EXPO_PUBLIC_*` vars manually.
4. Deploy → you get a `https://<branch>.<appid>.amplifyapp.com` URL. Confirm it works.

## 2. Attach the domain (the actual "connect to AWS" part)

### Recommended: let Route 53 host the DNS
1. **Route 53 → Hosted zones → Create hosted zone** for `culturepass.au` (public).
   AWS gives you **4 nameservers** (e.g. `ns-123.awsdns-12.com`, …).
2. At your **`.au` registrar**, replace the domain's nameservers with those 4.
   (Delegation can take 1–24h to propagate. This is the only step that must be
   done at the registrar — everything else is in AWS.)
3. Amplify Console → your app → **Hosting → Custom domains → Add domain** →
   `culturepass.au` → add subdomain `www`. Because the hosted zone is in the same
   account, Amplify **auto-creates** the ACM certificate validation records and the
   CNAME/ALIAS records in Route 53. Wait for **Available** (cert issue + propagation,
   ~15–60 min). HTTPS is automatic.

### Alternative: keep DNS at your registrar
Skip the hosted zone. In **Add domain**, Amplify shows DNS records to create
manually — add them in your registrar's DNS panel:
- the **ACM validation** CNAME(s), and
- the domain/`www` **CNAME** to the Amplify endpoint.
Same result, just managed at the registrar instead of Route 53.

> ACM certs for custom domains live in **us-east-1**; Amplify Hosting requests and
> manages this for you — no manual cert step.

## 3. Wire the domain back into the app
- **Stripe redirects** — done in code: [`tickets-checkout/resource.ts`](../amplify/functions/tickets-checkout/resource.ts)
  now defaults `SITE_URL` to `https://culturepass.au`. Redeploy the backend for it
  to take effect (`pipeline-deploy` / restart `ampx sandbox`).
- **Cognito** — if you use hosted UI / OAuth, add `https://culturepass.au` to the
  app client's allowed callback & sign-out URLs.
- **App store deep links** — `app.json` scheme is `culturepass`; add
  `applinks:culturepass.au` (iOS) / Android App Links if you want universal links.

## Quick checklist
- [ ] `npm run build:web` succeeds locally
- [ ] Backend deployed as a branch (not just sandbox)
- [ ] Amplify Hosting app created, `EXPO_PUBLIC_*` env vars set, branch deploys green
- [ ] Route 53 hosted zone created → 4 NS set at the `.au` registrar
- [ ] Custom domain `culturepass.au` + `www` added in Amplify → status Available
- [ ] `SITE_URL` / Cognito callback URLs updated, backend redeployed
