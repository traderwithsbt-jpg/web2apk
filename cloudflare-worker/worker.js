const JSON_HEADERS = { "content-type": "application/json", ...cors() };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response("", { headers: cors() });
    try {
      if (url.pathname === "/" || url.pathname === "/health") {
        return json({ ok: true, service: "Web2APK GitHub Actions Gateway", version: "3.0" });
      }
      if (url.pathname === "/build" && request.method === "POST") return await createBuild(request, env);
      if (url.pathname.startsWith("/status/") && request.method === "GET") {
        return await status(url.pathname.split("/").pop(), env);
      }
      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json({ error: e?.message || String(e) }, 500);
    }
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(x, status = 200) {
  return new Response(JSON.stringify(x), { status, headers: JSON_HEADERS });
}

function requireEnv(env) {
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN secret is not configured");
  if (!env.GITHUB_REPO) throw new Error("GITHUB_REPO is not configured");
}

async function gh(path, env, opts = {}) {
  requireEnv(env);
  const r = await fetch("https://api.github.com" + path, {
    ...opts,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Web2APK-Gateway",
      ...(opts.headers || {})
    }
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(data.message || `GitHub API ${r.status}`);
  return data;
}

function safeSegment(value) {
  return String(value || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

async function uploadFileToRepo(env, path, file) {
  if (!file || typeof file.arrayBuffer !== "function") return null;
  const buf = new Uint8Array(await file.arrayBuffer());
  // GitHub Contents API is intended for small files. The browser compresses these
  // images before upload; keep a hard server-side limit as an additional safeguard.
  if (buf.byteLength > 900 * 1024) {
    throw new Error("Icon/splash image is too large after compression. Please choose a smaller image.");
  }
  let content = "";
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, Math.min(i + chunk, buf.length)));
  }
  content = btoa(binary);

  await gh(`/repos/${env.GITHUB_REPO}/contents/${path}`, env, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Web2APK asset ${path.split("/").slice(-2).join("/")}`,
      content,
      branch: env.GITHUB_REF || "main"
    })
  });
  return path;
}

async function createBuild(request, env) {
  requireEnv(env);

  const contentType = request.headers.get("content-type") || "";
  let b = {};
  let iconFile = null;
  let splashFile = null;

  if (contentType.toLowerCase().includes("multipart/form-data")) {
    const form = await request.formData();
    for (const [key, value] of form.entries()) {
      if (key === "icon" && typeof value?.arrayBuffer === "function") iconFile = value;
      else if (key === "splash" && typeof value?.arrayBuffer === "function") splashFile = value;
      else b[key] = String(value ?? "");
    }
  } else {
    b = await request.json();
  }

  if (!/^https?:\/\//i.test(b.url || "")) {
    return json({ error: "Valid http/https website URL is required." }, 400);
  }

  const jobId = crypto.randomUUID().replaceAll("-", "");
  const assetDir = `web2apk-assets/${jobId}`;
  let iconPath = "";
  let splashPath = "";

  if (iconFile) iconPath = await uploadFileToRepo(env, `${assetDir}/icon.png`, iconFile);
  if (splashFile) splashPath = await uploadFileToRepo(env, `${assetDir}/splash.png`, splashFile);

  const inputs = {
    job_id: jobId,
    website_url: b.url,
    app_name: b.appName || "My Website App",
    package_name: b.packageName || "com.web2apk.app",
    version_name: b.versionName || "1.0",
    version_code: String(b.versionCode || 1),
    orientation: ["portrait","landscape","sensor"].includes(b.orientation) ? b.orientation : "portrait",
    splash_enabled: String(b.splashEnabled !== false && b.splashEnabled !== "false"),
    splash_ms: String(b.splashMs || 2000),
    splash_bg_type: b.splashBgType === "gradient" ? "gradient" : "solid",
    splash_bg: b.splashBg || "#0B1020",
    splash_bg2: b.splashBg2 || "#242B55",
    splash_text: b.splashText || "#FFFFFF",
    splash_accent: b.splashAccent || "#7C72FF",
    splash_align: ["center","top","bottom"].includes(b.splashAlign) ? b.splashAlign : "center",
    splash_loading: ["bar","spinner","dots","none"].includes(b.splashLoading) ? b.splashLoading : "bar",
    splash_animation: ["fade","zoom","slideup","none"].includes(b.splashAnimation) ? b.splashAnimation : "fade",
    splash_title: b.splashTitle || b.appName || "My Website App",
    splash_tagline: b.splashTagline || "",
    splash_show_logo: String(b.splashShowLogo !== false && b.splashShowLogo !== "false"),
    splash_show_title: String(b.splashShowTitle !== false && b.splashShowTitle !== "false"),
    splash_show_tagline: String(b.splashShowTagline === true || b.splashShowTagline === "true"),
    splash_show_loading: String(b.splashShowLoading !== false && b.splashShowLoading !== "false"),
    back_navigation: String(b.backNavigation !== false && b.backNavigation !== "false"),
    exit_confirm: String(b.exitConfirm !== false && b.exitConfirm !== "false"),
    internet_check: String(b.internetCheck !== false && b.internetCheck !== "false"),
    file_upload: String(b.fileUpload !== false && b.fileUpload !== "false"),
    file_download: String(b.fileDownload !== false && b.fileDownload !== "false"),
    pull_to_refresh: String(b.pullToRefresh === true || b.pullToRefresh === "true"),
    external_links: String(b.externalLinks !== false && b.externalLinks !== "false"),
    zoom_enabled: String(b.zoomEnabled === true || b.zoomEnabled === "true"),
    keep_screen_on: String(b.keepScreenOn === true || b.keepScreenOn === "true"),
    prevent_screenshots: String(b.preventScreenshots === true || b.preventScreenshots === "true"),
    camera_permission: String(b.cameraPermission === true || b.cameraPermission === "true"),
    microphone_permission: String(b.microphonePermission === true || b.microphonePermission === "true"),
    location_permission: String(b.locationPermission === true || b.locationPermission === "true"),
    icon_url: b.iconUrl || "",
    splash_url: b.splashUrl || "",
    icon_path: iconPath,
    splash_path: splashPath
  };

  await gh(`/repos/${env.GITHUB_REPO}/actions/workflows/build-web2apk.yml/dispatches`, env, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: env.GITHUB_REF || "main", inputs })
  });

  return json({ jobId, status: "queued" });
}

async function status(jobId, env) {
  requireEnv(env);
  const workflow = `/repos/${env.GITHUB_REPO}/actions/workflows/build-web2apk.yml/runs?event=workflow_dispatch&branch=${encodeURIComponent(env.GITHUB_REF || "main")}&per_page=20`;
  const data = await gh(workflow, env);
  const title = `Web2APK ${jobId}`;
  const run = (data.workflow_runs || []).find(r => r.display_title === title || r.name === title);

  if (run) {
    if (run.status === "completed") {
      if (run.conclusion === "success") {
        const release = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/releases/tags/web2apk-${encodeURIComponent(jobId)}`, {
          headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Web2APK-Gateway"
          }
        });
        if (release.ok) {
          const r = await release.json();
          const asset = r.assets?.find(a => a.name.endsWith(".apk"));
          return json({ id: jobId, status: "complete", progress: 100, downloadUrl: asset?.browser_download_url || r.html_url, logs: ["APK ready"] });
        }
      }
      return json({ id: jobId, status: "error", progress: 0, error: `GitHub Actions finished with: ${run.conclusion || "unknown"}`, logs: [`Run #${run.run_number}`, `Conclusion: ${run.conclusion || "unknown"}`] });
    }

    return json({ id: jobId, status: "building", progress: 50, logs: [`GitHub Actions run #${run.run_number} is ${run.status}…`] });
  }

  return json({ id: jobId, status: "queued", progress: 10, logs: ["Waiting for GitHub Actions to start…"] });
}
