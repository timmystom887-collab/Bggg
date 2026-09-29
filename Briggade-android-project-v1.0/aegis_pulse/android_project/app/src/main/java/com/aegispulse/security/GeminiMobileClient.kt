package com.aegispulse.security

import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class GeminiMobileClient(private val apiKey: String) {
    private val models = listOf("gemini-2.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash")

    fun queryGemini(prompt: String, systemInstruction: String? = null): String {
        if (apiKey.isBlank()) return "Gemini is not configured. Add a Gemini API key in the app settings before using network AI features."
        for (model in models) {
            try {
                val url = URL("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json")
                    connectTimeout = 10000
                    readTimeout = 20000
                    doOutput = true
                }
                val payload = JSONObject().apply {
                    put("contents", JSONArray().put(JSONObject().put("parts", JSONArray().put(JSONObject().put("text", prompt)))))
                    systemInstruction?.let { put("systemInstruction", JSONObject().put("parts", JSONArray().put(JSONObject().put("text", it)))) }
                }
                OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
                if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                    val resp = conn.inputStream.bufferedReader().use { it.readText() }
                    return JSONObject(resp).getJSONArray("candidates").getJSONObject(0).getJSONObject("content").getJSONArray("parts").getJSONObject(0).getString("text")
                }
            } catch (_: Exception) { }
        }
        return "Gemini request failed. Check network access, API key validity, and enabled model access."
    }
}
