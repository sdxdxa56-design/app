package com.yemen.opensooq;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    // الرابط المباشر للموقع المستضاف (النطاق الجديد والسريع)
    private static final String TARGET_URL = "https://fgh-x4h9.vercel.app/";
    private static final int FILECHOOSER_RESULTCODE = 1001;
    private static final int PERMISSION_REQUEST_CODE = 2002;

    private WebView mWebView;
    private SwipeRefreshLayout mSwipeRefresh;
    private ValueCallback<Uri[]> mFilePathCallback;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        mSwipeRefresh = new SwipeRefreshLayout(this);
        mWebView = new WebView(this);
        
        mSwipeRefresh.setBackgroundColor(Color.WHITE);
        mWebView.setBackgroundColor(Color.WHITE);

        // منع تداخل التمرير والسحب بين SwipeRefresh و WebView لتجنب تعليق اللمس
        mSwipeRefresh.setOnChildScrollUpCallback((parent, child) -> mWebView != null && mWebView.getScrollY() > 0);

        mSwipeRefresh.addView(mWebView);
        setContentView(mSwipeRefresh);

        // تفعيل ملفات الكوكيز والارتباط للطرف الثالث
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(mWebView, true);
        }

        WebSettings webSettings = mWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        // تفعيل وضع سطح المكتب الواسع والمصغر (Desktop View Scaled) بدقة عالية ومساحة كاملة
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);
        webSettings.setTextZoom(100);
        webSettings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
        mWebView.setInitialScale(0);

        // السماح بالجيل الجديد من الويب وإدارة النوافذ والشبكة
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        webSettings.setSupportMultipleWindows(true);
        webSettings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // معرف متصفح سطح المكتب الكامل (Desktop Chrome User Agent)
        String desktopUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
        webSettings.setUserAgentString(desktopUA);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        mSwipeRefresh.setOnRefreshListener(() -> mWebView.reload());

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                mSwipeRefresh.setRefreshing(false);

                // تصغير العرض المكتبي ليتناسب مع الشاشة أفقياً تماماً كمتصفح Brave/Chrome في وضع سطح المكتب
                view.evaluateJavascript(
                    "try {" +
                    "  var meta = document.querySelector('meta[name=\"viewport\"]');" +
                    "  if (meta) {" +
                    "    meta.setAttribute('content', 'width=1180, initial-scale=0.35, minimum-scale=0.2, maximum-scale=3.0, user-scalable=yes');" +
                    "  } else {" +
                    "    var m = document.createElement('meta');" +
                    "    m.name = 'viewport';" +
                    "    m.content = 'width=1180, initial-scale=0.35, minimum-scale=0.2, maximum-scale=3.0, user-scalable=yes';" +
                    "    document.head.appendChild(m);" +
                    "  }" +
                    "} catch(e) {}", null);
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, android.net.http.SslError error) {
                // السماح باستمرار الاتصال في حال وجود شهادات مؤقتة لمنع التجمد
                handler.proceed();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                mSwipeRefresh.setRefreshing(false);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;

                // التعامل مع الروابط الخاصة والتطبيقات الخارجية (واتساب، اتصال، إيميل)
                if (url.startsWith("whatsapp://") || url.startsWith("https://wa.me/") ||
                    url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("geo:") ||
                    url.startsWith("intent://")) {
                    try {
                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                        if (intent != null) {
                            startActivity(intent);
                            return true;
                        }
                    } catch (Exception e) {
                        try {
                            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                            return true;
                        } catch (Exception ex) {
                            Toast.makeText(MainActivity.this, "تعذر فتح التطبيق المطلوب", Toast.LENGTH_SHORT).show();
                            return true;
                        }
                    }
                }

                // إرجاع false لجميع روابط HTTP/HTTPS لجعل الـ WebView يعالجها تلقائياً بالكامل
                // هذا يضمن الحفاظ على جلسة الكوكيز ورؤوس طلبات تسجيل الدخول (Google Auth) لمنع الشاشة الضبابية
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false;
                }

                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    return shouldOverrideUrlLoading(view, request.getUrl().toString());
                }
                return false;
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            // فتح النوافذ المنبثقة بشكل صحيح داخل Dialog لمنع تعليق النظام أو ظهور الشاشة الضبابية
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                WebView popupWebView = new WebView(MainActivity.this);
                WebSettings popupWebSettings = popupWebView.getSettings();
                popupWebSettings.setJavaScriptEnabled(true);
                popupWebSettings.setDomStorageEnabled(true);
                popupWebSettings.setDatabaseEnabled(true);
                popupWebSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                popupWebSettings.setSupportMultipleWindows(true);

                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    cookieManager.setAcceptThirdPartyCookies(popupWebView, true);
                }

                Dialog dialog = new Dialog(MainActivity.this, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
                dialog.setContentView(popupWebView);
                dialog.show();

                popupWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        dialog.dismiss();
                    }
                });

                popupWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, String url) {
                        if (url != null && (url.startsWith("whatsapp://") || url.startsWith("tel:") || url.startsWith("mailto:"))) {
                            try {
                                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                                return true;
                            } catch (Exception e) {
                                return false;
                            }
                        }
                        return false;
                    }
                });

                dialog.setOnDismissListener(d -> {
                    try {
                        popupWebView.destroy();
                    } catch (Exception ignored) {}
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
                contentSelectionIntent.setType("image/*");

                Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
                chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
                chooserIntent.putExtra(Intent.EXTRA_TITLE, "اختر صورة الإعلان");

                startActivityForResult(chooserIntent, FILECHOOSER_RESULTCODE);
                return true;
            }
        });

        checkAndRequestPermissions();
        mWebView.loadUrl(TARGET_URL);
    }

    private void checkAndRequestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] permissions = new String[]{
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.READ_EXTERNAL_STORAGE
            };
            boolean needRequest = false;
            for (String p : permissions) {
                if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                    needRequest = true;
                    break;
                }
            }
            if (needRequest) {
                ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (mFilePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

