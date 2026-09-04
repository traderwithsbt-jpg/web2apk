package com.example.web2apk;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
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
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        if ("gradient".equals(splashBgType)) {
            GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{splashBg, splashBg2});
            box.setBackground(bg);
        } else {
            box.setBackgroundColor(splashBg);
        }
        applySystemBarInsets(box);

        if ("top".equals(splashAlign)) box.setGravity(Gravity.CENTER_HORIZONTAL | Gravity.TOP);
        if ("bottom".equals(splashAlign)) box.setGravity(Gravity.CENTER_HORIZONTAL | Gravity.BOTTOM);

        if (splashShowLogo) {
            ImageView logo = new ImageView(this);
            logo.setImageResource(R.drawable.splash_logo);
            logo.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
            int s = (int)(getResources().getDisplayMetrics().density * 120);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(s, s);
            lp.bottomMargin = 10;
            box.addView(logo, lp);
            animateView(logo);
        }

        if (splashShowTitle) {
            TextView title = new TextView(this);
            title.setText(splashTitle);
            title.setTextColor(splashText);
            title.setTextSize(24);
            title.setGravity(Gravity.CENTER);
            title.setTypeface(null, android.graphics.Typeface.BOLD);
            title.setPadding(20, 10, 20, 6);
            box.addView(title, new LinearLayout.LayoutParams(-1, -2));
            animateView(title);
        }

        if (splashShowTagline && splashTagline.length() > 0) {
            TextView tag = new TextView(this);
            tag.setText(splashTagline);
            tag.setTextColor(splashText);
            tag.setAlpha(.78f);
            tag.setTextSize(14);
            tag.setGravity(Gravity.CENTER);
            tag.setPadding(20, 0, 20, 18);
            box.addView(tag, new LinearLayout.LayoutParams(-1, -2));
            animateView(tag);
        }

        if (splashShowLoading && !"none".equals(splashStyle)) {
            if ("dots".equals(splashStyle)) {
                TextView dots = new TextView(this);
                dots.setText("•••");
                dots.setTextColor(splashAccent);
                dots.setTextSize(24);
                dots.setGravity(Gravity.CENTER);
                box.addView(dots, new LinearLayout.LayoutParams(-1, 42));
                animateView(dots);
            } else {
                ProgressBar bar = new ProgressBar(this, null, "spinner".equals(splashStyle) ? android.R.attr.progressBarStyle : android.R.attr.progressBarStyleHorizontal);
                if (bar.isIndeterminate() && "spinner".equals(splashStyle)) {
                    box.addView(bar, new LinearLayout.LayoutParams(48, 48));
                } else {
                    bar.setIndeterminate(false); bar.setMax(100); bar.setProgress(100);
                    box.addView(bar, new LinearLayout.LayoutParams((int)(getResources().getDisplayMetrics().density*220), 10));
                }
                animateView(bar);
            }
        }
        root.removeAllViews(); root.addView(box, new FrameLayout.LayoutParams(-1, -1));
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
            @Override public void onPageFinished(WebView v, String u) { if (refreshContainer != null) refreshContainer.setRefreshing(false); }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (internetCheck && r.isForMainFrame() && !isOnline()) showOffline();
            }
        });

        if (fileDownload) web.setDownloadListener((url,userAgent,contentDisposition,mime,contentLength) -> {
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch(Exception ignored) {}
        });

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

    void requestOptionalPermissions() {
        ArrayList<String> p = new ArrayList<>();
        if (cameraPermission && Build.VERSION.SDK_INT >= 23) p.add("android.permission.CAMERA");
        if (microphonePermission && Build.VERSION.SDK_INT >= 23) p.add("android.permission.RECORD_AUDIO");
        if (locationPermission && Build.VERSION.SDK_INT >= 23) p.add("android.permission.ACCESS_FINE_LOCATION");
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
