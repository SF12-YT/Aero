package com.sf12.f1garage;

import android.app.Activity;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.FileNotFoundException;
import java.io.InputStream;
import java.util.Collections;

/**
 * Hosts the bundled web viewer from a virtual HTTPS origin.
 *
 * Android WebView treats file:// origins specially and can block XMLHttpRequest
 * for local binary assets. GLTFLoader requests the GLB using XHR, so serving the
 * APK's assets through this same-origin URL makes model loading reliable while
 * keeping the installed app completely offline.
 */
public final class MainActivity extends Activity {
    private static final String TAG = "AeroLab25";
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String ASSET_PREFIX = "/assets/";
    private static final String START_URL = "https://" + ASSET_HOST + ASSET_PREFIX + "index.html";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(8, 14, 24));
        window.setNavigationBarColor(Color.rgb(8, 14, 24));
        window.getDecorView().setSystemUiVisibility(0);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(8, 14, 24));
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return serveBundledAsset(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return serveBundledAsset(Uri.parse(url));
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                Log.e(TAG, "Asset HTTP error " + errorResponse.getStatusCode() + ": " + request.getUrl());
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                Log.d(TAG, "WebView " + message.messageLevel() + ": " + message.message()
                        + " (" + message.sourceId() + ":" + message.lineNumber() + ")");
                return true;
            }
        });

        setContentView(webView);
        webView.loadUrl(START_URL);
    }

    private WebResourceResponse serveBundledAsset(Uri uri) {
        if (uri == null || !"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost())) {
            return null;
        }

        String path = Uri.decode(uri.getPath());
        if (path == null || !path.startsWith(ASSET_PREFIX)) return null;
        String assetPath = path.substring(ASSET_PREFIX.length());
        if (assetPath.isEmpty() || assetPath.startsWith("/") || assetPath.contains("..")) {
            return errorResponse(400, "Bad Request", "Invalid asset path");
        }

        try {
            AssetManager assets = getAssets();
            InputStream stream = assets.open(assetPath, AssetManager.ACCESS_STREAMING);
            String mimeType = mimeTypeFor(assetPath);
            String encoding = isTextAsset(assetPath) ? "UTF-8" : null;
            return new WebResourceResponse(mimeType, encoding, stream);
        } catch (FileNotFoundException exception) {
            Log.e(TAG, "Bundled asset not found: " + assetPath, exception);
            return errorResponse(404, "Not Found", "Bundled asset not found: " + assetPath);
        } catch (Exception exception) {
            Log.e(TAG, "Could not serve bundled asset: " + assetPath, exception);
            return errorResponse(500, "Internal Server Error", "Could not read bundled asset");
        }
    }

    private static String mimeTypeFor(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".glb")) return "model/gltf-binary";
        if (lower.endsWith(".gltf")) return "model/gltf+json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    private static boolean isTextAsset(String path) {
        String lower = path.toLowerCase();
        return lower.endsWith(".html") || lower.endsWith(".js") || lower.endsWith(".css")
                || lower.endsWith(".json") || lower.endsWith(".svg");
    }

    private static WebResourceResponse errorResponse(int status, String reason, String message) {
        byte[] bytes = message.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        InputStream body = new java.io.ByteArrayInputStream(bytes);
        return new WebResourceResponse("text/plain", "UTF-8", status, reason,
                Collections.singletonMap("Cache-Control", "no-store"), body);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
