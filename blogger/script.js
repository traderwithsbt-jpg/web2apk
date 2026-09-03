(() => {
  "use strict";

  const API_BASE = "https://web2apk.traderwithsbt.workers.dev";
  const $ = id => document.getElementById(id);
  const iconInput = $("icon");
  const splashInput = $("splash");

  function preview(input, img) {
    input.addEventListener("change", () => {
      const f = input.files && input.files[0];
      if (!f) return;
      if (!f.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        input.value = "";
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        alert("Image must be 10 MB or smaller.");
        input.value = "";
        return;
      }
      if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
      img.dataset.url = URL.createObjectURL(f);
      img.src = img.dataset.url;
      img.style.display = "block";
    });
  }

  preview(iconInput, $("iconPreview"));
  preview(splashInput, $("splashPreview"));

  $("themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    $("themeBtn").textContent = document.body.classList.contains("dark") ? "☀" : "☾";
  });

  function packageFromName(name) {
    let v = String(name || "app").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18);
    if (!v || !/^[a-z]/.test(v)) v = "app";
    return "com.web2apk." + v;
  }

  $("appName").addEventListener("input", e => {
    if (!$("packageName").dataset.edited) $("packageName").value = packageFromName(e.target.value);
  });
  $("packageName").addEventListener("input", () => $("packageName").dataset.edited = "1");

  function setProgress(n, text) {
    $("bar").style.width = Math.max(0, Math.min(100, n)) + "%";
    $("percent").textContent = Math.max(0, Math.min(100, n)) + "%";
    $("statusText").textContent = text;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  }

  function canvasBlob(file, kind) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read image."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not decode image."));
        img.onload = () => {
          let maxW = kind === "icon" ? 512 : 1080;
          let maxH = kind === "icon" ? 512 : 1920;
          let sw = img.width, sh = img.height;
          if (kind === "icon") {
            const side = Math.min(sw, sh);
            const sx = Math.floor((sw - side) / 2), sy = Math.floor((sh - side) / 2);
            sw = sh = side;
            const scale = Math.min(1, maxW / side);
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(side * scale));
            canvas.height = canvas.width;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image compression failed.")), "image/webp", .86);
          } else {
            const scale = Math.min(1, maxW / sw, maxH / sh);
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(sw * scale));
            canvas.height = Math.max(1, Math.round(sh * scale));
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image compression failed.")), "image/webp", .86);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function poll(id) {
    const r = await fetch(API_BASE + "/status/" + encodeURIComponent(id), { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Status check failed");

    setProgress(j.progress || 0,
      j.status === "complete" ? "APK ready!" :
      j.status === "error" ? "Build failed" :
      j.status === "queued" ? "Waiting for GitHub Actions…" : "Building your APK…");

    $("logs").textContent = (j.logs || []).join("\n");
    $("logs").scrollTop = $("logs").scrollHeight;

    if (j.status === "complete") {
      const result = $("result");
      result.classList.remove("hidden");
      result.innerHTML = "";
      const b = document.createElement("b");
      b.textContent = "✅ APK generated successfully";
      const br = document.createElement("br");
      const span = document.createElement("span");
      span.textContent = "Download your Android APK below.";
      const br2 = document.createElement("br");
      const a = document.createElement("a");
      a.href = j.downloadUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Download APK";
      result.append(b, br, span, br2, a);
      $("buildBtn").disabled = false;
      return;
    }

    if (j.status === "error") {
      $("result").classList.remove("hidden");
      $("result").innerHTML = "<b>❌ Build failed</b><br><span>" + escapeHtml(j.error || "Unknown build error") + "</span>";
      $("buildBtn").disabled = false;
      return;
    }

    setTimeout(() => poll(id).catch(showBuildError), 2000);
  }

  function showBuildError(e) {
    setProgress(0, "Build failed");
    $("logs").textContent += "\n" + (e.message || e);
    $("result").classList.remove("hidden");
    $("result").innerHTML = "<b>❌ Error</b><br><span>" + escapeHtml(e.message || e) + "</span>";
    $("buildBtn").disabled = false;
  }

  $("buildBtn").addEventListener("click", async () => {
    const url = $("url").value.trim();
    const appName = $("appName").value.trim() || "My Website App";
    if (!/^https?:\/\/.+/i.test(url)) {
      alert("Please enter a valid http/https website URL.");
      return;
    }

    const fd = new FormData();
    fd.append("url", url);
    fd.append("appName", appName);
    fd.append("packageName", $("packageName").value.trim() || packageFromName(appName));
    fd.append("versionName", $("versionName").value.trim() || "1.0");
    fd.append("versionCode", $("versionCode").value.trim() || "1");
    fd.append("orientation", $("orientation").value);
    fd.append("splashMs", $("splashMs").value || "2000");
    fd.append("exitConfirm", String($("exitConfirm").checked));
    fd.append("internetCheck", String($("internetCheck").checked));
    fd.append("fileUpload", String($("fileUpload").checked));
    fd.append("fileDownload", String($("fileDownload").checked));
    fd.append("iconUrl", $("iconUrl") ? $("iconUrl").value.trim() : "");
    fd.append("splashUrl", $("splashUrl") ? $("splashUrl").value.trim() : "");

    try {
      if (iconInput.files[0]) {
        setProgress(1, "Preparing app icon…");
        fd.append("icon", await canvasBlob(iconInput.files[0], "icon"), "icon.webp");
      }
      if (splashInput.files[0]) {
        setProgress(2, "Preparing splash logo…");
        fd.append("splash", await canvasBlob(splashInput.files[0], "splash"), "splash.webp");
      }
    } catch (e) {
      showBuildError(e);
      return;
    }

    $("buildBtn").disabled = true;
    $("progressWrap").classList.remove("hidden");
    $("result").classList.add("hidden");
    $("logs").textContent = "";
    setProgress(5, "Sending build request…");

    try {
      const r = await fetch(API_BASE + "/build", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Build request failed");
      await poll(data.jobId);
    } catch (e) {
      showBuildError(e);
    }
  });
})();
