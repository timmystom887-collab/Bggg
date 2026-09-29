package com.aegispulse.security

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.TextView

/** Stable launcher: native features attach only after the dashboard is visible. */
class MainActivity : Activity() {
    private var webView: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val dashboard = try {
            WebView(this).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.allowFileAccess = true
                settings.allowContentAccess = false
                settings.cacheMode = WebSettings.LOAD_DEFAULT
                webViewClient = WebViewClient()
            }
        } catch (error: Throwable) {
            showFallback("WebView startup failed: ${error.javaClass.simpleName}")
            return
        }

        webView = dashboard
        setContentView(dashboard)
        try {
            // The Activity is already visible, but index.html has not run yet.
            // This makes every dashboard feature see AndroidBridge on first load.
            dashboard.addJavascriptInterface(NativeFeatureBridge(this), "AndroidBridge")
        } catch (_: Throwable) {
            // Keep the dashboard open if an optional native dependency fails.
        }
        dashboard.loadUrl("file:///android_asset/www/index.html")
    }

    private fun showFallback(message: String) {
        val fallback = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            setBackgroundColor(Color.rgb(15, 23, 42))
        }
        fallback.addView(TextView(this).apply {
            text = "BRIGGADE\n$message"
            textSize = 18f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        })
        setContentView(fallback)
    }

    override fun onBackPressed() {
        if (webView?.canGoBack() == true) webView?.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }
}
