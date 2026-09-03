// Change this to your deployed Node.js backend URL.
const API_BASE = "https://web2apk.traderwithsbt.workers.dev";

const $ = id => document.getElementById(id);
const iconInput = $("icon"), splashInput = $("splash");

function preview(input, img) {
  input.addEventListener("change", () => {
    const f = input.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { alert("Image must be 10 MB or smaller."); input.value=""; return; }
    img.src = URL.createObjectURL(f); img.style.display = "block";
  });
}
preview(iconInput, $("iconPreview")); preview(splashInput, $("splashPreview"));

$("themeBtn").onclick = () => {
  document.body.classList.toggle("dark");
  $("themeBtn").textContent = document.body.classList.contains("dark") ? "☀" : "☾";
};

function packageFromName(name) {
  return "com.web2apk." + (name || "app").toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,18) || "app";
}
$("appName").addEventListener("input", e => {
  if (!$("packageName").dataset.edited) $("packageName").value = packageFromName(e.target.value);
});
$("packageName").addEventListener("input", () => $("packageName").dataset.edited = "1");

$("buildBtn").onclick = async () => {
  const url = $("url").value.trim();
  const appName = $("appName").value.trim() || "My Website App";
  if (!/^https?:\/\/.+/i.test(url)) return alert("Please enter a valid http/https website URL.");

  const payload = {
    url,
    appName,
    packageName: $("packageName").value.trim() || packageFromName(appName),
    versionName: $("versionName").value.trim() || "1.0",
    versionCode: $("versionCode").value.trim() || "1",
    orientation: $("orientation").value,
    splashMs: Number($("splashMs").value) || 2000,
    exitConfirm: $("exitConfirm").checked,
    internetCheck: $("internetCheck").checked,
    fileUpload: $("fileUpload").checked,
    fileDownload: $("fileDownload").checked
  };

  if (iconInput.files[0] || splashInput.files[0]) {
    alert("GitHub Actions free version currently accepts public HTTPS icon/splash URLs only. The local selected files will be ignored.");
  }

  $("buildBtn").disabled = true;
  $("progressWrap").classList.remove("hidden");
  $("result").classList.add("hidden");
  $("logs").textContent = "";
  setProgress(3, "Sending build request…");

  try {
    const r = await fetch(API_BASE + "/build", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Build request failed");
    await poll(data.jobId);
  } catch(e) {
    setProgress(0, "Build failed");
    $("logs").textContent += "\n" + e.message;
    $("buildBtn").disabled = false;
  }
};
function setProgress(n, text) {
  $("bar").style.width = n + "%";
  $("percent").textContent = n + "%";
  $("statusText").textContent = text;
}

async function poll(id) {
  const r = await fetch(API_BASE + "/status/" + encodeURIComponent(id));
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Status error");
  setProgress(j.progress || 0, j.status === "complete" ? "APK ready!" : j.status === "error" ? "Build failed" : "Building your APK…");
  $("logs").textContent = (j.logs || []).join("\\n");
  $("logs").scrollTop = $("logs").scrollHeight;

  if (j.status === "complete") {
    $("result").classList.remove("hidden");
    $("result").innerHTML = `<b>✅ APK generated successfully</b><br><span>Download your Android APK below.</span><br><a href="${j.downloadUrl}" target="_blank" rel="noopener">Download APK</a>`;
    $("buildBtn").disabled = false;
    return;
  }
  if (j.status === "error") {
    $("result").classList.remove("hidden");
    $("result").innerHTML = `<b>❌ Build failed</b><br><span>${escapeHtml(j.error || "Unknown error")}</span>`;
    $("buildBtn").disabled = false;
    return;
  }
  setTimeout(() => poll(id).catch(e => { $("logs").textContent += "\\n"+e.message; $("buildBtn").disabled=false; }), 1800);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}
