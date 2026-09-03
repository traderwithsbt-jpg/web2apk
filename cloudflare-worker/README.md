# Free GitHub Actions Gateway

This folder is a tiny Cloudflare Worker API. It triggers the GitHub Actions workflow without exposing your GitHub token in Blogger.

## 1. Create GitHub repository
Upload the whole project to a **private or public** GitHub repository.

## 2. Add GitHub token
Create a fine-grained GitHub token with access to this repository and permission to:
- Actions: Read and write
- Contents: Read and write

Keep the token secret.

## 3. Create Cloudflare Worker
Create a Worker in Cloudflare and paste `worker.js`.

Add Worker environment variables:
- `GITHUB_TOKEN` = your GitHub token
- `GITHUB_REPO` = `YOUR_USERNAME/YOUR_REPOSITORY`
- `GITHUB_REF` = `main`

## 4. Connect Blogger
Open `blogger/script.js` and set:
const API_BASE = "https://YOUR-WORKER.workers.dev";

Important: this is a gateway only. The GitHub token never goes into Blogger.

## 5. Icon/splash
For the first version, icon/splash URL fields are optional. A public HTTPS image URL can be sent to the gateway. Direct browser file upload is not included in this free gateway version because sending binary files through GitHub workflow inputs is not reliable.

## 6. Free-tier limits
GitHub Actions has usage/retention limits. This setup is suitable for personal/testing use, not unlimited public APK generation.
