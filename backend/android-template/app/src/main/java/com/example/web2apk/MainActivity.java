package com.example.web2apk;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import java.util.*;

public class MainActivity extends AppCompatActivity {
    WebView web;
    FrameLayout root;
    boolean exitConfirm = WEB2APK_EXIT_CONFIRM;
    boolean internetCheck = WEB2APK_INTERNET_CHECK;
    boolean fileUpload = WEB2APK_FILE_UPLOAD;
    boolean fileDownload = WEB2APK_FILE_DOWNLOAD;
    int splashMs = WEB2APK_SPLASH_MS;
    ValueCallback<Uri[]> fileCallback;

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(Color.rgb(11,16,32));
        root = new FrameLayout(this);
        setContentView(root);
        showSplash();
        new Handler().postDelayed(() -> showWeb(), Math.max(0, splashMs));
    }

    void showSplash() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(Color.rgb(11,16,32));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.splash_logo);
        logo.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        int s = (int)(getResources().getDisplayMetrics().density * 120);
        box.addView(logo, new LinearLayout.LayoutParams(s,s));

        TextView title = new TextView(this);
        title.setText("WEB2APK_APP_NAME");
        title.setTextColor(Color.WHITE);
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0,20,0,16);
        box.addView(title);

        ProgressBar bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100); bar.setProgress(100);
        box.addView(bar, new LinearLayout.LayoutParams((int)(getResources().getDisplayMetrics().density*220), 12));

        root.removeAllViews(); root.addView(box);
    }

    void showWeb() {
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(false);
        if (Build.VERSION.SDK_INT >= 16) s.setAllowUniversalAccessFromFileURLs(true);

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return false;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return false;
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (internetCheck && !isOnline() && r.isForMainFrame()) showOffline();
            }
        });

        if (fileDownload) web.setDownloadListener((url,userAgent,contentDisposition,mime,contentLength) -> {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            try { startActivity(i); } catch(Exception ignored) {}
        });

        if (fileUpload) web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                fileCallback = cb;
                Intent i;
                try { i = p.createIntent(); } catch(Exception e) { fileCallback=null; return false; }
                try { startActivityForResult(i, 101); } catch(Exception e) { fileCallback=null; return false; }
                return true;
            }
        });

        root.removeAllViews(); root.addView(web);
        if (internetCheck && !isOnline()) showOffline();
        else web.loadUrl("WEB2APK_WEBSITE_URL");

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (web != null && web.canGoBack()) web.goBack();
                else if (exitConfirm) new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Exit")
                    .setMessage("Do you want to exit the app?")
                    .setNegativeButton("Cancel", null)
                    .setPositiveButton("Exit", (d,w) -> finish()).show();
                else finish();
            }
        });
    }

    boolean isOnline() {
        ConnectivityManager cm=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
        Network n=cm.getActiveNetwork();
        if(n==null) return false;
        NetworkCapabilities c=cm.getNetworkCapabilities(n);
        return c!=null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    void showOffline() {
        LinearLayout box=new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setGravity(Gravity.CENTER); box.setPadding(32,32,32,32);
        TextView t=new TextView(this); t.setText("No Internet Connection\n\nTurn on Wi-Fi or mobile data and try again."); t.setGravity(Gravity.CENTER); t.setTextSize(18);
        box.addView(t,new LinearLayout.LayoutParams(-1,-2));
        Button b=new Button(this); b.setText("Retry"); b.setOnClickListener(v -> { if(isOnline()) { root.removeAllViews(); root.addView(web); web.loadUrl("WEB2APK_WEBSITE_URL"); } });
        LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(-1,-2); bp.topMargin=24; box.addView(b,bp);
        root.removeAllViews(); root.addView(box);
    }

    @Override protected void onActivityResult(int r,int c,Intent d) {
        super.onActivityResult(r,c,d);
        if(r==101 && fileCallback!=null) {
            Uri[] u = null;
            if(c==RESULT_OK && d!=null) {
                if(d.getClipData()!=null) {
                    int n=d.getClipData().getItemCount(); u=new Uri[n];
                    for(int i=0;i<n;i++) u[i]=d.getClipData().getItemAt(i).getUri();
                } else if(d.getData()!=null) u=new Uri[]{d.getData()};
            }
            fileCallback.onReceiveValue(u); fileCallback=null;
        }
    }
}
