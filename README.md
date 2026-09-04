# Web2APK — Custom Android Features v4

This package adds a configurable native Android shell around any public HTTP/HTTPS website.

## Frontend
`blogger/index.html`, `blogger/style.css`, `blogger/script.js`

The frontend lets the user choose: custom native splash (on/off, logo, title, tagline, colors, gradient, loading style, animation, alignment, duration), orientation, back behavior, offline page, file upload/download, pull-to-refresh, external intents, zoom, keep-awake, screenshot protection, camera, microphone and location permissions.

## Backend
- `cloudflare-worker/worker.js` receives the form and dispatches GitHub Actions.
- `backend/github-build.mjs` converts selections into a per-build Android project.
- `backend/android-template` is the native WebView shell.
- `.github/workflows/build-web2apk.yml` builds and releases the APK.

## Cloudflare Variables
Keep these runtime variables/secrets in the Worker:
- `GITHUB_REPO` = `traderwithsbt-jpg/web2apk`
- `GITHUB_REF` = `main`
- `GITHUB_TOKEN` = Secret

`wrangler.toml` contains `keep_vars = true`, so dashboard variables are preserved during Wrangler deploys. Cloudflare also supports `npx wrangler deploy --keep-vars`; if the Workers Builds Deploy command is editable, using that command is an additional safeguard.

## GitHub
Replace the repository workflow and backend/template files with this package, commit to `main`, then build from the Blogger frontend.

## Important
The uploaded website is still loaded live in the WebView. The new splash is native Android, not a website overlay.
