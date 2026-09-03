# Web2APK - Free GitHub Actions Edition

This edition keeps the Blogger UI and moves APK compilation to GitHub Actions.

Architecture:
Blogger -> Cloudflare Worker -> GitHub Actions -> GitHub Release -> APK download

This avoids maintaining a VPS. It is intended for personal/testing use because GitHub Actions has usage limits.

## Files
- blogger/ : Blogger frontend
- backend/ : Android template + build script
- .github/workflows/build-web2apk.yml : APK build workflow
- cloudflare-worker/ : tiny API gateway

## Important
Do NOT put your GitHub token in `blogger/script.js`.
