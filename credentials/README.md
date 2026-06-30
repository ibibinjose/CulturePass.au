# credentials/

Local-only signing & API keys. **Nothing secret in here is committed** — the
folder `.gitignore` ignores every file except this README. Keep a backup of
these keys somewhere safe (a password manager / secrets vault); if you lose the
`.p8` you cannot re-download it from Apple, only revoke and reissue.

## `AuthKey_7GT3DTNP6H.p8` — App Store Connect API key

Used by `eas submit` to upload iOS builds to App Store Connect without an
interactive Apple login.

| Field            | Value                                              |
| ---------------- | -------------------------------------------------- |
| Key ID           | `7GT3DTNP6H` (encoded in the filename)             |
| Issuer ID        | _set in `eas.json` → `submit.production.ios`_       |
| Wired in         | [`eas.json`](../eas.json) `ascApiKeyPath`          |
| Bundle ID        | `au.com.culturepass.app`                            |

### Finding the Issuer ID

App Store Connect → **Users and Access** → **Integrations** → **App Store
Connect API** → the **Issuer ID** shown above the keys table (a UUID). Paste it
into `eas.json` under `submit.production.ios.ascApiKeyIssuerId`. The Issuer ID
and Key ID are not secret; only the `.p8` private key is.

### Submitting

```bash
eas submit --platform ios --profile production
```
