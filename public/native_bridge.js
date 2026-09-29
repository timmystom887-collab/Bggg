(() => {
  const nativeFetch = window.fetch;
  function configureGeminiIfNeeded(target) {
    if (!window.AndroidBridge || !((target === "/api/copilot/chat") || (target === "/api/android/gemini-audit"))) return;
    if (localStorage.getItem("gemini_key_configured") === "1") return;
    const key = window.prompt("Enter your Gemini API key. It is stored only in this app's private settings.");
    if (key && key.trim()) {
      window.AndroidBridge.setGeminiApiKey(key.trim());
      localStorage.setItem("gemini_key_configured", "1");
    }
  }
  function response(payload, status) {
    return Promise.resolve(new Response(payload, {status, headers: {"Content-Type": "application/json"}}));
  }
  window.fetch = function(url, options = {}) {
    const target = String(url);
    const method = options.method || "GET";
    const body = options.body || "";
    if (target === "/api/trackers/start" && window.AndroidBridge && !window.AndroidBridge.hasBlePermissions()) {
      window.AndroidBridge.requestBlePermissions();
      return response(JSON.stringify({pending_permission: true, message: "Approve Nearby devices permission. Native scanning will start automatically."}), 202);
    }
    if (target === "/api/police/start" && window.AndroidBridge) window.AndroidBridge.requestRecordingPermissions();
    configureGeminiIfNeeded(target);
    if (target.startsWith("/api/") && window.AndroidBridge) {
      let payload;
      try {
        payload = window.AndroidBridge.request(target, method, body);
      } catch (error) {
        payload = JSON.stringify({error: true, code: "BRIDGE_ERROR", message: String(error), status: 500});
      }
      let parsed;
      try { parsed = JSON.parse(payload); } catch (_) { parsed = {error: true, status: 500, message: "Invalid native response"}; }
      return response(payload, parsed.status || (parsed.error ? 500 : 200));
    }
    return nativeFetch(url, options);
  };
})();
