# Cloudflare Worker Gateway

This Worker receives build requests from the Blogger frontend and triggers the GitHub Actions workflow.

## Cloudflare Workers Builds

Repository root: `/`

Recommended deploy command:

```text
npx wrangler deploy
```

The root `wrangler.toml` points Wrangler to `cloudflare-worker/worker.js`.

Required Worker secrets/variables:

- `GITHUB_TOKEN` — **Secret** (never a plain variable)
- `GITHUB_REPO` — variable, for example `username/web2apk`
- `GITHUB_REF` — variable, normally `main`

The Blogger frontend uses:

```text
https://web2apk.traderwithsbt.workers.dev
```

Test:

```text
https://web2apk.traderwithsbt.workers.dev/health
```

Expected response:

```json
{"ok":true,"service":"Web2APK GitHub Actions Gateway"}
```

## Important

Never paste the GitHub token into Blogger or public source code. If a token is exposed, revoke it and create a new one.
