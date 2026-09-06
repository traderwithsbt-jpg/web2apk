package com.example.web2apk;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.net.URLDecoder;
import android.net.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import java.util.*;

public class MainActivity extends AppCompatActivity {
    WebView web;
    FrameLayout root;
    boolean backNavigation = WEB2APK_BACK_NAVIGATION;
    boolean exitConfirm = WEB2APK_EXIT_CONFIRM;
    boolean internetCheck = WEB2APK_INTERNET_CHECK;
    boolean fileUpload = WEB2APK_FILE_UPLOAD;
    boolean fileDownload = WEB2APK_FILE_DOWNLOAD;
    boolean pullToRefresh = WEB2APK_PULL_TO_REFRESH;
    boolean zoomEnabled = WEB2APK_ZOOM_ENABLED;
    boolean externalLinks = WEB2APK_EXTERNAL_LINKS;
    boolean keepScreenOn = WEB2APK_KEEP_SCREEN_ON;
    boolean preventScreenshots = WEB2APK_PREVENT_SCREENSHOTS;
    boolean cameraPermission = WEB2APK_CAMERA_PERMISSION;
    boolean microphonePermission = WEB2APK_MICROPHONE_PERMISSION;
    boolean locationPermission = WEB2APK_LOCATION_PERMISSION;
    boolean splashEnabled = WEB2APK_SPLASH_ENABLED;
    int splashMs = WEB2APK_SPLASH_MS;
    int splashBg = Color.parseColor("WEB2APK_SPLASH_BG");
    int splashBg2 = Color.parseColor("WEB2APK_SPLASH_BG2");
    int splashText = Color.parseColor("WEB2APK_SPLASH_TEXT");
    int splashAccent = Color.parseColor("WEB2APK_SPLASH_ACCENT");
    String splashTitle = "WEB2APK_SPLASH_TITLE";
    String splashTagline = "WEB2APK_SPLASH_TAGLINE";
    String splashBgType = "WEB2APK_SPLASH_BG_TYPE";
    String splashStyle = "WEB2APK_SPLASH_LOADING";
    String splashAnimation = "WEB2APK_SPLASH_ANIMATION";
    String splashAlign = "WEB2APK_SPLASH_ALIGN";
    boolean splashShowTitle = WEB2APK_SPLASH_SHOW_TITLE;
    boolean splashShowTagline = WEB2APK_SPLASH_SHOW_TAGLINE;
    boolean splashShowLogo = WEB2APK_SPLASH_SHOW_LOGO;
    boolean splashShowLoading = WEB2APK_SPLASH_SHOW_LOADING;
    ValueCallback<Uri[]> fileCallback;
    SwipeRefreshLayout refreshContainer;
    ByteArrayOutputStream bridgeDownloadBuffer;
    String bridgeDownloadName;
    String bridgeDownloadMime;

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().getDecorView().setSystemUiVisibility(0);
        if (keepScreenOn) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (preventScreenshots) getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        root = new FrameLayout(this);
        setContentView(root);
        if (splashEnabled) {
            showSplash();
            new Handler(Looper.getMainLooper()).postDelayed(() -> showWeb(), Math.max(0, splashMs));
        } else {
            showWeb();
        }
    }

    void applySystemBarInsets(View v) {
        ViewCompat.setOnApplyWindowInsetsListener(v, (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            view.setPadding(0, bars.top, 0, bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(v);
    }

    GradientDrawable roundedBg(int color, float radius) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(radius);
        return g;
    }

    void animateView(View v) {
        if ("fade".equals(splashAnimation)) { v.setAlpha(0f); v.animate().alpha(1f).setDuration(500).start(); }
        else if ("zoom".equals(splashAnimation)) { v.setScaleX(.75f); v.setScaleY(.75f); v.setAlpha(0f); v.animate().scaleX(1f).scaleY(1f).alpha(1f).setDuration(550).start(); }
        else if ("slideup".equals(splashAnimation)) { v.setTranslationY(80f); v.setAlpha(0f); v.animate().translationY(0).alpha(1f).setDuration(500).start(); }
    }

    void showSplash() {
        FrameLayout splashRoot = new FrameLayout(this);
        if ("gradient".equals(splashBgType)) {
            GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{splashBg, splashBg2});
            splashRoot.setBackground(bg);
        } else {
            splashRoot.setBackgroundColor(splashBg);
        }
        applySystemBarInsets(splashRoot);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);
        int pad = (int)(getResources().getDisplayMetrics().density * 22);
        content.setPadding(pad, pad, pad, pad);

        if ("top".equals(splashAlign)) {
            FrameLayout.LayoutParams cp = new FrameLayout.LayoutParams(-1, -2, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
            cp.topMargin = (int)(getResources().getDisplayMetrics().density * 48);
            splashRoot.addView(content, cp);
        } else if ("bottom".equals(splashAlign)) {
            FrameLayout.LayoutParams cp = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
            cp.bottomMargin = (int)(getResources().getDisplayMetrics().density * 42);
            splashRoot.addView(content, cp);
        } else {
            splashRoot.addView(content, new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER));
        }

        if (splashShowLogo) {
            FrameLayout logoCard = new FrameLayout(this);
            GradientDrawable cardBg = new GradientDrawable();
            cardBg.setColor(Color.argb(34, 255, 255, 255));
            cardBg.setCornerRadius(getResources().getDisplayMetrics().density * 28);
            logoCard.setBackground(cardBg);
            logoCard.setPadding((int)(getResources().getDisplayMetrics().density * 18),
                    (int)(getResources().getDisplayMetrics().density * 18),
                    (int)(getResources().getDisplayMetrics().density * 18),
                    (int)(getResources().getDisplayMetrics().density * 18));
            ImageView logo = new ImageView(this);
            logo.setImageResource(R.drawable.splash_logo);
            logo.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
            logoCard.addView(logo, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
            int size = (int)(getResources().getDisplayMetrics().density * 190);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
            lp.bottomMargin = (int)(getResources().getDisplayMetrics().density * 18);
            content.addView(logoCard, lp);
            animateView(logoCard);
        }

        if (splashShowTitle) {
            TextView title = new TextView(this);
            title.setText(splashTitle);
            title.setTextColor(splashText);
            title.setTextSize(27);
            title.setGravity(Gravity.CENTER);
            title.setTypeface(null, android.graphics.Typeface.BOLD);
            title.setLetterSpacing(.01f);
            title.setPadding(16, 0, 16, 5);
            content.addView(title, new LinearLayout.LayoutParams(-1, -2));
            animateView(title);
        }

        if (splashShowTagline && splashTagline.length() > 0) {
            TextView tag = new TextView(this);
            tag.setText(splashTagline);
            tag.setTextColor(splashText);
            tag.setAlpha(.78f);
            tag.setTextSize(14);
            tag.setGravity(Gravity.CENTER);
            tag.setPadding(18, 2, 18, 18);
            content.addView(tag, new LinearLayout.LayoutParams(-1, -2));
            animateView(tag);
        }

        if (splashShowLoading && !"none".equals(splashStyle)) {
            if ("dots".equals(splashStyle)) {
                TextView dots = new TextView(this);
                dots.setText("•  •  •");
                dots.setTextColor(splashAccent);
                dots.setTextSize(18);
                dots.setGravity(Gravity.CENTER);
                content.addView(dots, new LinearLayout.LayoutParams(-1, 42));
                animateView(dots);
            } else if ("spinner".equals(splashStyle)) {
                ProgressBar spinner = new ProgressBar(this);
                spinner.setIndeterminate(true);
                content.addView(spinner, new LinearLayout.LayoutParams(44, 44));
                animateView(spinner);
            } else {
                ProgressBar bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
                bar.setIndeterminate(true);
                android.graphics.drawable.GradientDrawable track = new android.graphics.drawable.GradientDrawable();
                track.setColor(Color.argb(55, 255, 255, 255));
                track.setCornerRadius(20);
                android.graphics.drawable.GradientDrawable progress = new android.graphics.drawable.GradientDrawable();
                progress.setColor(splashAccent);
                progress.setCornerRadius(20);
                android.graphics.drawable.ClipDrawable clipped = new android.graphics.drawable.ClipDrawable(progress, Gravity.LEFT, 1);
                bar.setProgressDrawable(new android.graphics.drawable.LayerDrawable(new android.graphics.drawable.Drawable[]{track, clipped}));
                bar.setIndeterminate(false);
                bar.setMax(100);
                bar.setProgress(72);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams((int)(getResources().getDisplayMetrics().density * 220), 9);
                lp.topMargin = 8;
                content.addView(bar, lp);
                animateView(bar);
            }
        }

        root.removeAllViews();
        root.addView(splashRoot, new FrameLayout.LayoutParams(-1, -1));
    }

    void showWeb() {
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        applySystemBarInsets(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(zoomEnabled);
        s.setBuiltInZoomControls(zoomEnabled);
        s.setDisplayZoomControls(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(false);
        if (Build.VERSION.SDK_INT >= 16) s.setAllowUniversalAccessFromFileURLs(true);

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if (externalLinks && r != null && r.getUrl() != null) {
                    String u = r.getUrl().toString();
                    if (u.startsWith("tel:") || u.startsWith("mailto:") || u.startsWith("whatsapp:") || u.startsWith("intent:") || u.startsWith("geo:")) {
                        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u))); return true; } catch(Exception ignored) {}
                    }
                }
                return false;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) { return false; }
            @Override public void onPageFinished(WebView v, String u) { if (refreshContainer != null) refreshContainer.setRefreshing(false); injectDownloadBridge(); }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (internetCheck && r.isForMainFrame() && !isOnline()) showOffline();
            }
        });

        if (fileDownload) web.setDownloadListener((url,userAgent,contentDisposition,mime,contentLength) -> {
            try {
                if (url == null || url.trim().isEmpty()) return;
                Uri uri = Uri.parse(url);
                if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch(Exception ignored) {}
                    return;
                }

                android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                if (dm == null) return;

                android.app.DownloadManager.Request req = new android.app.DownloadManager.Request(uri);
                req.setTitle(getString(com.example.web2apk.R.string.app_name));
                req.setDescription("Downloading file…");
                req.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setAllowedOverMetered(true);
                req.setAllowedOverRoaming(true);
                if (mime != null && !mime.trim().isEmpty()) req.setMimeType(mime);

                String cookie = android.webkit.CookieManager.getInstance().getCookie(url);
                if (cookie != null && !cookie.isEmpty()) req.addRequestHeader("Cookie", cookie);
                if (userAgent != null && !userAgent.isEmpty()) req.addRequestHeader("User-Agent", userAgent);
                req.addRequestHeader("Accept", "*/*");

                String fileName = null;
                try {
                    fileName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mime);
                } catch(Exception ignored) {}
                if (fileName == null || fileName.trim().isEmpty()) fileName = "download";
                req.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, fileName);
                dm.enqueue(req);
                android.widget.Toast.makeText(this, "Download started — check Downloads", android.widget.Toast.LENGTH_SHORT).show();
            } catch(Exception e) {
                android.widget.Toast.makeText(this, "Download failed: " + e.getMessage(), android.widget.Toast.LENGTH_LONG).show();
            }
        });

        if (fileDownload) {
            web.addJavascriptInterface(new Object() {
                @JavascriptInterface public void startDownload(String name, String mime) {
                    bridgeDownloadBuffer = new ByteArrayOutputStream();
                    bridgeDownloadName = sanitizeFileName(name);
                    bridgeDownloadMime = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
                }
                @JavascriptInterface public void appendDownload(String chunk) {
                    try {
                        if (bridgeDownloadBuffer == null || chunk == null) return;
                        byte[] bytes = Base64.decode(chunk, Base64.DEFAULT);
                        bridgeDownloadBuffer.write(bytes);
                    } catch (Exception ignored) {}
                }
                @JavascriptInterface public void finishDownload() {
                    if (bridgeDownloadBuffer == null) return;
                    try {
                        saveBridgeDownload(bridgeDownloadBuffer.toByteArray(), bridgeDownloadName, bridgeDownloadMime);
                    } finally {
                        bridgeDownloadBuffer = null; bridgeDownloadName = null; bridgeDownloadMime = null;
                    }
                }
                @JavascriptInterface public void cancelDownload() {
                    bridgeDownloadBuffer = null; bridgeDownloadName = null; bridgeDownloadMime = null;
                }
            }, "AndroidDownload");
        }

        if (fileUpload || cameraPermission || microphonePermission || locationPermission) web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    ArrayList<String> allowed = new ArrayList<>();
                    for (String r : request.getResources()) {
                        if (r.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE) && cameraPermission) allowed.add(r);
                        if (r.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE) && microphonePermission) allowed.add(r);
                    }
                    if (!allowed.isEmpty()) request.grant(allowed.toArray(new String[0])); else request.deny();
                });
            }
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (locationPermission && Build.VERSION.SDK_INT < 23) { callback.invoke(origin, true, false); return; }
                if (locationPermission && Build.VERSION.SDK_INT >= 23 && checkSelfPermission("android.permission.ACCESS_FINE_LOCATION") == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    callback.invoke(origin, false, false);
                }
            }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                fileCallback = cb;
                Intent i;
                try { i = p.createIntent(); } catch(Exception e) { fileCallback=null; return false; }
                try { startActivityForResult(i, 101); } catch(Exception e) { fileCallback=null; return false; }
                return true;
            }
        });

        refreshContainer = new SwipeRefreshLayout(this);
        refreshContainer.setEnabled(pullToRefresh);
        refreshContainer.setOnRefreshListener(() -> web.reload());
        refreshContainer.addView(web, new SwipeRefreshLayout.LayoutParams(-1, -1));
        applySystemBarInsets(refreshContainer);
        root.removeAllViews(); root.addView(refreshContainer, new FrameLayout.LayoutParams(-1, -1));
        requestOptionalPermissions();
        if (internetCheck && !isOnline()) showOffline(); else web.loadUrl("WEB2APK_WEBSITE_URL");

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (backNavigation && web != null && web.canGoBack()) web.goBack();
                else if (exitConfirm) new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Exit").setMessage("Do you want to exit the app?")
                    .setNegativeButton("Cancel", null).setPositiveButton("Exit", (d,w) -> finish()).show();
                else finish();
            }
        });
    }

    String sanitizeFileName(String name) {
        if (name == null || name.trim().isEmpty()) name = "download";
        name = name.replaceAll("[\\/:*?\"<>|]", "_").trim();
        if (name.length() > 180) name = name.substring(0, 180);
        return name.isEmpty() ? "download" : name;
    }

    void saveBridgeDownload(byte[] data, String name, String mime) {
        try {
            name = sanitizeFileName(name);
            if (Build.VERSION.SDK_INT >= 29) {
                android.content.ContentValues values = new android.content.ContentValues();
                values.put(android.provider.MediaStore.Downloads.DISPLAY_NAME, name);
                values.put(android.provider.MediaStore.Downloads.MIME_TYPE, mime);
                values.put(android.provider.MediaStore.Downloads.IS_PENDING, 1);
                Uri collection = android.provider.MediaStore.Downloads.getContentUri(android.provider.MediaStore.VOLUME_EXTERNAL_PRIMARY);
                Uri item = getContentResolver().insert(collection, values);
                if (item == null) throw new Exception("Could not create Downloads file");
                try (java.io.OutputStream out = getContentResolver().openOutputStream(item)) {
                    if (out == null) throw new Exception("Could not open Downloads file");
                    out.write(data);
                }
                values.clear(); values.put(android.provider.MediaStore.Downloads.IS_PENDING, 0);
                getContentResolver().update(item, values, null, null);
            } else {
                if (checkSelfPermission("android.permission.WRITE_EXTERNAL_STORAGE") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{"android.permission.WRITE_EXTERNAL_STORAGE"}, 303);
                    Toast.makeText(this, "Allow storage permission, then download again", Toast.LENGTH_LONG).show();
                    return;
                }
                File dir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                File outFile = new File(dir, name);
                try (FileOutputStream out = new FileOutputStream(outFile)) { out.write(data); }
                sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(outFile)));
            }
            Toast.makeText(this, "File saved to Downloads", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    void injectDownloadBridge() {
        if (!fileDownload || web == null) return;
        String js = "javascript:(function(){if(window.__web2apk_dl)return;window.__web2apk_dl=1;" +
            "function send(b,n){n=n||'download';var m=b.type||'application/octet-stream',z=524288,i=0;" +
            "try{AndroidDownload.startDownload(n,m)}catch(e){return}" +
            "function nx(){if(i>=b.size){try{AndroidDownload.finishDownload()}catch(e){}return}" +
            "var r=new FileReader(),e=Math.min(i+z,b.size);r.onload=function(){try{AndroidDownload.appendDownload(r.result.split(',')[1]);i=e;nx()}catch(x){try{AndroidDownload.cancelDownload()}catch(q){}}};r.onerror=function(){try{AndroidDownload.cancelDownload()}catch(q){}};r.readAsDataURL(b.slice(i,e))}nx()}" +
            "document.addEventListener('click',function(ev){var a=ev.target.closest?ev.target.closest('a'):null;if(!a)return;var h=a.href||a.getAttribute('href')||'',n=a.getAttribute('download')||'download';" +
            "if(h.indexOf('blob:')===0||h.indexOf('data:')===0){ev.preventDefault();ev.stopPropagation();fetch(h).then(function(r){return r.blob()}).then(function(b){send(b,n)}).catch(function(){})}},true);" +
            "})();";
        web.evaluateJavascript(js, null);
    }

    void requestOptionalPermissions() {
        ArrayList<String> p = new ArrayList<>();
        if (cameraPermission && Build.VERSION.SDK_INT >= 23) p.add("android.permission.CAMERA");
        if (microphonePermission && Build.VERSION.SDK_INT >= 23) p.add("android.permission.RECORD_AUDIO");
        if (locationPermission && Build.VERSION.SDK_INT >= 23) p.add("android.permission.ACCESS_FINE_LOCATION");
        if (fileDownload && Build.VERSION.SDK_INT >= 23 && Build.VERSION.SDK_INT <= 28 && checkSelfPermission("android.permission.WRITE_EXTERNAL_STORAGE") != android.content.pm.PackageManager.PERMISSION_GRANTED) p.add("android.permission.WRITE_EXTERNAL_STORAGE");
        if (!p.isEmpty() && Build.VERSION.SDK_INT >= 23) requestPermissions(p.toArray(new String[0]), 202);
    }

    boolean isOnline() {
        ConnectivityManager cm=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
        Network n=cm.getActiveNetwork(); if(n==null) return false;
        NetworkCapabilities c=cm.getNetworkCapabilities(n);
        return c!=null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    void showOffline() {
        LinearLayout box=new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setGravity(Gravity.CENTER); box.setPadding(32,32,32,32); box.setBackgroundColor(splashBg); applySystemBarInsets(box);
        TextView t=new TextView(this); t.setText("No Internet Connection\n\nTurn on Wi-Fi or mobile data and try again."); t.setTextColor(splashText); t.setGravity(Gravity.CENTER); t.setTextSize(18);
        box.addView(t,new LinearLayout.LayoutParams(-1,-2));
        Button b=new Button(this); b.setText("Retry"); b.setOnClickListener(v -> { if(isOnline()) { root.removeAllViews(); root.addView(web,new FrameLayout.LayoutParams(-1,-1)); web.loadUrl("WEB2APK_WEBSITE_URL"); } });
        LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(-1,-2); bp.topMargin=24; box.addView(b,bp);
        root.removeAllViews(); root.addView(box,new FrameLayout.LayoutParams(-1,-1));
    }

    @Override protected void onActivityResult(int r,int c,Intent d) {
        super.onActivityResult(r,c,d);
        if(r==101 && fileCallback!=null) {
            Uri[] u = null;
            if(c==RESULT_OK && d!=null) {
                if(d.getClipData()!=null) { int n=d.getClipData().getItemCount(); u=new Uri[n]; for(int i=0;i<n;i++)u[i]=d.getClipData().getItemAt(i).getUri(); }
                else if(d.getData()!=null) u=new Uri[]{d.getData()};
            }
            fileCallback.onReceiveValue(u); fileCallback=null;
        }
    }
}
