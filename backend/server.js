import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import archiver from "archiver";
import sharp from "sharp";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "work");
const TEMPLATE = path.join(__dirname, "android-template");
const PORT = process.env.PORT || 3000;
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

await fs.ensureDir(ROOT);

const upload = multer({
  dest: path.join(ROOT, "uploads"),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/downloads", express.static(path.join(ROOT, "downloads")));

const jobs = new Map();

function id() {
  return crypto.randomBytes(8).toString("hex");
}

function safePackage(value) {
  let v = String(value || "com.example.webapp")
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  if (!v.includes(".")) v = `com.example.${v || "webapp"}`;
  return v.split(".").map((x, i) => (/^[a-z_]/.test(x) ? x : `x${x}`)).join(".");
}

function safeAppName(value) {
  return String(value || "Web App").replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 40) || "Web App";
}

function xmlEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function javaEscape(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n");
}

async function run(cmd, args, cwd) {
  const { stdout, stderr } = await execFileAsync(cmd, args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  return (stdout || "") + (stderr || "");
}

async function downloadText(url) {
  const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Web2APK/1.0" } });
  if (!r.ok) throw new Error(`Website returned HTTP ${r.status}`);
  return { text: await r.text(), finalUrl: r.url, contentType: r.headers.get("content-type") || "" };
}

function absoluteUrl(base, raw) {
  try { return new URL(raw, base).href; } catch { return null; }
}

function isHttp(u) {
  return /^https?:\/\//i.test(u || "");
}

function shouldFetchAsset(u) {
  return isHttp(u) && /\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|mp3|mp4|webm|json)(\?.*)?$/i.test(u);
}

async function mirrorWebsite(inputUrl, outDir, log) {
  const { text: html, finalUrl } = await downloadText(inputUrl);
  const base = new URL(finalUrl);
  await fs.ensureDir(outDir);

  const assetMap = new Map();
  const candidates = new Set();

  const attrRe = /(?:src|href|poster)=["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html))) {
    const u = absoluteUrl(base.href, m[1]);
    if (u && new URL(u).origin === base.origin && shouldFetchAsset(u)) candidates.add(u);
  }
  const cssRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((m = cssRe.exec(html))) {
    const u = absoluteUrl(base.href, m[1]);
    if (u && new URL(u).origin === base.origin && shouldFetchAsset(u)) candidates.add(u);
  }

  let i = 0;
  for (const u of candidates) {
    try {
      const r = await fetch(u, { redirect: "follow", headers: { "User-Agent": "Web2APK/1.0" } });
      if (!r.ok) continue;
      const ct = r.headers.get("content-type") || "";
      const ext = path.extname(new URL(u).pathname) || (ct.includes("javascript") ? ".js" : ct.includes("css") ? ".css" : "");
      const file = `asset_${String(i++).padStart(4, "0")}${ext}`;
      const target = path.join(outDir, file);
      const buf = Buffer.from(await r.arrayBuffer());
      await fs.writeFile(target, buf);
      assetMap.set(u, file);
    } catch {}
  }

  let rewritten = html.replace(attrRe, (all, raw) => {
    const u = absoluteUrl(base.href, raw);
    return u && assetMap.has(u) ? all.replace(raw, assetMap.get(u)) : all;
  });

  rewritten = rewritten.replace(cssRe, (all, raw) => {
    const u = absoluteUrl(base.href, raw);
    return u && assetMap.has(u) ? all.replace(raw, assetMap.get(u)) : all;
  });

  await fs.writeFile(path.join(outDir, "index.html"), rewritten, "utf8");
  await fs.writeFile(path.join(outDir, "source-url.txt"), finalUrl, "utf8");
  log(`Website copied: ${assetMap.size} local assets`);
}

async function copyRecursive(src, dst) {
  await fs.ensureDir(dst);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (e.isDirectory()) await copyRecursive(a, b);
    else await fs.copyFile(a, b);
  }
}

async function makeIcon(src, resDir) {
  const dirs = ["mipmap-mdpi","mipmap-hdpi","mipmap-xhdpi","mipmap-xxhdpi","mipmap-xxxhdpi"];
  const sizes = [48,72,96,144,192];
  for (let i=0;i<dirs.length;i++) {
    const d = path.join(resDir, dirs[i]);
    await fs.ensureDir(d);
    await sharp(src).resize(sizes[i], sizes[i], { fit: "cover" }).png().toFile(path.join(d, "ic_launcher.png"));
  }
}

async function makeSplash(src, resDir) {
  const d = path.join(resDir, "drawable-nodpi");
  await fs.ensureDir(d);
  await sharp(src).resize(1080, 1920, { fit: "inside", withoutEnlargement: true }).png().toFile(path.join(d, "splash_logo.png"));
}

async function createProject(job, options) {
  const project = path.join(ROOT, job.id, "project");
  await fs.remove(project);
  await copyRecursive(TEMPLATE, project);

  const appName = safeAppName(options.appName);
  const pkg = safePackage(options.packageName);
  const pkgPath = path.join(...pkg.split("."));
  const srcRoot = path.join(project, "app/src/main/java");
  const oldJava = path.join(srcRoot, "com/example/web2apk/MainActivity.java");
  const newJavaDir = path.join(srcRoot, pkgPath);
  await fs.ensureDir(newJavaDir);
  const java = await fs.readFile(oldJava, "utf8");
  await fs.remove(path.dirname(oldJava));
  await fs.writeFile(path.join(newJavaDir, "MainActivity.java"),
    java.replaceAll("com.example.web2apk", pkg)
      .replaceAll("WEB2APK_APP_NAME", javaEscape(appName))
      .replaceAll("WEB2APK_ORIENTATION", options.orientation === "landscape" ? "landscape" : "portrait")
      .replaceAll("WEB2APK_SPLASH_MS", String(Math.max(0, Math.min(10000, Number(options.splashMs) || 2000))))
      .replaceAll("WEB2APK_INTERNET_CHECK", options.internetCheck !== false ? "true" : "false")
      .replaceAll("WEB2APK_FILE_UPLOAD", options.fileUpload !== false ? "true" : "false")
      .replaceAll("WEB2APK_FILE_DOWNLOAD", options.fileDownload !== false ? "true" : "false")
      .replaceAll("WEB2APK_EXIT_CONFIRM", options.exitConfirm !== false ? "true" : "false")
  );

  const manifest = path.join(project, "app/src/main/AndroidManifest.xml");
  let mf = await fs.readFile(manifest, "utf8");
  mf = mf.replaceAll("com.example.web2apk", pkg)
         .replace("android:screenOrientation=\"portrait\"", `android:screenOrientation="${options.orientation === "landscape" ? "landscape" : "portrait"}"`);
  await fs.writeFile(manifest, mf);

  const gradle = path.join(project, "app/build.gradle");
  let gb = await fs.readFile(gradle, "utf8");
  gb = gb.replace("applicationId \"com.example.web2apk\"", `applicationId "${pkg}"`)
         .replace("versionName \"1.0\"", `versionName "${String(options.versionName || "1.0").replace(/"/g,"")}"`)
         .replace("versionCode 1", `versionCode ${Math.max(1, parseInt(options.versionCode || "1",10))}`);
  await fs.writeFile(gradle, gb);

  const strings = path.join(project, "app/src/main/res/values/strings.xml");
  await fs.writeFile(strings, `<resources><string name="app_name">${xmlEscape(appName)}</string></resources>`);

  if (job.iconPath) await makeIcon(job.iconPath, path.join(project, "app/src/main/res"));
  if (job.splashPath) await makeSplash(job.splashPath, path.join(project, "app/src/main/res"));

  const webDir = path.join(project, "app/src/main/assets/www");
  await mirrorWebsite(options.url, webDir, job.log);

  job.project = project;
}

async function buildJob(job, options) {
  try {
    job.status = "building"; job.progress = 35; job.log("Android project created");
    await createProject(job, options);
    job.progress = 55; job.log("Starting Gradle build");
    const gradleCmd = process.env.GRADLE_CMD || "gradle";
    await run(gradleCmd, ["assembleDebug", "--no-daemon"], job.project);
    job.progress = 90; job.log("APK built");
    const apk = path.join(job.project, "app/build/outputs/apk/debug/app-debug.apk");
    if (!(await fs.pathExists(apk))) throw new Error("APK output not found");
    const downloads = path.join(ROOT, "downloads");
    await fs.ensureDir(downloads);
    const filename = `${safeAppName(options.appName).replace(/\s+/g,"-")}-${job.id}.apk`;
    const out = path.join(downloads, filename);
    await fs.copyFile(apk, out);
    job.progress = 100; job.status = "complete";
    job.downloadUrl = `${PUBLIC_BASE}/downloads/${encodeURIComponent(filename)}`;
    job.log("APK ready");
  } catch (e) {
    job.status = "error";
    job.error = e.message || String(e);
    job.log(`ERROR: ${job.error}`);
  }
}

app.get("/api/health", (req,res) => res.json({ ok:true, service:"Web2APK Builder" }));

app.post("/api/build", upload.fields([
  { name:"icon", maxCount:1 },
  { name:"splash", maxCount:1 }
]), async (req,res) => {
  const body = req.body || {};
  if (!isHttp(body.url)) return res.status(400).json({ error:"Valid http/https website URL is required." });
  const job = { id:id(), status:"queued", progress:5, logs:[], log(x){ this.logs.push(x); } };
  job.iconPath = req.files?.icon?.[0]?.path || null;
  job.splashPath = req.files?.splash?.[0]?.path || null;
  jobs.set(job.id, job);
  const options = {
    url: body.url.trim(),
    appName: body.appName,
    packageName: body.packageName,
    versionName: body.versionName,
    versionCode: body.versionCode,
    orientation: body.orientation,
    splashMs: body.splashMs,
    internetCheck: body.internetCheck !== "false",
    fileUpload: body.fileUpload !== "false",
    fileDownload: body.fileDownload !== "false",
    exitConfirm: body.exitConfirm !== "false"
  };
  buildJob(job, options);
  res.json({ jobId:job.id, status:job.status });
});

app.get("/api/build/:id", (req,res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({error:"Build not found"});
  res.json({ id:j.id, status:j.status, progress:j.progress, logs:j.logs.slice(-20), error:j.error || null, downloadUrl:j.downloadUrl || null });
});

app.get("/api/download/:id", (req,res) => {
  const j = jobs.get(req.params.id);
  if (!j?.downloadUrl) return res.status(404).json({error:"APK is not ready"});
  res.redirect(j.downloadUrl);
});

app.listen(PORT, () => console.log(`Web2APK Builder running on ${PORT}`));
