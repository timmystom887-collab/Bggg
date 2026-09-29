package com.aegispulse.security

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.TextView

/** Production Android launcher: full responsive WebView with native hardware bridges. */
class MainActivity : Activity() {
    private var webView: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Immersive dark tactical UI colors
        window.apply {
            statusBarColor = Color.parseColor("#0a0d14")
            navigationBarColor = Color.parseColor("#0a0d14")
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                decorView.systemUiVisibility = decorView.systemUiVisibility and View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
            }
        }

        val dashboard = try {
            WebView(this).apply {
                setBackgroundColor(Color.parseColor("#0a0d14"))
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    databaseEnabled = true
                    allowFileAccess = true
                    allowContentAccess = true
                    useWideViewPort = true
                    loadWithOverviewMode = true
                    builtInZoomControls = false
                    displayZoomControls = false
                    setSupportZoom(false)
                    cacheMode = WebSettings.LOAD_DEFAULT
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    }
                }
                
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        // Trigger native status refresh
                        view?.evaluateJavascript("if (window.initPrivateInvestigatorModule) window.initPrivateInvestigatorModule();", null)
                    }
                }
                
                webChromeClient = object : WebChromeClient() {
                    override fun onPermissionRequest(request: PermissionRequest?) {
                        request?.grant(request.resources)
                    }
                    override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                        return super.onConsoleMessage(consoleMessage)
                    }
                }
            }
        } catch (error: Throwable) {
            showFallback("WebView startup failed: ${error.javaClass.simpleName}")
            return
        }

        webView = dashboard
        setContentView(dashboard)
        try {
            dashboard.addJavascriptInterface(NativeFeatureBridge(this), "AndroidBridge")
        } catch (_: Throwable) {
        }
        dashboard.loadUrl("file:///android_asset/www/index.html")
    }

    private fun showFallback(message: String) {
        val fallback = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            setBackgroundColor(Color.rgb(10, 13, 20))
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
