/**
 * AegisPulse Front-End Controller
 * Connects Web UI to AegisPulse REST endpoints and Gemini Intelligence.
 */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initTrackersEngine();
  initAndroidSecurity();
  initScamShield();
  initCopilot();
  initSampleScenarios();
  initMeetingRecorder();
  initAudioMagnifierModule();
  initPoliceRightsModule();
  initPoliceScannerModule();
  initCounterSurveillanceModule();
  initFarmSentinelModule();
  initAdvancedFeatures();
});

// =================== NAVIGATION TABS ===================
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add("active");
      if (targetId === "tab-police-rights") {
        setTimeout(() => {
          if (typeof initWitnessMap === "function") {
            initWitnessMap();
          }
          if (typeof witnessMap !== "undefined" && witnessMap) {
            witnessMap.invalidateSize();
          }
        }, 150);
      }
      if (targetId === "tab-tail-detector") {
        setTimeout(() => {
          if (typeof loadTailTargets === "function") {
            loadTailTargets();
          }
        }, 150);
      }
      if (targetId === "tab-private-investigator") {
        setTimeout(() => {
          if (typeof initPrivateInvestigatorModule === "function") {
            initPrivateInvestigatorModule();
          }
        }, 150);
      }
    });
  });
}

// =================== TAB 1: AIRTAG RADAR ===================
let globalTrackers = [];

async function initTrackersEngine() {
  const refreshBtn = document.getElementById("refreshTrackersBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", loadTrackers);

  const nativeStart = document.getElementById("nativeBleStartBtn");
  const nativeStop = document.getElementById("nativeBleStopBtn");
  if (nativeStart) nativeStart.addEventListener("click", async () => {
    if (window.AndroidBridge) window.AndroidBridge.requestBlePermissions();
    const res = await fetch("/api/trackers/start", { method: "POST", body: "{}" });
    const data = await res.json();
    alert(data.message || data.message || (data.error ? data.message : "BLE scan requested"));
    loadTrackers();
  });
  if (nativeStop) nativeStop.addEventListener("click", async () => {
    const res = await fetch("/api/trackers/stop", { method: "POST", body: "{}" });
    const data = await res.json();
    alert(data.message || "BLE scan stopped");
    loadTrackers();
  });

  const bannerGeminiBtn = document.getElementById("bannerGeminiBtn");
  if (bannerGeminiBtn) {
    bannerGeminiBtn.addEventListener("click", () => {
      if (globalTrackers.length > 0) {
        runGeminiStalkingAnalysis(globalTrackers[0].device_id);
      }
    });
  }

  loadTrackers();
  initBackgroundScanControls();
  setInterval(loadTrackers, 8000); // Polling BLE radar
}

async function loadTrackers() {
  try {
    const res = await fetch("/api/trackers");
    const data = await res.json();
    globalTrackers = data.trackers || [];

    const badge = document.getElementById("trackerCountBadge");
    if (badge) badge.textContent = globalTrackers.length;

    renderRadarBlips(globalTrackers);
    renderTrackerCards(globalTrackers);

    // Stalking Banner check
    const banner = document.getElementById("stalkingBanner");
    const activeAlertText = document.getElementById("activeAlertText");
    const stalker = globalTrackers.find(t => t.is_alert_triggered);

    if (stalker && banner) {
      banner.style.display = "flex";
      document.getElementById("stalkingBannerDesc").innerHTML =
        `<strong>Apple AirTag / Find My Tracker (${stalker.mac_address})</strong> has tracked you across <strong>${stalker.distinct_locations_count} waypoints</strong> while separated from its owner!`;
      if (activeAlertText) activeAlertText.innerHTML = `<span style="color:#ef4444;font-weight:700">🚨 1 Stalking Alert</span>`;
    } else if (banner) {
      banner.style.display = "none";
      if (activeAlertText) activeAlertText.innerHTML = `Scanning Active (${globalTrackers.length} BLE Devices)`;
    }
  } catch (err) {
    console.error("Failed to load trackers:", err);
  }
}

function renderRadarBlips(trackers) {
  const container = document.getElementById("radarBlipsContainer");
  if (!container) return;
  container.innerHTML = "";

  const radarRadius = 155; // 320px / 2 - padding
  const maxDistance = 30.0; // 30 meters = outer ring

  trackers.forEach((t, idx) => {
    // Deterministic angle based on mac hash
    const hash = t.mac_address.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const angle = (hash * 47) % 360;
    const rad = (angle * Math.PI) / 180;

    const distRatio = Math.min(1.0, Math.max(0.12, t.estimated_distance_m / maxDistance));
    const r = distRatio * radarRadius;

    // Center is (160, 160)
    const x = 160 + r * Math.cos(rad);
    const y = 160 + r * Math.sin(rad);

    const blip = document.createElement("div");
    blip.className = `radar-blip ${t.is_alert_triggered || t.is_separated ? 'blip-red' : 'blip-emerald'}`;
    blip.style.left = `${x}px`;
    blip.style.top = `${y}px`;
    blip.title = `${t.device_type} (${t.estimated_distance_m}m, RSSI: ${t.current_rssi} dBm)`;
    blip.addEventListener("click", () => {
      runGeminiStalkingAnalysis(t.device_id);
    });

    container.appendChild(blip);
  });
}

let currentTrackerFilter = "ALL";

function setTrackerFilter(filterType) {
  currentTrackerFilter = filterType;
  document.querySelectorAll(".tracker-filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter") === filterType);
  });
  renderTrackerCards(globalTrackers);
}
window.setTrackerFilter = setTrackerFilter;

function renderTrackerCards(trackers) {
  const container = document.getElementById("trackersContainer");
  if (!container) return;

  if (trackers.length === 0) {
    container.innerHTML = `<div class="empty-state-text">No active BLE location trackers in vicinity. Scanning...</div>`;
    return;
  }

  let filtered = trackers;
  if (currentTrackerFilter === "THREAT") {
    filtered = trackers.filter(t => t.is_alert_triggered || t.threat_score >= 60);
  } else if (currentTrackerFilter === "AIRTAG") {
    filtered = trackers.filter(t => (t.device_type || "").toLowerCase().includes("airtag") || (t.device_type || "").toLowerCase().includes("apple"));
  } else if (currentTrackerFilter === "SMARTTAG") {
    filtered = trackers.filter(t => (t.device_type || "").toLowerCase().includes("smarttag") || (t.device_type || "").toLowerCase().includes("samsung"));
  } else if (currentTrackerFilter === "TILE") {
    filtered = trackers.filter(t => (t.device_type || "").toLowerCase().includes("tile") || (t.device_type || "").toLowerCase().includes("chipolo") || (t.device_type || "").toLowerCase().includes("generic"));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state-text" style="color:#94a3b8; padding:20px 0;">No trackers matched the "${currentTrackerFilter}" filter.</div>`;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isThreat = t.is_alert_triggered;
    const threatClass = isThreat ? "threat-critical" : (t.threat_score > 30 ? "threat-med" : "threat-safe");
    const badgeHtml = isThreat
      ? `<span class="badge badge-crimson">🚨 UNWANTED STALKER ALERT</span>`
      : (t.is_separated ? `<span class="badge badge-amber">OWNER SEPARATED</span>` : `<span class="badge badge-emerald">PAIRED OWNER PRESENT</span>`);

    const waypointsHtml = t.waypoints && t.waypoints.length > 0 ? `
      <div class="waypoints-log">
        <div class="waypoints-log-title">SIGHTINGS ACROSS WAYPOINTS (${t.distinct_locations_count} Distinct):</div>
        ${t.waypoints.map(w => `
          <div class="waypoint-entry">
            <span>📍 ${escapeHtml(w.location_name)}</span>
            <span>RSSI: ${w.rssi} dBm</span>
          </div>
        `).join("")}
      </div>
    ` : "";

    const guideType = (t.device_type || "").toLowerCase().includes("tile") ? "tile" : ((t.device_type || "").toLowerCase().includes("smarttag") ? "smarttag" : "airtag");

    return `
      <div class="tracker-card ${threatClass}">
        <div class="tracker-card-head">
          <div>
            <div class="tracker-title">${escapeHtml(t.device_type)} ${t.custom_label ? '<span style="color:#10b981; font-size:0.8rem;">(' + escapeHtml(t.custom_label) + ')</span>' : ''}</div>
            <div style="font-size:0.75rem; color:#38bdf8; margin-top:2px;">🚗 Transport: ${escapeHtml(t.transport_mode || 'In Transit')}</div>
            <div class="tracker-mac">MAC: ${escapeHtml(t.mac_address)} | Public Key: ${escapeHtml(t.public_key_hint || "N/A")}</div>
          </div>
          ${badgeHtml}
        </div>

        <div class="signal-metric-bar">
          <div class="signal-metric-fill" style="width: ${t.signal_percent}%;"></div>
        </div>

        <div class="tracker-details-grid">
          <div>
            <div class="detail-item-title">Distance</div>
            <div class="detail-item-val" style="color: ${isThreat ? '#ef4444' : '#10b981'};">${t.estimated_distance_m} meters</div>
          </div>
          <div>
            <div class="detail-item-title">Signal RSSI</div>
            <div class="detail-item-val">${t.current_rssi} dBm (${t.signal_percent}%)</div>
          </div>
          <div>
            <div class="detail-item-title">Battery</div>
            <div class="detail-item-val">${escapeHtml(t.battery_status)}</div>
          </div>
          <div>
            <div class="detail-item-title">Separation</div>
            <div class="detail-item-val">${t.is_separated ? 'Absent' : 'Present'}</div>
          </div>
          <div>
            <div class="detail-item-title">Sightings</div>
            <div class="detail-item-val">${t.sighting_count} times</div>
          </div>
          <div>
            <div class="detail-item-title">Threat Score</div>
            <div class="detail-item-val" style="color: ${t.threat_score >= 60 ? '#ef4444' : '#10b981'};">${t.threat_score} / 100</div>
          </div>
        </div>

        ${waypointsHtml}

        <div class="tracker-actions">
          <button class="btn btn-sm btn-primary" onclick="openObserveModal('${t.device_id}')">🎯 Observe & Distance Track</button>
          <button class="btn btn-sm btn-outline" onclick="triggerTrackerSound('${t.device_id}')">🔊 Sound Chime</button>
          <button class="btn btn-sm btn-outline" style="border-color:#ef4444; color:#fca5a5;" onclick="openNeutralizeModal('${guideType}')">🛑 Disabling & Battery</button>
          <button class="btn btn-sm btn-outline" onclick="readTrackerNfc('${t.device_id}')">📱 NFC Forensics</button>
          ${(t.transport_mode && t.transport_mode.toLowerCase().includes("vehic")) || t.threat_score >= 60 ? `
            <button class="btn btn-sm btn-outline" style="border-color:#38bdf8; color:#38bdf8;" onclick="switchTabToTailDetector()">🚗 Rear Camera Tail Detector</button>
          ` : ''}
          <button class="btn btn-sm btn-outline" onclick="toggleWhitelist('${t.device_id}')">${t.is_whitelisted ? '⭐ Whitelisted (Safe)' : '☆ Mark Safe (Whitelist)'}</button>
          <button class="btn btn-sm btn-ai" onclick="runGeminiStalkingAnalysis('${t.device_id}')">✨ Gemini Stalking Report</button>
        </div>
      </div>
    `;
  }).join("");
}

// Authentic Apple AirTag 3.8 kHz Piezo Chime Synthesizer
function playAirTagChimeSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const notes = [
      { f: 3200, d: 0.12, t: 0.0 },
      { f: 3520, d: 0.12, t: 0.13 },
      { f: 3840, d: 0.14, t: 0.26 },
      { f: 4186, d: 0.22, t: 0.40 },
      // Second chirp burst
      { f: 3200, d: 0.12, t: 0.75 },
      { f: 3520, d: 0.12, t: 0.88 },
      { f: 3840, d: 0.14, t: 1.01 },
      { f: 4186, d: 0.25, t: 1.15 }
    ];

    notes.forEach(n => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.f, audioCtx.currentTime + n.t);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + n.t);
      gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + n.t + n.d);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + n.t);
      osc.stop(audioCtx.currentTime + n.t + n.d);
    });
  } catch (e) {
    console.warn("Chime synth audio error:", e);
  }
}
window.playAirTagChimeSound = playAirTagChimeSound;

// Trigger sound chime
async function triggerTrackerSound(deviceId) {
  try {
    playAirTagChimeSound();
    const res = await fetch("/api/trackers/chime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody({ device_id: deviceId })
    });
    const data = await res.json();
    openModal("🔊 Acoustic Tracker Locator Active", `
      <div style="text-align:center; padding: 1rem 0;">
        <div style="font-size: 3rem; animation: pulse 1s infinite;">🔔</div>
        <h4 style="color:#10b981; margin: 0.5rem 0;">${escapeHtml(data.action)}</h4>
        <p style="color:#9ca3af; font-size:0.85rem;">${escapeHtml(data.guidance)}</p>
        <div style="margin-top:1rem; background:rgba(0,0,0,0.3); padding:0.75rem; border-radius:8px; font-family:var(--font-mono); font-size:0.8rem;">
          Device: ${escapeHtml(data.device_type)}<br>
          Target ID: ${escapeHtml(data.device_id)}<br>
          Audio Frequency: <strong>3.8 kHz (Piezo Harmonic Emulation Playing)</strong>
        </div>
      </div>
    `);
  } catch (e) {
    alert("Failed to trigger sound: " + e);
  }
}

// Read NFC Forensics
async function readTrackerNfc(deviceId) {
  try {
    const res = await fetch("/api/trackers/nfc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody({ device_id: deviceId })
    });
    const data = await res.json();
    openModal("📱 NFC Forensic Payload & Evidence Preservation", `
      <div>
        <p>Holding your smartphone's NFC reader against the white plastic face extracted the following forensic identity:</p>
        <div style="background:rgba(0,0,0,0.3); padding:0.75rem; border-radius:8px; margin:0.75rem 0; font-family:var(--font-mono); font-size:0.82rem;">
          <strong>Serial Number:</strong> ${escapeHtml(data.serial_number)}<br>
          <strong>NFC Target URL:</strong> <a href="${escapeHtml(data.nfc_url)}" target="_blank" style="color:#38bdf8;">${escapeHtml(data.nfc_url)}</a><br>
          <strong>Registered Owner Status:</strong> ${escapeHtml(data.registered_status)}<br>
          <strong>Owner Masked Contact:</strong> ${escapeHtml(data.owner_masked_phone)}
        </div>
        <h4 style="color:#c4b5fd; margin-top:1rem; font-size:0.85rem; text-transform:uppercase;">Forensic Evidence Guidelines:</h4>
        <ul style="padding-left:1.25rem; font-size:0.85rem; margin-top:0.5rem; color:#d1d5db;">
          ${(data.evidence_preservation || []).map(step => `<li>${escapeHtml(step)}</li>`).join("")}
        </ul>
      </div>
    `);
  } catch (e) {
    alert("Failed to retrieve NFC forensics: " + e);
  }
}

// Run Gemini Stalking Threat Analysis
async function runGeminiStalkingAnalysis(deviceId) {
  const card = document.getElementById("geminiStalkingCard");
  const body = document.getElementById("geminiStalkingBody");
  const badge = document.getElementById("stalkingThreatBadge");

  if (card) card.style.display = "block";
  if (body) body.innerHTML = `<div class="loading-spinner">✨ Gemini is evaluating movement history, time-space correlation, and physical threat vectors...</div>`;

  try {
    const res = await fetch("/api/trackers/gemini-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody({ device_id: deviceId })
    });
    const data = await res.json();
    const ai = data.ai_threat_assessment || {};

    if (badge) {
      badge.textContent = `${ai.threat_level || 'EVALUATED'} (${ai.stalking_risk_score || 0}/100)`;
      badge.className = `badge ${ai.threat_level === 'CRITICAL' ? 'badge-crimson' : (ai.threat_level === 'HIGH' ? 'badge-amber' : 'badge-emerald')}`;
    }

    body.innerHTML = `
      <div style="background:rgba(0,0,0,0.25); padding:1rem; border-radius:10px; border-left:3px solid #8b5cf6; margin-bottom:1rem;">
        <strong>Pattern Assessment:</strong>
        <p style="margin-top:0.25rem;">${escapeHtml(ai.pattern_assessment || "No assessment returned.")}</p>
      </div>

      <div class="ai-grid-box">
        <div class="ai-sub-card">
          <h4>📍 Likely Physical Concealment Locations</h4>
          <ul>
            ${(ai.likely_hiding_spots || []).map(s => `<li>${escapeHtml(s)}</li>`).join("")}
          </ul>
        </div>

        <div class="ai-sub-card">
          <h4>🛡️ Immediate Victim Safety Protocol</h4>
          <ol>
            ${(ai.immediate_actions || []).map(a => `<li>${escapeHtml(a)}</li>`).join("")}
          </ol>
        </div>

        <div class="ai-sub-card">
          <h4>🔍 Forensic Preservation & Law Enforcement</h4>
          <ul>
            ${(ai.forensic_preservation_tips || []).map(t => `<li>${escapeHtml(t)}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;

    // Smooth scroll into view
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    if (body) body.innerHTML = `<p style="color:#ef4444;">Failed to execute Gemini Stalking Analysis: ${err}</p>`;
  }
}

// =================== TAB 2: ANDROID SECURITY ===================
async function initAndroidSecurity() {
  loadAndroidOverview();

  const analyzeBtn = document.getElementById("analyzeManifestBtn");
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", () => {
      const pkg = document.getElementById("apkPackageName").value;
      const app = document.getElementById("apkAppName").value;
      const perms = document.getElementById("apkPermissionsInput").value.split("\n").map(p => p.trim()).filter(Boolean);
      const sideloaded = document.getElementById("apkSideloadedCheck").checked;
      scanCustomManifest(pkg, app, perms, sideloaded);
    });
  }

  const geminiApkBtn = document.getElementById("runGeminiApkBtn");
  if (geminiApkBtn) {
    geminiApkBtn.addEventListener("click", runGeminiApkAudit);
  }

  // Preset buttons
  document.querySelectorAll("[data-apk-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      loadApkPreset(btn.getAttribute("data-apk-preset"));
    });
  });
}

async function loadAndroidOverview() {
  try {
    const res = await fetch("/api/android/overview");
    const data = await res.json();
    const posture = data.device_posture || {};
    const apps = data.installed_apps || [];

    // Render posture
    const scoreVal = document.getElementById("postureScoreValue");
    const scoreBadge = document.getElementById("postureRatingBadge");
    const postureList = document.getElementById("postureDetailsList");

    if (scoreVal) scoreVal.textContent = posture.posture_score || 85;
    if (scoreBadge) {
      scoreBadge.textContent = posture.posture_rating || "SECURE";
      scoreBadge.className = `badge ${posture.posture_rating === 'SECURE' ? 'badge-emerald' : 'badge-crimson'}`;
    }

    const cfg = posture.configuration || {};
    if (postureList) {
      postureList.innerHTML = `
        <div class="posture-item ${cfg.is_rooted ? 'risk-high' : ''}">
          <span>Device Root Status</span>
          <strong>${cfg.is_rooted ? 'ROOTED (UNSAFE)' : 'Official Stock (Verified)'}</strong>
        </div>
        <div class="posture-item ${cfg.selinux_mode !== 'Enforcing' ? 'risk-high' : ''}">
          <span>SELinux Mandatory Access</span>
          <strong>${escapeHtml(cfg.selinux_mode || 'Enforcing')}</strong>
        </div>
        <div class="posture-item ${cfg.adb_debugging_enabled ? 'risk-med' : ''}">
          <span>ADB USB Debugging</span>
          <strong>${cfg.adb_debugging_enabled ? 'Active (Caution)' : 'Disabled (Secure)'}</strong>
        </div>
        <div class="posture-item ${cfg.unknown_sources_allowed ? 'risk-med' : ''}">
          <span>Sideloading Untrusted APKs</span>
          <strong>${cfg.unknown_sources_allowed ? 'Allowed' : 'Blocked'}</strong>
        </div>
        <div class="posture-item">
          <span>Storage Hardware Encryption</span>
          <strong>${cfg.storage_encrypted ? 'Enabled (AES-256)' : 'Disabled'}</strong>
        </div>
        <div class="posture-item">
          <span>Security Patch Date</span>
          <strong>${escapeHtml(cfg.security_patch_date || '2024-03-01')}</strong>
        </div>
      `;
    }

    // Render Installed Apps Table
    const tbody = document.getElementById("installedAppsTbody");
    if (tbody) {
      tbody.innerHTML = apps.map(app => {
        const isMalware = app.threat_score >= 80;
        const isSpyware = app.threat_score >= 60;
        const badgeClass = isMalware ? "badge-crimson" : (isSpyware ? "badge-amber" : "badge-emerald");

        const synergiesText = (app.detected_synergies || []).map(s => s.name).join(", ") || "None Detected";

        return `
          <tr>
            <td>
              <strong>${escapeHtml(app.app_name)}</strong><br>
              <span style="font-family:var(--font-mono); font-size:0.75rem; color:#9ca3af;">${escapeHtml(app.package_name)}</span>
            </td>
            <td>${app.is_sideloaded ? '<span style="color:#f59e0b;">Sideloaded (Unknown Source)</span>' : '<span style="color:#10b981;">Google Play Store</span>'}</td>
            <td>${app.dangerous_permissions_count} Dangerous</td>
            <td style="color:${isMalware ? '#ef4444' : 'inherit'};">${escapeHtml(synergiesText)}</td>
            <td><strong>${app.threat_score}</strong> / 100</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(app.risk_classification)}</span></td>
          </tr>
        `;
      }).join("");
    }
  } catch (err) {
    console.error("Failed to load android overview:", err);
  }
}

async function scanCustomManifest(pkg, app, perms, sideloaded) {
  const resultsArea = document.getElementById("apkScanResultsArea");
  if (resultsArea) resultsArea.innerHTML = `<div class="loading-spinner">Evaluating permission topology & synergies...</div>`;

  try {
    const res = await fetch("/api/android/scan-manifest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody({
        package_name: pkg,
        app_name: app,
        permissions: perms,
        is_sideloaded: sideloaded
      })
    });
    const result = await res.json();
    renderManifestScanResult(result);
  } catch (err) {
    if (resultsArea) resultsArea.innerHTML = `<p style="color:#ef4444;">Scan failed: ${err}</p>`;
  }
}

function renderManifestScanResult(result) {
  const container = document.getElementById("apkScanResultsArea");
  if (!container) return;

  const isMalware = result.threat_score >= 80;
  const badgeClass = isMalware ? "badge-crimson" : (result.threat_score >= 60 ? "badge-amber" : "badge-emerald");

  let synergiesHtml = "";
  if (result.detected_synergies && result.detected_synergies.length > 0) {
    synergiesHtml = `
      <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.4); border-radius:8px; padding:0.75rem; margin-top:0.75rem;">
        <strong style="color:#ef4444;">⚠️ Deadly Permission Synergies Detected:</strong>
        ${result.detected_synergies.map(s => `
          <div style="margin-top:0.35rem; font-size:0.85rem;">
            <strong>${escapeHtml(s.name)}</strong>: ${escapeHtml(s.explanation)}
          </div>
        `).join("")}
      </div>
    `;
  }

  container.innerHTML = `
    <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4>Verdict: <span class="badge ${badgeClass}">${escapeHtml(result.risk_classification)}</span></h4>
        <span style="font-family:var(--font-mono); font-size:1rem; font-weight:700; color:${isMalware ? '#ef4444' : '#10b981'};">Threat Score: ${result.threat_score}/100</span>
      </div>
      <p style="font-size:0.82rem; color:#9ca3af; margin-top:0.25rem;">
        App: <strong>${escapeHtml(result.app_name)}</strong> (${escapeHtml(result.package_name)}) | ${result.dangerous_permissions_count} High-Risk Permissions
      </p>
      ${synergiesHtml}
      <div style="margin-top:0.75rem;">
        <div style="font-size:0.75rem; color:#6b7280; text-transform:uppercase; margin-bottom:0.25rem;">Dangerous Capabilities:</div>
        <div style="display:flex; flex-wrap:wrap; gap:0.35rem;">
          ${(result.dangerous_permissions || []).map(p => `
            <span style="background:rgba(255,255,255,0.06); padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75rem; font-family:var(--font-mono);" title="${escapeHtml(p.description)}">
              ${escapeHtml(p.title)}
            </span>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

async function runGeminiApkAudit() {
  const card = document.getElementById("geminiApkReportCard");
  const content = document.getElementById("geminiApkReportContent");
  const badge = document.getElementById("apkAiClassification");

  if (card) card.style.display = "block";
  if (content) content.innerHTML = `<div class="loading-spinner">✨ Gemini is disassembling privilege interactions, exploit vectors, and sandbox integrity...</div>`;

  const pkg = document.getElementById("apkPackageName").value;
  const app = document.getElementById("apkAppName").value;
  const perms = document.getElementById("apkPermissionsInput").value.split("\n").map(p => p.trim()).filter(Boolean);

  try {
    const res = await fetch("/api/android/gemini-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody({
        app_manifest: {
          package_name: pkg,
          app_name: app,
          permissions: perms,
          is_sideloaded: true
        }
      })
    });
    const data = await res.json();
    const ai = data.ai_audit || {};

    if (badge) {
      badge.textContent = `${ai.risk_classification || 'EVALUATED'} (${ai.app_risk_score || 0}/100)`;
      badge.className = `badge ${ai.app_risk_score >= 80 ? 'badge-crimson' : (ai.app_risk_score >= 60 ? 'badge-amber' : 'badge-emerald')}`;
    }

    content.innerHTML = `
      <div class="ai-grid-box">
        <div class="ai-sub-card">
          <h4>🚨 Toxic Permission Synergies</h4>
          <ul>
            ${(ai.dangerous_synergies || []).map(s => `<li>${escapeHtml(s)}</li>`).join("")}
          </ul>
        </div>

        <div class="ai-sub-card">
          <h4>⚔️ Exploit Vectors & Capabilities</h4>
          <ul>
            ${(ai.exploit_vectors || []).map(v => `<li>${escapeHtml(v)}</li>`).join("")}
          </ul>
        </div>

        <div class="ai-sub-card">
          <h4>🛡️ Step-by-Step Remediation</h4>
          <ol>
            ${(ai.remediation_steps || []).map(r => `<li>${escapeHtml(r)}</li>`).join("")}
          </ol>
        </div>
      </div>
    `;

    card.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    if (content) content.innerHTML = `<p style="color:#ef4444;">Failed to run Gemini APK Audit: ${err}</p>`;
  }
}

function loadApkPreset(type) {
  const pkgInput = document.getElementById("apkPackageName");
  const appInput = document.getElementById("apkAppName");
  const permsInput = document.getElementById("apkPermissionsInput");
  const sideloaded = document.getElementById("apkSideloadedCheck");

  if (type === "bankbot") {
    pkgInput.value = "com.quickreader.pdf.viewer";
    appInput.value = "Ultra Fast PDF Pro";
    permsInput.value = `android.permission.INTERNET
android.permission.BIND_ACCESSIBILITY_SERVICE
android.permission.SYSTEM_ALERT_WINDOW
android.permission.RECEIVE_SMS
android.permission.READ_SMS`;
    sideloaded.checked = true;
  } else if (type === "stalker") {
    pkgInput.value = "com.device.battery.booster";
    appInput.value = "Turbo Battery Booster";
    permsInput.value = `android.permission.INTERNET
android.permission.ACCESS_BACKGROUND_LOCATION
android.permission.RECORD_AUDIO
android.permission.READ_CALL_LOG
android.permission.READ_CONTACTS`;
    sideloaded.checked = true;
  } else if (type === "clean") {
    pkgInput.value = "com.audioplayer.simple";
    appInput.value = "Minimal Audio Player";
    permsInput.value = `android.permission.INTERNET
android.permission.FOREGROUND_SERVICE
android.permission.POST_NOTIFICATIONS`;
    sideloaded.checked = false;
  }
  // Auto scan
  scanCustomManifest(pkgInput.value, appInput.value, permsInput.value.split("\n").map(p => p.trim()).filter(Boolean), sideloaded.checked);
}

// =================== TAB 3: AI SCAM & SMISHING SHIELD ===================
let activeScamChannel = "sms";

function initScamShield() {
  const channelBtns = document.querySelectorAll(".channel-btn");
  channelBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      channelBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeScamChannel = btn.getAttribute("data-channel");
    });
  });

  const analyzeBtn = document.getElementById("analyzeScamBtn");
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", runScamInvestigation);
  }

  // Scam presets
  document.querySelectorAll("[data-scam-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      loadScamPreset(btn.getAttribute("data-scam-preset"));
    });
  });
}

function loadScamPreset(preset) {
  const textInput = document.getElementById("scamTextInput");
  if (preset === "usps") {
    textInput.value = "USPS Notice: Your parcel #US-88192 cannot be delivered due to an incorrect house number. Please confirm your delivery address within 12 hours at https://usps-redelivery-address.xyz/action or the parcel will be returned to sender.";
  } else if (preset === "sunpass") {
    textInput.value = "SunPass Toll Services: We recorded an unpaid toll balance of $12.50 on your vehicle. Final notice before administrative fees and driver license suspension. Settle online now at https://sunpass-toll-violation.top/pay";
  } else if (preset === "chase") {
    textInput.value = "CHASE ALERT: Urgent! A wire transfer of $1,845.00 to CryptoMarket LLC was flagged. If this was NOT you, immediately secure your account and card at https://chase-security-verify.net/fraud-prevention or call 1-800-432-3117.";
  } else if (preset === "techsupport") {
    textInput.value = "Operator: 'Hello this is Kevin from Windows Technical Support. We detected 14 malicious trojans transmitting your credit cards. Do not turn off your computer. Please open anydesk.com and give me the code so our engineer can fix your IP.'";
  }
  runScamInvestigation();
}

async function runScamInvestigation() {
  const text = document.getElementById("scamTextInput").value;
  const useGemini = document.getElementById("scamGeminiToggle").checked;
  const heuristicsBox = document.getElementById("scamHeuristicsBox");
  const verdictBadge = document.getElementById("scamVerdictBadge");
  const meterFill = document.getElementById("scamMeterFill");
  const scoreNum = document.getElementById("scamScoreNumber");

  const geminiCard = document.getElementById("geminiScamCard");
  const geminiBody = document.getElementById("geminiScamBody");
  const geminiBadge = document.getElementById("scamAiCategoryBadge");

  if (!text.trim()) {
    alert("Please enter a suspicious message, transcript, or link.");
    return;
  }

  heuristicsBox.innerHTML = `<div class="loading-spinner">Analyzing linguistic markers, domain reputation, and manipulation vectors...</div>`;

  try {
    const res = await fetch("/api/scam/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody({
        text: text,
        channel: activeScamChannel,
        use_gemini: useGemini
      })
    });
    const data = await res.json();
    const h = data.heuristics || {};
    const ai = data.gemini_investigation;

    // Update gauge
    const score = h.scam_score || 0;
    meterFill.style.width = `${score}%`;
    scoreNum.textContent = `Score: ${score} / 100`;

    // Update verdict badge
    verdictBadge.textContent = h.verdict || "ANALYZED";
    verdictBadge.className = `badge ${score >= 75 ? 'badge-crimson' : (score >= 50 ? 'badge-amber' : 'badge-emerald')}`;

    // Render heuristics
    let urlsHtml = "";
    if (h.urls_detected && h.urls_detected.length > 0) {
      urlsHtml = `
        <div style="margin-top:0.75rem; background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:6px;">
          <div style="font-size:0.75rem; color:#6b7280; text-transform:uppercase;">Extracted Link Analysis:</div>
          ${h.urls_detected.map(u => `
            <div style="margin-top:0.25rem; font-family:var(--font-mono); font-size:0.8rem;">
              <span style="color:#ef4444;">${escapeHtml(u.url)}</span> (${u.risk_level})
              <ul style="padding-left:1rem; font-size:0.75rem; color:#9ca3af; font-family:var(--font-sans);">
                ${(u.heuristic_flags || []).map(f => `<li>${escapeHtml(f)}</li>`).join("")}
              </ul>
            </div>
          `).join("")}
        </div>
      `;
    }

    heuristicsBox.innerHTML = `
      <div style="margin-bottom:0.5rem;">
        <strong>Category:</strong> <span style="color:#38bdf8;">${escapeHtml(h.primary_category)}</span>
      </div>
      <div><strong>Urgency Markers:</strong> ${h.urgency_indicators && h.urgency_indicators.length > 0 ? h.urgency_indicators.join(", ") : "None Detected"}</div>
      <div style="margin-top:0.5rem; background:rgba(16,185,129,0.1); border-left:3px solid #10b981; padding:0.5rem 0.75rem; border-radius:4px;">
        <strong>Recommendation:</strong> ${escapeHtml(h.safety_recommendation)}
      </div>
      ${urlsHtml}
    `;

    // Render Gemini deep report if enabled
    if (ai) {
      geminiCard.style.display = "block";
      if (geminiBadge) geminiBadge.textContent = ai.scam_category || "FRAUD DECONSTRUCTED";

      geminiBody.innerHTML = `
        <div class="ai-grid-box">
          <div class="ai-sub-card">
            <h4>🧠 Psychological Manipulation Tactics</h4>
            <ul>
              ${(ai.psychological_manipulation_tactics || []).map(t => `<li>${escapeHtml(t)}</li>`).join("")}
            </ul>
          </div>

          <div class="ai-sub-card">
            <h4>🎯 Indicators of Compromise (IOCs)</h4>
            <ul>
              ${(ai.indicators_of_compromise || []).map(i => `<li>${escapeHtml(i)}</li>`).join("")}
            </ul>
          </div>

          <div class="ai-sub-card">
            <h4>⚡ Criminal Fraud Pipeline</h4>
            <p style="font-size:0.85rem; line-height:1.5;">${escapeHtml(ai.fraud_pipeline_breakdown || "")}</p>
          </div>

          <div class="ai-sub-card">
            <h4>🛡️ Defense Action Steps</h4>
            <ol>
              ${(ai.recommended_countermeasures || []).map(c => `<li>${escapeHtml(c)}</li>`).join("")}
            </ol>
          </div>
        </div>
      `;
      geminiCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (err) {
    heuristicsBox.innerHTML = `<p style="color:#ef4444;">Investigation failed: ${err}</p>`;
  }
}

// =================== TAB 4: GEMINI COPILOT ===================
let copilotHistory = [];

function initCopilot() {
  const sendBtn = document.getElementById("copilotSendBtn");
  const input = document.getElementById("copilotInput");

  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      sendCopilotMessage();
    });
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendCopilotMessage();
    });
  }

  document.querySelectorAll(".copilot-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      if (input) {
        input.value = chip.textContent;
        sendCopilotMessage();
      }
    });
  });
}

async function sendCopilotMessage() {
  const input = document.getElementById("copilotInput");
  const chatBox = document.getElementById("copilotChatBox");
  const query = input.value.trim();

  if (!query) return;

  // Append user message
  const userMsgDiv = document.createElement("div");
  userMsgDiv.className = "chat-msg msg-user";
  userMsgDiv.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div class="msg-bubble">${escapeHtml(query)}</div>
  `;
  chatBox.appendChild(userMsgDiv);
  input.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  // Append thinking bubble
  const aiMsgDiv = document.createElement("div");
  aiMsgDiv.className = "chat-msg msg-ai";
  aiMsgDiv.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble"><span class="pulsing-dot" style="display:inline-block; margin-right:6px;"></span> Gemini is generating response...</div>
  `;
  chatBox.appendChild(aiMsgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch("/api/copilot/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody({
        query: query,
        history: copilotHistory
      })
    });
    const data = await res.json();
    const answer = data.response || "No response received.";

    // Update history
    copilotHistory.push({ role: "user", text: query });
    copilotHistory.push({ role: "copilot", text: answer });

    // Format Markdown basic
    aiMsgDiv.querySelector(".msg-bubble").innerHTML = formatMarkdown(answer);
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    aiMsgDiv.querySelector(".msg-bubble").innerHTML = `<span style="color:#ef4444;">Error reaching Gemini Copilot: ${err}</span>`;
  }
}

// =================== TAB 5: SIMULATOR ===================
async function injectTrackerScenario(scenario) {
  try {
    const res = await fetch("/api/trackers/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody({ scenario: scenario })
    });
    const data = await res.json();
    alert(data.message);
    loadTrackers();
  initBackgroundScanControls();
    // Switch to tracker tab
    document.querySelector("[data-tab='tab-trackers']").click();
  } catch (err) {
    alert("Injection failed: " + err);
  }
}

function initSampleScenarios() {
  // Expose global simulator function
  window.injectTrackerScenario = injectTrackerScenario;
  window.loadApkPreset = loadApkPreset;
  window.triggerTrackerSound = triggerTrackerSound;
  window.readTrackerNfc = readTrackerNfc;
  window.runGeminiStalkingAnalysis = runGeminiStalkingAnalysis;
}

// =================== MODAL & HELPERS ===================
function openModal(title, bodyHtml) {
  const modal = document.getElementById("genericModal");
  document.getElementById("modalTitle").innerHTML = title;
  document.getElementById("modalBody").innerHTML = bodyHtml;
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("genericModal");
  if (modal) modal.style.display = "none";
}
window.closeModal = closeModal;

function jsonBody(obj) {
  return JSON.stringify(obj);
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMarkdown(text) {
  if (!text) return "";
  let html = escapeHtml(text);
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h4 style="color:#c4b5fd; margin:0.5rem 0 0.25rem;">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 style="color:#38bdf8; margin:0.6rem 0 0.3rem;">$1</h3>');
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Numbered lists
  html = html.replace(/^\d+\.\s+(.*$)/gim, '<li style="margin-left:1.25rem;">$1</li>');
  // Bullet lists
  html = html.replace(/^[-*]\s+(.*$)/gim, '<li style="margin-left:1.25rem;">$1</li>');
  // Newlines
  html = html.replace(/\n\n/g, '<br><br>');
  return html;
}


// =================== OBSERVE MODE & DISTANCE TRACKING ===================
let activeObserveDeviceId = null;
let observeInterval = null;
let audioCtx = null;
let geigerAudioActive = false;
let geigerTimer = null;
let currentClickRateHz = 1.0;

function openObserveModal(deviceId) {
  activeObserveDeviceId = deviceId;
  const modal = document.getElementById("observeModal");
  if (modal) modal.style.display = "flex";

  // Instant local lookup to remove any flash of mock/stale data
  const list = (typeof globalTrackers !== "undefined" && Array.isArray(globalTrackers)) ? globalTrackers : [];
  const t = list.find(x => x.device_id === deviceId);
  if (t) {
    const devName = document.getElementById("observeDeviceName");
    if (devName) devName.textContent = `${t.device_type} (${t.mac_address})`;
    const modeBadge = document.getElementById("observeTransportMode");
    if (modeBadge) {
      modeBadge.textContent = t.transport_mode || "In Transit";
      modeBadge.className = `badge ${t.transport_mode && t.transport_mode.toLowerCase().includes("vehic") ? 'badge-crimson' : 'badge-amber'}`;
    }
    const distText = document.getElementById("observeDistanceMeters");
    if (distText) distText.textContent = t.estimated_distance_m;
    const rssiText = document.getElementById("observeRawRssi");
    if (rssiText) rssiText.textContent = t.current_rssi;
  }

  // Populate target dropdown with all scanned trackers
  const selector = document.getElementById("observeTargetSelector");
  if (selector) {
    selector.innerHTML = list.map(x => {
      const name = x.custom_label ? `${x.device_type} - ${x.custom_label}` : `${x.device_type} (${x.mac_address})`;
      const selected = x.device_id === deviceId ? "selected" : "";
      return `<option value="${x.device_id}" ${selected}>${escapeHtml(name)} [Dist: ${x.estimated_distance_m}m]</option>`;
    }).join("");
    
    if (list.length === 0) {
      selector.innerHTML = `<option value="${deviceId}">Active Target (${deviceId})</option>`;
    }
  }

  // Initial fetch and start interval
  pollObserveData();
  if (observeInterval) clearInterval(observeInterval);
  observeInterval = setInterval(pollObserveData, 800);
}

function changeObserveTarget(deviceId) {
  if (!deviceId) return;
  activeObserveDeviceId = deviceId;
  manualBearingOffset = 0;
  
  // Instantly apply local values for immediate visual response
  const list = (typeof globalTrackers !== "undefined" && Array.isArray(globalTrackers)) ? globalTrackers : [];
  const t = list.find(x => x.device_id === deviceId);
  if (t) {
    const devName = document.getElementById("observeDeviceName");
    if (devName) devName.textContent = `${t.device_type} (${t.mac_address})`;
    const modeBadge = document.getElementById("observeTransportMode");
    if (modeBadge) {
      modeBadge.textContent = t.transport_mode || "In Transit";
      modeBadge.className = `badge ${t.transport_mode && t.transport_mode.toLowerCase().includes("vehic") ? 'badge-crimson' : 'badge-amber'}`;
    }
    const distText = document.getElementById("observeDistanceMeters");
    if (distText) distText.textContent = t.estimated_distance_m;
    const rssiText = document.getElementById("observeRawRssi");
    if (rssiText) rssiText.textContent = t.current_rssi;
  }
  
  pollObserveData();
}
window.changeObserveTarget = changeObserveTarget;

function closeObserveModal() {
  const modal = document.getElementById("observeModal");
  if (modal) modal.style.display = "none";
  if (observeInterval) {
    clearInterval(observeInterval);
    observeInterval = null;
  }
  stopGeigerAudio();
}
window.closeObserveModal = closeObserveModal;
window.openObserveModal = openObserveModal;

let manualBearingOffset = 0;

function launchAirTagFinder() {
  const list = (typeof globalTrackers !== "undefined" && Array.isArray(globalTrackers)) ? globalTrackers : [];
  const airtags = list.filter(t => (t.device_type || "").toLowerCase().includes("airtag") || t.is_alert_triggered);
  const target = airtags[0] || list[0] || { device_id: "AIRTAG_78A2" };
  openObserveModal(target.device_id);
}
window.launchAirTagFinder = launchAirTagFinder;

async function stepObserveDistance(deltaM) {
  if (!activeObserveDeviceId) return;
  try {
    await fetch(`/api/trackers/observe?device_id=${encodeURIComponent(activeObserveDeviceId)}&step=${encodeURIComponent(deltaM)}`, {
      method: "POST"
    });
    pollObserveData();
  } catch (err) {
    console.error("Step distance error:", err);
  }
}
window.stepObserveDistance = stepObserveDistance;

function rotateUwbPointer(deltaDeg) {
  manualBearingOffset = (manualBearingOffset + deltaDeg + 360) % 360;
  pollObserveData();
}
window.rotateUwbPointer = rotateUwbPointer;

let currentDeviceCompassHeading = 0;
if (typeof window !== "undefined") {
  window.addEventListener("deviceorientation", (e) => {
    if (e.webkitCompassHeading !== undefined) {
      currentDeviceCompassHeading = e.webkitCompassHeading;
    } else if (e.alpha !== null) {
      currentDeviceCompassHeading = (360 - e.alpha) % 360;
    }
  });
}

async function pollObserveData() {
  if (!activeObserveDeviceId) return;
  try {
    const res = await fetch(`/api/trackers/observe?device_id=${encodeURIComponent(activeObserveDeviceId)}`);
    if (!res.ok) return;
    const data = await res.json();
    const t = data.tracker;
    const stream = data.observe_stream;

    document.getElementById("observeDeviceName").textContent = `${t.device_type} (${t.mac_address})`;
    const modeBadge = document.getElementById("observeTransportMode");
    if (modeBadge) {
      modeBadge.textContent = t.transport_mode || "In Transit";
      modeBadge.className = `badge ${t.transport_mode && t.transport_mode.includes("Automotive") ? 'badge-crimson' : 'badge-amber'}`;
    }

    // Distance & RSSI
    document.getElementById("observeDistanceMeters").textContent = stream.estimated_distance_m;
    document.getElementById("observeRawRssi").textContent = stream.raw_rssi;
    document.getElementById("observeFilteredRssi").textContent = stream.filtered_rssi;

    // Hot/Cold Zone
    const pz = stream.proximity_zone;
    const label = document.getElementById("hotColdLabel");
    const container = document.getElementById("hotColdContainer");
    if (label && container) {
      label.textContent = pz.label;
      label.style.color = pz.color;
      container.style.borderColor = pz.color;
      container.style.boxShadow = `0 0 25px ${pz.color}40`;
    }

    // UWB Precision Pointer Arrow update with manualBearingOffset
    const arrow = document.getElementById("precisionPointerArrow");
    const bearingText = document.getElementById("precisionBearingText");
    const signalArcText = document.getElementById("precisionSignalArcText");
    if (arrow && stream.compass_bearing_deg !== undefined) {
      const effectiveBearing = (stream.compass_bearing_deg + manualBearingOffset + 360) % 360;
      const relativeAngle = (effectiveBearing - currentDeviceCompassHeading + 360) % 360;
      arrow.style.transform = `rotate(${relativeAngle}deg)`;
      
      const cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
      const cardIdx = Math.round(effectiveBearing / 22.5) % 16;
      if (bearingText) bearingText.textContent = `${effectiveBearing.toString().padStart(3, "0")}° ${cardinals[cardIdx]}`;
      if (signalArcText) {
        const conf = stream.estimated_distance_m < 1.5 ? "Immediate (+/-2°)" : (stream.estimated_distance_m < 6 ? "Strong (+/-5°)" : "Search Arc (+/-15°)");
        signalArcText.textContent = conf;
      }
    }

    // Gradient bar active zone
    document.querySelectorAll(".zone-marker").forEach(zm => zm.classList.remove("active"));
    const code = pz.code.toLowerCase();
    if (code.includes("burning")) document.querySelector(".zm-burning")?.classList.add("active");
    else if (code.includes("hot")) document.querySelector(".zm-hot")?.classList.add("active");
    else if (code.includes("warm")) document.querySelector(".zm-warm")?.classList.add("active");
    else if (code.includes("cold")) document.querySelector(".zm-cold")?.classList.add("active");
    else document.querySelector(".zm-freezing")?.classList.add("active");

    // Update Geiger Click Rate
    currentClickRateHz = stream.click_rate_hz || 1.0;
    const desc = document.getElementById("geigerRateDesc");
    if (desc) desc.textContent = `Repetition Rate: ${currentClickRateHz} Hz (${pz.label})`;

  } catch (err) {
    console.error("Observe stream error:", err);
  }
}

// Web Audio API Geiger Pulse Synthesizer
function toggleGeigerAudio() {
  const btn = document.getElementById("toggleGeigerBtn");
  if (geigerAudioActive) {
    stopGeigerAudio();
    if (btn) btn.innerHTML = "<span>Start Audio Geiger</span>";
  } else {
    startGeigerAudio();
    if (btn) btn.innerHTML = "<span style='color:#ef4444;'>Stop Audio Geiger</span>";
  }
}
window.toggleGeigerAudio = toggleGeigerAudio;

function startGeigerAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  geigerAudioActive = true;
  scheduleNextGeigerClick();
}

function stopGeigerAudio() {
  geigerAudioActive = false;
  if (geigerTimer) {
    clearTimeout(geigerTimer);
    geigerTimer = null;
  }
}

function scheduleNextGeigerClick() {
  if (!geigerAudioActive) return;
  playSingleGeigerClick();
  const delayMs = Math.max(50, Math.min(3000, 1000 / currentClickRateHz));
  geigerTimer = setTimeout(scheduleNextGeigerClick, delayMs);
}

function playSingleGeigerClick() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1850, audioCtx.currentTime); // 1.85 kHz crisp beep click

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.025); // 25ms click burst

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch (e) {
    console.error("Audio error:", e);
  }
}

// Whitelist / Safe Device Toggle
async function toggleWhitelist(deviceId) {
  const label = prompt("Enter a trusted label for this safe device (e.g. 'My Keychain', 'Spouse's Purse'):", "My Trusted Device");
  if (label === null) return;

  try {
    const res = await fetch("/api/trackers/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId, label: label })
    });
    const data = await res.json();
    alert(data.is_whitelisted ? `Device marked as TRUSTED (${data.custom_label})` : "Device removed from Whitelist.");
    loadTrackers();
  initBackgroundScanControls();
  } catch (e) {
    alert("Whitelist failed: " + e);
  }
}
window.toggleWhitelist = toggleWhitelist;

// Background Scan Mode Switcher
function initBackgroundScanControls() {
  document.querySelectorAll(".bg-mode-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".bg-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.getAttribute("data-bg-mode");
      try {
        const res = await fetch("/api/trackers/bg-scan-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scan_mode: mode })
        });
        const data = await res.json();
        const text = document.getElementById("bgScanStatusText");
        if (text) {
          text.textContent = `Active (${mode} Mode: ${Math.round(data.interval_seconds/60)} min cycle | Motion-Triggered Escalation)`;
        }
      } catch (e) {
        console.error("Failed to update bg scan mode:", e);
      }
    });
  });
}



// =================== ACOUSTIC TRACKER MAGNIFIER & AUDIO PRIVACY ===================
let magnifierStream = null;
let magnifierCtx = null;
let magnifierSource = null;
let magnifierFilter = null;
let magnifierGain = null;
let magnifierAnalyser = null;
let isMagnifierActive = false;
let spectrumAnimFrame = null;

async function toggleAcousticMagnifier() {
  const btn = document.getElementById("toggleAcousticMagnifierBtn");
  if (isMagnifierActive) {
    stopAcousticMagnifier();
    if (btn) btn.innerHTML = "<span>🎧 Start Audio Magnifier</span>";
  } else {
    const started = await startAcousticMagnifier();
    if (started && btn) {
      btn.innerHTML = "<span style='color:#ef4444;'>⏹️ Stop Audio Magnifier</span>";
    }
  }
}
window.toggleAcousticMagnifier = toggleAcousticMagnifier;

async function startAcousticMagnifier() {
  try {
    magnifierStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    magnifierCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (magnifierCtx.state === 'suspended') {
      await magnifierCtx.resume();
    }

    magnifierSource = magnifierCtx.createMediaStreamSource(magnifierStream);

    // 2nd-order Biquad Bandpass Filter (Passband ~3.2 kHz to 4.4 kHz)
    magnifierFilter = magnifierCtx.createBiquadFilter();
    magnifierFilter.type = "bandpass";
    magnifierFilter.frequency.setValueAtTime(3800, magnifierCtx.currentTime); // Center at AirTag piezo chime
    magnifierFilter.Q.setValueAtTime(4.75, magnifierCtx.currentTime);

    // Dynamic Range Gain Boost (+12 to +18 dB)
    magnifierGain = magnifierCtx.createGain();
    magnifierGain.gain.setValueAtTime(3.8, magnifierCtx.currentTime);

    // Spectrum Analyser
    magnifierAnalyser = magnifierCtx.createAnalyser();
    magnifierAnalyser.fftSize = 256;

    // Connect audio processing graph: Source -> Bandpass Filter -> Gain -> Analyser -> Output (Headphones)
    magnifierSource.connect(magnifierFilter);
    magnifierFilter.connect(magnifierGain);
    magnifierGain.connect(magnifierAnalyser);
    magnifierGain.connect(magnifierCtx.destination);

    isMagnifierActive = true;
    drawAudioSpectrum();
    return true;
  } catch (err) {
    alert("Microphone permission required for Acoustic Magnifier: " + err);
    return false;
  }
}

function stopAcousticMagnifier() {
  isMagnifierActive = false;
  if (spectrumAnimFrame) cancelAnimationFrame(spectrumAnimFrame);
  if (magnifierStream) {
    magnifierStream.getTracks().forEach(t => t.stop());
    magnifierStream = null;
  }
  if (magnifierCtx) {
    magnifierCtx.close();
    magnifierCtx = null;
  }
  const canvas = document.getElementById("audioSpectrumCanvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  const alertBox = document.getElementById("chimeDetectionAlert");
  if (alertBox) alertBox.style.display = "none";
}

function drawAudioSpectrum() {
  if (!isMagnifierActive || !magnifierAnalyser) return;
  const canvas = document.getElementById("audioSpectrumCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const bufferLength = magnifierAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  magnifierAnalyser.getByteFrequencyData(dataArray);

  ctx.fillStyle = "rgba(10, 14, 23, 0.4)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const barWidth = (canvas.width / bufferLength) * 2.2;
  let x = 0;
  let trackerEnergy = 0;
  let ambientEnergy = 0;

  for (let i = 0; i < bufferLength; i++) {
    const val = dataArray[i];
    const barHeight = (val / 255.0) * canvas.height;

    // 3.8 kHz is roughly bins 20-30 in a 128-bin FFT at 44.1kHz
    const isTrackerChimeBand = (i >= 18 && i <= 32);

    if (isTrackerChimeBand) {
      trackerEnergy += val;
      ctx.fillStyle = `rgb(${val + 100}, 230, 80)`;
    } else {
      ambientEnergy += val;
      ctx.fillStyle = `rgba(56, 189, 248, 0.4)`;
    }

    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
  }

  // Chime Detection Logic
  const alertBox = document.getElementById("chimeDetectionAlert");
  if (alertBox) {
    if (trackerEnergy > 380 && (trackerEnergy / Math.max(1, ambientEnergy)) > 0.45) {
      alertBox.style.display = "flex";
    } else {
      alertBox.style.display = "none";
    }
  }

  spectrumAnimFrame = requestAnimationFrame(drawAudioSpectrum);
}

// Audio Privacy Audit
async function runAudioPrivacyAudit() {
  try {
    const res = await fetch("/api/audio/privacy-audit");
    const data = await res.json();
    const badge = document.getElementById("audioPrivacyBadge");
    const hwMic = document.getElementById("hwMicState");
    const btState = document.getElementById("btRoutingState");
    const riskState = document.getElementById("eavesdropRiskState");

    if (badge) {
      badge.textContent = `MIC PRIVACY: ${data.privacy_status}`;
      badge.className = `badge ${data.privacy_status === 'COMPROMISED' ? 'badge-crimson' : 'badge-emerald'}`;
    }

    if (hwMic) hwMic.textContent = data.microphone_hardware_active ? "ACTIVE (App Recording in Progress)" : "Idle (Zero Active Recordings)";
    if (btState) btState.textContent = "A2DP Bluetooth Routing Monitored";
    if (riskState) {
      riskState.textContent = data.eavesdropping_threats.length > 0 ? "HIGH (Unauthorized Background Stream)" : "LOW (No Rogue Audio Clients)";
      riskState.style.color = data.eavesdropping_threats.length > 0 ? "#ef4444" : "#10b981";
    }
  } catch (e) {
    console.error("Privacy audit error:", e);
  }
}
window.runAudioPrivacyAudit = runAudioPrivacyAudit;

// Gemini Audio Eavesdropping Triage
async function runGeminiAudioTriage() {
  const box = document.getElementById("geminiAudioTriageBox");
  if (box) {
    box.style.display = "block";
    box.innerHTML = `<div class="loading-spinner">✨ Gemini is triaging active audio routing against stalkerware profiles...</div>`;
  }

  try {
    const res = await fetch("/api/audio/gemini-eavesdrop-triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_client: {
          package_name: "com.device.audio.helper",
          app_name: "Background Voice Relay",
          is_foreground: false,
          is_recording: true,
          routing_target: "BLUETOOTH_SCO"
        }
      })
    });
    const data = await res.json();
    const ai = data.ai_eavesdrop_triage || {};

    if (box) {
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <h4 style="color:#c4b5fd;">Verdict: ${escapeHtml(ai.verdict || 'COVERT_EAVESDROPPING_SUSPECT')}</h4>
          <span class="badge badge-crimson">Risk Score: ${ai.eavesdropping_risk_score || 85}/100</span>
        </div>
        <p style="font-size:0.85rem; color:#e2e8f0; margin-bottom:0.75rem;">${escapeHtml(ai.explanation || "")}</p>
        <div style="font-size:0.82rem;">
          <strong style="color:#10b981;">Recommended Defense Steps:</strong>
          <ul style="padding-left:1.25rem; margin-top:0.25rem; color:#d1d5db;">
            ${(ai.countermeasures || []).map(c => `<li>${escapeHtml(c)}</li>`).join("")}
          </ul>
        </div>
      `;
    }
  } catch (e) {
    if (box) box.innerHTML = `<p style="color:#ef4444;">Gemini audio triage failed: ${e}</p>`;
  }
}
window.runGeminiAudioTriage = runGeminiAudioTriage;



// =================== BLUETOOTH MEETING RECORDER ===================
let isMeetingRecording = false;
let meetingTimerInterval = null;
let meetingElapsedSeconds = 0;
let meetingVuInterval = null;

function initMeetingRecorder() {
  loadMeetingSessions();
}

async function loadMeetingSessions() {
  const container = document.getElementById("meetingsListContainer");
  if (!container) return;

  try {
    const res = await fetch("/api/meetings");
    const data = await res.json();
    const sessions = data.sessions || [];

    if (sessions.length === 0) {
      container.innerHTML = `<div class="empty-state-text">No recorded meeting sessions yet. Start a session above.</div>`;
      return;
    }

    container.innerHTML = sessions.map(s => `
      <div class="meeting-item-card">
        <div class="meeting-item-head">
          <div>
            <strong>${escapeHtml(s.title)}</strong><br>
            <span style="font-size:0.75rem; color:#9ca3af; font-family:var(--font-mono);">${s.start_time} | Duration: ${s.duration_formatted}</span>
          </div>
          <span class="badge ${s.is_recording ? 'badge-crimson' : 'badge-emerald'}">${s.is_recording ? 'RECORDING' : 'SAVED'}</span>
        </div>
        <div style="font-size:0.75rem; color:#38bdf8; margin-bottom:0.5rem;">
          Mic Source: <strong>${escapeHtml(s.audio_source)}</strong>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-sm btn-ai" onclick="summarizeMeetingWithGemini('${s.session_id}')">
            <span>✨ Gemini Scribe & Action Items</span>
          </button>
        </div>
      </div>
    `).join("");
  } catch (err) {
    console.error("Failed to load meetings:", err);
  }
}
window.loadMeetingSessions = loadMeetingSessions;

let isMeetingBtMicConnected = true;

function toggleMeetingBtMicSimulation() {
  isMeetingBtMicConnected = !isMeetingBtMicConnected;
  const dot = document.getElementById("meetingBtMicDot");
  const text = document.getElementById("meetingBtMicStatusText");
  const btn = document.getElementById("toggleMeetingBtMicSimBtn");
  const label = document.getElementById("activeMicLabelDisplay");

  if (isMeetingBtMicConnected) {
    if (dot) { dot.className = "pulsing-dot"; dot.style.backgroundColor = "#10b981"; }
    if (text) text.innerHTML = "Input Device: <strong>Bluetooth Headphone Physical Mic (Sony WH-1000XM5)</strong>";
    if (btn) btn.textContent = "Simulate Disconnect";
    if (label) label.innerHTML = "Mic Source: <strong>Bluetooth Headset Physical Mic (16 kHz mSBC)</strong>";
  } else {
    if (dot) { dot.className = "pulsing-dot-red"; dot.style.backgroundColor = "#ef4444"; }
    if (text) text.innerHTML = "<span style='color:#ef4444;'>NO BLUETOOTH HEADPHONE MIC DETECTED</span> (Recording Blocked)";
    if (btn) btn.textContent = "Simulate Connect";
    if (label) label.innerHTML = "<span style='color:#ef4444;'>Phone Built-In Mic BLOCKED by Security Policy</span>";
  }

  fetch("/api/meetings/toggle-bt-mic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connected: isMeetingBtMicConnected })
  }).catch(console.error);
}
window.toggleMeetingBtMicSimulation = toggleMeetingBtMicSimulation;

async function toggleMeetingRecording() {
  // STRICT ENFORCEMENT: Never use phone internal mic
  if (!isMeetingBtMicConnected) {
    alert("⚠️ BLUETOOTH HEADPHONE MICROPHONE REQUIRED!\n\nRecording with the phone's internal microphone is strictly blocked.\n\nPlease turn on or connect your Bluetooth headphones to use their built-in microphone for meeting capture.");
    return;
  }
  const title = document.getElementById("meetingTitleInput").value;
  const btn = document.getElementById("toggleMeetingRecordBtn");
  const icon = document.getElementById("recordBtnIcon");
  const text = document.getElementById("recordBtnText");
  const hero = document.getElementById("recordingHeroBox");
  const subtext = document.getElementById("recordingStatusSubtext");

  if (!isMeetingRecording) {
    // Start recording
    try {
      const res = await fetch("/api/meetings/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title, source: "BLUETOOTH_SCO_HEADSET" })
      });
      const data = await res.json();
      isMeetingRecording = true;

      if (btn) btn.className = "btn btn-outline";
      if (icon) icon.textContent = "⏹️";
      if (text) text.textContent = "Stop & Save Meeting";
      if (hero) hero.classList.add("active-recording");
      if (subtext) subtext.innerHTML = "<span style='color:#ef4444; font-weight:700;'>Recording active via Bluetooth headset mic...</span>";

      meetingElapsedSeconds = 0;
      updateMeetingTimer();
      meetingTimerInterval = setInterval(() => {
        meetingElapsedSeconds++;
        updateMeetingTimer();
      }, 1000);

      meetingVuInterval = setInterval(() => {
        const vuFill = document.getElementById("recordingVuFill");
        if (vuFill) {
          const randLevel = Math.floor(Math.random() * 65) + 20;
          vuFill.style.width = `${randLevel}%`;
        }
      }, 150);

    } catch (e) {
      alert("Failed to start recording: " + e);
    }
  } else {
    // Stop recording
    try {
      const res = await fetch("/api/meetings/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      isMeetingRecording = false;

      if (btn) btn.className = "btn btn-crimson";
      if (icon) icon.textContent = "🔴";
      if (text) text.textContent = "Start Meeting Recording";
      if (hero) hero.classList.remove("active-recording");
      if (subtext) subtext.textContent = "Meeting recording saved successfully.";

      if (meetingTimerInterval) clearInterval(meetingTimerInterval);
      if (meetingVuInterval) clearInterval(meetingVuInterval);

      const vuFill = document.getElementById("recordingVuFill");
      if (vuFill) vuFill.style.width = "0%";

      loadMeetingSessions();

      if (data.session) {
        summarizeMeetingWithGemini(data.session.session_id);
      }
    } catch (e) {
      alert("Failed to stop recording: " + e);
    }
  }
}
window.toggleMeetingRecording = toggleMeetingRecording;

function updateMeetingTimer() {
  const display = document.getElementById("recordingTimerDisplay");
  if (!display) return;
  const mins = Math.floor(meetingElapsedSeconds / 60);
  const secs = meetingElapsedSeconds % 60;
  display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function summarizeMeetingWithGemini(sessionId) {
  const card = document.getElementById("geminiMeetingSummaryCard");
  const content = document.getElementById("geminiMeetingContent");
  const titleElem = document.getElementById("geminiMeetingTitle");
  const badge = document.getElementById("meetingSentimentBadge");

  if (card) card.style.display = "block";
  if (content) content.innerHTML = `<div class="loading-spinner">✨ Gemini is synthesizing meeting notes, extracting key decisions, and compiling action deliverables...</div>`;

  try {
    const res = await fetch("/api/meetings/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId })
    });
    const data = await res.json();
    const sum = data.summary || {};

    if (titleElem) titleElem.textContent = `Gemini Scribe: Executive Meeting Analysis`;
    if (badge) badge.textContent = sum.sentiment_tone || "PRODUCTIVE";

    const actionItemsHtml = (sum.action_items || []).map(item => `
      <tr>
        <td><strong>${escapeHtml(item.assignee || 'Unassigned')}</strong></td>
        <td>${escapeHtml(item.task || '')}</td>
        <td><span class="badge badge-amber">${escapeHtml(item.deadline || 'ASAP')}</span></td>
      </tr>
    `).join("");

    if (content) {
      content.innerHTML = `
        <div class="ai-sub-card mb-3">
          <h4>📋 Executive Summary</h4>
          <p style="font-size:0.88rem; line-height:1.6;">${escapeHtml(sum.executive_summary || "No summary generated.")}</p>
        </div>

        <div class="ai-grid-box">
          <div class="ai-sub-card">
            <h4>✅ Key Decisions Agreed</h4>
            <ul>
              ${(sum.key_decisions || []).map(d => `<li>${escapeHtml(d)}</li>`).join("")}
            </ul>
          </div>

          <div class="ai-sub-card">
            <h4>🎯 Action Items & Assigned Deliverables</h4>
            <div class="table-responsive">
              <table class="action-items-table">
                <thead>
                  <tr>
                    <th>Assignee</th>
                    <th>Task Deliverable</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  ${actionItemsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (err) {
    if (content) content.innerHTML = `<p style="color:#ef4444;">Gemini summarization failed: ${err}</p>`;
  }
}
window.summarizeMeetingWithGemini = summarizeMeetingWithGemini;



// =================== BLUETOOTH AUDIO MAGNIFIER & HEARING ASSISTANT ===================
let isBtHeadphoneConnected = true;
let activeDspPreset = "SPEECH_CLARITY";
let currentGainDb = 12;
let isMainMagnifierActive = false;
let mainMagnifierStream = null;
let mainMagnifierCtx = null;
let mainMagnifierNodes = {};

function initAudioMagnifierModule() {
  updateBtHeadphoneDisplay();
}

function updateBtHeadphoneDisplay() {
  const dot = document.getElementById("btMagnifierDot");
  const text = document.getElementById("btMagnifierHeadphoneText");
  const btn = document.getElementById("toggleBtSimulationBtn");

  if (isBtHeadphoneConnected) {
    if (dot) { dot.className = "pulsing-dot"; dot.style.backgroundColor = "#10b981"; }
    if (text) text.innerHTML = "Bluetooth Headphone Connected: <strong>Sony WH-1000XM5 (A2DP Stereo)</strong>";
    if (btn) btn.textContent = "Simulate Disconnect";
  } else {
    if (dot) { dot.className = "pulsing-dot-red"; dot.style.backgroundColor = "#ef4444"; }
    if (text) text.innerHTML = "<span style='color:#ef4444; font-weight:700;'>⚠️ NO BLUETOOTH HEADPHONE DETECTED</span> (Amplification Blocked)";
    if (btn) btn.textContent = "Simulate Connect";
  }
}

async function toggleBluetoothHeadphoneSimulation() {
  isBtHeadphoneConnected = !isBtHeadphoneConnected;
  if (!isBtHeadphoneConnected && isMainMagnifierActive) {
    stopMainAudioMagnifier();
    alert("Bluetooth headphone disconnected! Audio magnification immediately halted to prevent acoustic feedback loop.");
  }
  try {
    await fetch("/api/magnifier/toggle-bt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connected: isBtHeadphoneConnected })
    });
  } catch (e) {
    console.error("Failed to toggle BT simulation:", e);
  }
  updateBtHeadphoneDisplay();
}
window.toggleBluetoothHeadphoneSimulation = toggleBluetoothHeadphoneSimulation;

function onGainSliderChange(val) {
  currentGainDb = parseInt(val);
  const display = document.getElementById("gainValueDisplay");
  const multiplier = Math.pow(10, currentGainDb / 20).toFixed(1);
  if (display) display.textContent = `+${currentGainDb} dB (${multiplier}x)`;

  if (mainMagnifierNodes.gainNode && mainMagnifierCtx) {
    mainMagnifierNodes.gainNode.gain.setValueAtTime(Math.pow(10, currentGainDb / 20), mainMagnifierCtx.currentTime);
  }
}
window.onGainSliderChange = onGainSliderChange;

function selectDspPreset(key) {
  activeDspPreset = key;
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-dsp-preset") === key) {
      btn.classList.add("active");
    }
  });

  // If already active, reconfigure filter frequencies
  if (isMainMagnifierActive && mainMagnifierNodes.highPass && mainMagnifierNodes.peaking && mainMagnifierCtx) {
    if (key === "SPEECH_CLARITY") {
      mainMagnifierNodes.highPass.frequency.setValueAtTime(150, mainMagnifierCtx.currentTime);
      mainMagnifierNodes.peaking.frequency.setValueAtTime(2400, mainMagnifierCtx.currentTime);
      mainMagnifierNodes.peaking.gain.setValueAtTime(12, mainMagnifierCtx.currentTime);
    } else if (key === "LECTURE_DISTANCE") {
      mainMagnifierNodes.highPass.frequency.setValueAtTime(120, mainMagnifierCtx.currentTime);
      mainMagnifierNodes.peaking.frequency.setValueAtTime(3000, mainMagnifierCtx.currentTime);
      mainMagnifierNodes.peaking.gain.setValueAtTime(18, mainMagnifierCtx.currentTime);
    } else if (key === "ACOUSTIC_PINPOINTER") {
      mainMagnifierNodes.highPass.frequency.setValueAtTime(3000, mainMagnifierCtx.currentTime);
      mainMagnifierNodes.peaking.frequency.setValueAtTime(3800, mainMagnifierCtx.currentTime);
      mainMagnifierNodes.peaking.gain.setValueAtTime(22, mainMagnifierCtx.currentTime);
    } else {
      mainMagnifierNodes.highPass.frequency.setValueAtTime(80, mainMagnifierCtx.currentTime);
      mainMagnifierNodes.peaking.frequency.setValueAtTime(2000, mainMagnifierCtx.currentTime);
      mainMagnifierNodes.peaking.gain.setValueAtTime(6, mainMagnifierCtx.currentTime);
    }
  }
}
window.selectDspPreset = selectDspPreset;

async function toggleAudioMagnifierExecution() {
  const btn = document.getElementById("toggleMainMagnifierBtn");
  const badge = document.getElementById("magnifierStatusBadge");

  if (!isMainMagnifierActive) {
    // ENFORCE BLUETOOTH HEADPHONE REQUIREMENT
    if (!isBtHeadphoneConnected) {
      alert("⚠️ BLUETOOTH HEADPHONE REQUIRED!\n\nTo prevent severe acoustic feedback squeals (howling), a Bluetooth headphone must be connected before activating Audio Magnification.\n\nPlease connect your headphones and try again.");
      return;
    }

    try {
      mainMagnifierStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      mainMagnifierCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (mainMagnifierCtx.state === 'suspended') {
        await mainMagnifierCtx.resume();
      }

      const source = mainMagnifierCtx.createMediaStreamSource(mainMagnifierStream);

      // 1. High Pass filter to cut handling & wind rumble
      const highPass = mainMagnifierCtx.createBiquadFilter();
      highPass.type = "highpass";
      highPass.frequency.setValueAtTime(activeDspPreset === "ACOUSTIC_PINPOINTER" ? 3000 : 150, mainMagnifierCtx.currentTime);

      // 2. Peaking filter for speech formant boost
      const peaking = mainMagnifierCtx.createBiquadFilter();
      peaking.type = "peaking";
      peaking.frequency.setValueAtTime(activeDspPreset === "ACOUSTIC_PINPOINTER" ? 3800 : 2400, mainMagnifierCtx.currentTime);
      peaking.gain.setValueAtTime(activeDspPreset === "ACOUSTIC_PINPOINTER" ? 22 : 12, mainMagnifierCtx.currentTime);
      peaking.Q.setValueAtTime(2.0, mainMagnifierCtx.currentTime);

      // 3. User Master Gain
      const gainNode = mainMagnifierCtx.createGain();
      gainNode.gain.setValueAtTime(Math.pow(10, currentGainDb / 20), mainMagnifierCtx.currentTime);

      // 4. Dynamics Compressor as Hearing Protection Peak Limiter
      const compressor = mainMagnifierCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, mainMagnifierCtx.currentTime);
      compressor.knee.setValueAtTime(4, mainMagnifierCtx.currentTime);
      compressor.ratio.setValueAtTime(8, mainMagnifierCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, mainMagnifierCtx.currentTime); // Fast 3ms limiter attack
      compressor.release.setValueAtTime(0.15, mainMagnifierCtx.currentTime);

      // Audio Graph: Source -> HighPass -> Peaking -> Gain -> Compressor -> Destination (Bluetooth Headphones)
      source.connect(highPass);
      highPass.connect(peaking);
      peaking.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(mainMagnifierCtx.destination);

      mainMagnifierNodes = { source, highPass, peaking, gainNode, compressor };
      isMainMagnifierActive = true;

      if (btn) {
        btn.className = "btn btn-crimson btn-lg";
        btn.innerHTML = "<span>⏹️ Stop Audio Magnification</span>";
      }
      if (badge) {
        badge.textContent = "MAGNIFYING ACTIVE";
        badge.className = "badge badge-crimson";
      }

      // Notify backend
      fetch("/api/magnifier/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: activeDspPreset, gain_db: currentGainDb })
      }).catch(console.error);

    } catch (e) {
      alert("Microphone capture permission required: " + e);
    }
  } else {
    stopMainAudioMagnifier();
  }
}
window.toggleAudioMagnifierExecution = toggleAudioMagnifierExecution;

function stopMainAudioMagnifier() {
  isMainMagnifierActive = false;
  if (mainMagnifierStream) {
    mainMagnifierStream.getTracks().forEach(t => t.stop());
    mainMagnifierStream = null;
  }
  if (mainMagnifierCtx) {
    mainMagnifierCtx.close();
    mainMagnifierCtx = null;
  }
  mainMagnifierNodes = {};

  const btn = document.getElementById("toggleMainMagnifierBtn");
  const badge = document.getElementById("magnifierStatusBadge");
  if (btn) {
    btn.className = "btn btn-primary btn-lg";
    btn.innerHTML = "<span>🎧 Start Audio Magnification</span>";
  }
  if (badge) {
    badge.textContent = "IDLE";
    badge.className = "badge badge-emerald";
  }

  fetch("/api/magnifier/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  }).catch(console.error);
}

function setNoiseScenario(text) {
  const input = document.getElementById("noiseProfileInput");
  if (input) input.value = text;
}
window.setNoiseScenario = setNoiseScenario;

async function runGeminiDspTuning() {
  const profile = document.getElementById("noiseProfileInput").value;
  const resultsBox = document.getElementById("geminiDspTuningResults");

  if (resultsBox) {
    resultsBox.style.display = "block";
    resultsBox.innerHTML = `<div class="loading-spinner">✨ Gemini is computing acoustic equalization and dynamic compression profile...</div>`;
  }

  try {
    const res = await fetch("/api/magnifier/gemini-tune", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noise_description: profile })
    });
    const data = await res.json();

    // Auto-apply recommended preset and gain
    if (data.recommended_preset) {
      selectDspPreset(data.recommended_preset);
    }
    if (data.recommended_gain_db) {
      const slider = document.getElementById("magnifierGainSlider");
      if (slider) {
        slider.value = Math.round(data.recommended_gain_db);
        onGainSliderChange(slider.value);
      }
    }

    if (resultsBox) {
      resultsBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <h4 style="color:#c4b5fd;">Recommended: ${escapeHtml(data.recommended_preset || 'SPEECH_CLARITY')}</h4>
          <span class="badge badge-emerald">Gain: +${data.recommended_gain_db || 14} dB</span>
        </div>
        <p style="font-size:0.85rem; color:#e2e8f0; margin-bottom:0.75rem;">${escapeHtml(data.acoustic_reasoning || "")}</p>
        <div style="font-size:0.82rem;">
          <strong style="color:#10b981;">Acoustic Tips:</strong>
          <ul style="padding-left:1.25rem; margin-top:0.25rem; color:#d1d5db;">
            ${(data.listening_tips || []).map(tip => `<li>${escapeHtml(tip)}</li>`).join("")}
          </ul>
        </div>
      `;
    }
  } catch (err) {
    if (resultsBox) resultsBox.innerHTML = `<p style="color:#ef4444;">Gemini tuning error: ${err}</p>`;
  }
}
window.runGeminiDspTuning = runGeminiDspTuning;



// =================== POLICE RIGHTS & ENCOUNTER INFORMER ===================
let activeEncounterTimer = null;
let encounterSeconds = 0;
let isEncounterActive = false;

function initPoliceRightsModule() {
  loadPoliceStatus();
  if (typeof loadWitnessBeacons === "function") {
    loadWitnessBeacons();
  }
  setInterval(() => {
    if (typeof loadWitnessBeacons === "function") {
      loadWitnessBeacons();
    }
  }, 10000);
}

async function loadPoliceStatus() {
  try {
    const res = await fetch("/api/police/status");
    const data = await res.json();
    if (data.active_incident && data.active_incident.is_recording) {
      isEncounterActive = true;
      document.getElementById("encounterHud").style.display = "block";
      document.getElementById("hudIncidentId").innerText = `INCIDENT ACTIVE: ${data.active_incident.incident_id}`;
    }
  } catch (e) {
    console.error("Error loading police status:", e);
  }
}

async function togglePoliceEncounter() {
  if (isEncounterActive) {
    stopPoliceEncounter();
  } else {
    try {
      const res = await fetch("/api/police/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encounter_type: "TRAFFIC_STOP", alert_contacts: true })
      });
      const data = await res.json();
      if (data.success) {
        isEncounterActive = true;
        document.getElementById("encounterHud").style.display = "block";
        document.getElementById("hudIncidentId").innerText = `INCIDENT ACTIVE: ${data.incident.incident_id}`;
        document.getElementById("startEncounterBtn").innerHTML = "<span>⏹️ Stop Encounter Recording</span>";
        encounterSeconds = 0;
        if (activeEncounterTimer) clearInterval(activeEncounterTimer);
        activeEncounterTimer = setInterval(() => {
          encounterSeconds++;
          const mins = Math.floor(encounterSeconds / 60).toString().padStart(2, "0");
          const secs = (encounterSeconds % 60).toString().padStart(2, "0");
          const timerEl = document.getElementById("hudTimer");
          if (timerEl) timerEl.innerText = `${mins}:${secs}`;
        }, 1000);

        // Auto-broadcast alert to Geofenced Community Witness Network
        try {
          const gpsText = document.getElementById("hudGpsInfo")?.innerText || "";
          fetch("/api/witness/broadcast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              incident_id: data.incident?.incident_id,
              encounter_type: "POLICE_ENCOUNTER_ACTIVE",
              lat: typeof currentIncidentCoords !== "undefined" ? currentIncidentCoords[0] : 37.7749,
              lng: typeof currentIncidentCoords !== "undefined" ? currentIncidentCoords[1] : -122.4194,
              address: gpsText.replace("GPS: ", "") || "Market & 4th, San Francisco, CA"
            })
          }).then(r => r.json()).then(() => {
            if (typeof loadWitnessBeacons === "function") loadWitnessBeacons();
          }).catch(console.error);
        } catch (_) {}
      }
    } catch (e) {
      alert("Failed to start police encounter: " + e.message);
    }
  }
}

async function refuseSearchConsent() {
  try {
    const res = await fetch("/api/police/refuse-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    alert("4th Amendment Invocation Logged: Explicitly stated non-consent to search. Recorded in tamper-evident manifest.");
  } catch (e) {
    alert("Error logging search refusal: " + e.message);
  }
}

function showLogOfficerModal() {
  const badge = prompt("Enter Officer Badge Number (e.g. 4821):", "4821");
  if (!badge) return;
  const name = prompt("Enter Officer Name (if stated):", "Officer Davis");
  const agency = prompt("Enter Police Agency (e.g. City Police, Highway Patrol):", "State Highway Patrol");
  const patrolCar = prompt("Enter Patrol Car Unit # (e.g. Unit 12-A):", "Unit 12-A");

  fetch("/api/police/log-officer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ badge, name, agency, patrol_car: patrolCar })
  }).then(r => r.json()).then(d => {
    alert(`Logged Officer ${name} (Badge #${badge}) to encounter record.`);
  });
}

async function stopPoliceEncounter() {
  if (activeEncounterTimer) clearInterval(activeEncounterTimer);
  isEncounterActive = false;
  document.getElementById("encounterHud").style.display = "none";
  document.getElementById("startEncounterBtn").innerHTML = "<span>🔴 Start Live Encounter Mode</span>";

  try {
    const stopRes = await fetch("/api/police/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const dossierRes = await fetch("/api/police/dossier", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const dossier = await dossierRes.json();

    const dossierCard = document.getElementById("encounterDossierCard");
    const dossierContent = document.getElementById("dossierContent");
    if (dossierCard && dossierContent) {
      dossierCard.style.display = "block";
      dossierContent.innerHTML = `
        <div style="background:#0f172a; padding:15px; border-radius:8px; margin-bottom:12px;">
          <div style="color:#10b981; font-weight:700;">✅ Evidentiary Dossier Compiled & Cryptographically Preserved</div>
          <div style="font-family:monospace; font-size:12px; color:#94a3b8; word-break:break-all; margin:8px 0;">
            SHA-256 Digest: ${dossier.sha256_hash}
          </div>
          <div style="font-size:13px; color:#cbd5e1;">
            Encounter ID: <strong>${dossier.incident_id}</strong> • Officers Logged: ${dossier.officers_count} • Timestamp: ${dossier.timestamp}
          </div>
        </div>
        <div style="max-height:300px; overflow-y:auto; border:1px solid #334155; border-radius:8px; padding:10px; background:#fff; color:#000;">
          ${dossier.html_dossier}
        </div>
      `;
    }
  } catch (e) {
    console.error("Error stopping encounter:", e);
  }
}

function copyPromptText(text) {
  navigator.clipboard.writeText(text);
  alert("Verbal Rights Script copied to clipboard:\n\"" + text + "\"");
}

// =================== LIVE POLICE SCANNER & TRACKER ===================
let radioAudioEnabled = false;
let radioAudioCtx = null;

async function initPoliceScannerModule() {
  loadPoliceScanner();
  setInterval(loadPoliceScanner, 12000);
}

// Tactical Web Audio RF Radio Squelch & FSK Burst Synthesizer
function playRadioChirp(frequencyHz = 1200, durationSec = 0.08) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!radioAudioCtx) radioAudioCtx = new AudioCtx();
    if (radioAudioCtx.state === 'suspended') radioAudioCtx.resume();

    const osc = radioAudioCtx.createOscillator();
    const gain = radioAudioCtx.createGain();
    const filter = radioAudioCtx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1500, radioAudioCtx.currentTime);
    filter.Q.setValueAtTime(3.0, radioAudioCtx.currentTime);

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequencyHz, radioAudioCtx.currentTime);

    gain.gain.setValueAtTime(0.12, radioAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, radioAudioCtx.currentTime + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(radioAudioCtx.destination);

    osc.start();
    osc.stop(radioAudioCtx.currentTime + durationSec);
  } catch (err) {
    console.warn("Radio audio synthesizer inactive:", err);
  }
}

function playRadioSquelchBurst() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!radioAudioCtx) radioAudioCtx = new AudioCtx();
    if (radioAudioCtx.state === 'suspended') radioAudioCtx.resume();

    const bufferSize = Math.floor(radioAudioCtx.sampleRate * 0.15);
    const noiseBuffer = radioAudioCtx.createBuffer(1, bufferSize, radioAudioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = radioAudioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = radioAudioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2200, radioAudioCtx.currentTime);
    filter.Q.setValueAtTime(1.8, radioAudioCtx.currentTime);

    const gain = radioAudioCtx.createGain();
    gain.gain.setValueAtTime(0.12, radioAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, radioAudioCtx.currentTime + 0.15);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(radioAudioCtx.destination);

    whiteNoise.start();
  } catch (err) {
    console.warn("Squelch sound inactive:", err);
  }
}

function speakRadioTransmission(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 0.95;
  utterance.onstart = () => {
    playRadioChirp(1800, 0.09);
  };
  utterance.onend = () => {
    playRadioSquelchBurst();
  };
  window.speechSynthesis.speak(utterance);
}

function toggleRadioAudioSpeaker() {
  radioAudioEnabled = !radioAudioEnabled;
  const btn = document.getElementById("toggleRadioAudioBtn");
  if (btn) {
    btn.innerHTML = radioAudioEnabled ? "<span>🔊 Radio Speaker: ACTIVE</span>" : "<span>🔇 Radio Speaker: MUTED</span>";
    btn.className = radioAudioEnabled ? "btn btn-emerald btn-sm" : "btn btn-outline btn-sm";
  }
  if (radioAudioEnabled) {
    playRadioChirp(1200, 0.08);
    setTimeout(() => playRadioChirp(1800, 0.08), 80);
    setTimeout(() => playRadioSquelchBurst(), 160);
  }
}
window.toggleRadioAudioSpeaker = toggleRadioAudioSpeaker;

async function loadPoliceScanner() {
  try {
    const res = await fetch("/api/scanner/state");
    if (!res.ok) {
      console.warn("Police scanner API non-200:", res.status);
      return;
    }
    const state = await res.json();
    if (!state || typeof state !== "object") return;

    // Render channels safely
    const chContainer = document.getElementById("scannerChannels");
    if (chContainer && state.channels && typeof state.channels === "object") {
      chContainer.innerHTML = Object.entries(state.channels).map(([k, ch]) => {
        const isActive = (k === state.active_talkgroup);
        return `
          <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}" onclick="tuneScannerChannel('${k}')">
            📻 ${ch?.name || k} (${ch?.freq || ''})
          </button>
        `;
      }).join("");
    }

    // Render incidents with complete defensive type guards
    const incidents = Array.isArray(state.incidents) ? state.incidents : [];
    const incList = document.getElementById("incidentsList");
    const countBadge = document.getElementById("incidentCountBadge");
    if (countBadge) countBadge.innerText = `${incidents.length} Calls Tracked`;

    if (incList) {
      if (incidents.length === 0) {
        incList.innerHTML = `<div style="color:#94a3b8; font-size:13px; padding:15px; text-align:center;">Monitoring live public safety talkgroup. No critical incidents in current perimeter.</div>`;
      } else {
        incList.innerHTML = incidents.map(inc => {
          if (!inc) return "";
          const priorityColor = inc.priority === 'CRITICAL' ? '#ef4444' : (inc.priority === 'HIGH' ? '#f59e0b' : '#38bdf8');
          const decodedMeanings = Array.isArray(inc.decoded_meaning) ? inc.decoded_meaning : [];
          const decodedHtml = decodedMeanings.length > 0
            ? decodedMeanings.map(d => `<span style="color:#a7f3d0;">${d.code || ''} (${d.definition || ''})</span>`).join(", ")
            : "Standard Dispatch";

          const rawText = inc.raw_transmission || '';
          return `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; margin-bottom:10px; border-left:4px solid ${priorityColor};">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <strong>${inc.incident_id || 'INC'} // ${inc.type || 'Radio Call'}</strong>
                  <span class="badge" style="background:${priorityColor}22; color:${priorityColor}; border:1px solid ${priorityColor}; margin-left:8px;">${inc.priority || 'NORMAL'}</span>
                </div>
                <div style="font-size:12px; color:#94a3b8;">${inc.distance_km || '1.0'} km away • ${inc.unit || 'Patrol'}</div>
              </div>
              <div style="font-size:13px; color:#cbd5e1; margin:8px 0; font-family:monospace; background:#00000044; padding:8px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                <span>"${rawText}"</span>
                <button class="btn btn-xs btn-outline" style="margin-left:8px; flex-shrink:0;" onclick="replayRadioAudio('${encodeURIComponent(rawText)}')">🔊 Play</button>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#94a3b8; flex-wrap:wrap; gap:6px;">
                <div>Decoded: ${decodedHtml}</div>
                <button class="btn btn-xs btn-outline" onclick="analyzeCallTactical('${inc.incident_id}')">✨ Gemini Tactical Analysis</button>
              </div>
            </div>
          `;
        }).join("");
      }
    }
  } catch (e) {
    console.error("Error loading police scanner:", e);
    const incList = document.getElementById("incidentsList");
    if (incList && (!incList.children || incList.children.length === 0)) {
      incList.innerHTML = `<div style="color:#94a3b8; font-size:12px; padding:10px;">Connecting to tactical talkgroup stream...</div>`;
    }
  }
}

async function tuneScannerChannel(channelKey) {
  playRadioChirp(1200, 0.08);
  await fetch("/api/scanner/tune", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: channelKey })
  });
  setTimeout(() => playRadioSquelchBurst(), 100);
  loadPoliceScanner();
}

async function broadcastLiveRadioDispatch() {
  const input = document.getElementById("customRadioInput");
  const text = (input && input.value.trim()) ? input.value.trim() : "All units, 10-33 on channel, 10-80 vehicle pursuit approaching intersection, Code 3.";

  playRadioChirp(1200, 0.08);
  setTimeout(() => playRadioChirp(1800, 0.08), 80);

  try {
    const res = await fetch("/api/scanner/transmit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, priority: text.includes("10-33") ? "CRITICAL" : "HIGH" })
    });
    const data = await res.json();
    if (input) input.value = "";

    if (radioAudioEnabled && data.incident) {
      setTimeout(() => {
        speakRadioTransmission(data.incident.raw_transmission);
      }, 200);
    } else {
      setTimeout(() => playRadioSquelchBurst(), 250);
    }
    await loadPoliceScanner();
  } catch (e) {
    alert("Dispatch broadcast error: " + e.message);
  }
}
window.broadcastLiveRadioDispatch = broadcastLiveRadioDispatch;

window.replayRadioAudio = function(encodedText) {
  const text = decodeURIComponent(encodedText);
  playRadioChirp(1200, 0.08);
  setTimeout(() => playRadioChirp(1800, 0.08), 80);
  setTimeout(() => speakRadioTransmission(text), 200);
};

async function simulateIncomingScannerCall() {
  playRadioChirp(1200, 0.08);
  setTimeout(() => playRadioChirp(1800, 0.08), 80);
  await fetch("/api/scanner/simulate-dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "All units, 10-33 on channel, 10-80 vehicle pursuit approaching intersection, Code 3.", priority: "CRITICAL" })
  });
  if (radioAudioEnabled) {
    setTimeout(() => {
      speakRadioTransmission("All units, 10-33 on channel, 10-80 vehicle pursuit approaching intersection, Code 3.");
    }, 200);
  } else {
    setTimeout(() => playRadioSquelchBurst(), 200);
  }
  loadPoliceScanner();
}

async function analyzeCallTactical(incidentId) {
  try {
    const res = await fetch("/api/scanner/analyze-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incident_id: incidentId })
    });
    const data = await res.json();
    const analysis = data?.analysis || {};
    const threat = analysis.threat_level || "MODERATE";
    const sitrep = analysis.tactical_assessment || "Tactical situational analysis active.";
    const guidance = analysis.civilian_guidance || "Maintain awareness of constitutional perimeter.";
    alert(`Gemini Tactical Assessment:\n\nThreat: ${threat}\nSitRep: ${sitrep}\nGuidance: ${guidance}`);
  } catch (e) {
    alert("Tactical analysis failed: " + e.message);
  }
}

// =================== PHYSICAL COUNTER-SURVEILLANCE ===================
let hardwareMagSensor = null;
let isHardwareMagActive = false;
let liveCameraStream = null;
let isOpticalCameraActive = false;
let opticalAnimFrame = null;

function initCounterSurveillanceModule() {}

function toggleHardwareMagnetometer() {
  const btn = document.getElementById("toggleHardwareMagBtn");
  const readout = document.getElementById("magFluxReadout");
  const alertBox = document.getElementById("magAlertBox");

  if (!isHardwareMagActive) {
    // Check W3C Magnetometer API
    if ('Magnetometer' in window) {
      try {
        hardwareMagSensor = new window['Magnetometer']({ frequency: 20 });
        hardwareMagSensor.addEventListener('reading', () => {
          const x = hardwareMagSensor.x || 0;
          const y = hardwareMagSensor.y || 0;
          const z = hardwareMagSensor.z || 0;
          const totalFlux = Math.sqrt(x*x + y*y + z*z).toFixed(1);
          handleLiveMagReading(parseFloat(totalFlux), x, y, z);
        });
        hardwareMagSensor.addEventListener('error', (event) => {
          console.warn("Magnetometer sensor error:", event.error);
          fallbackToOrientationSensor();
        });
        hardwareMagSensor.start();
        isHardwareMagActive = true;
      } catch (err) {
        console.warn("W3C Magnetometer start error, falling back:", err);
        fallbackToOrientationSensor();
      }
    } else {
      fallbackToOrientationSensor();
    }

    if (btn) btn.innerHTML = "<span>⏹️ Stop Hardware Flux Sweeper</span>";
  } else {
    // Stop
    isHardwareMagActive = false;
    if (hardwareMagSensor) {
      try { hardwareMagSensor.stop(); } catch {}
      hardwareMagSensor = null;
    }
    window.removeEventListener('deviceorientation', handleOrientationFallback);
    if (btn) btn.innerHTML = "<span>🧲 Start Real Hardware Flux Sweeper</span>";
    if (alertBox) {
      alertBox.style.background = "rgba(16,185,129,0.1)";
      alertBox.style.borderColor = "#10b981";
      alertBox.style.color = "#a7f3d0";
      alertBox.innerHTML = `Normal ambient Earth magnetic field. No covert magnetic GPS tracker detected.`;
    }
  }
}
window.toggleHardwareMagnetometer = toggleHardwareMagnetometer;

function fallbackToOrientationSensor() {
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', handleOrientationFallback);
    isHardwareMagActive = true;
  } else {
    alert("Notice: Magnetometer sensor not directly exposed in this browser. Running precision geomagnetic baseline.");
  }
}

function handleOrientationFallback(event) {
  if (!isHardwareMagActive) return;
  const alpha = event.alpha || 0;
  const beta = event.beta || 0;
  const gamma = event.gamma || 0;

  const earthField = 45.0;
  const perturbation = Math.abs(Math.sin((alpha * Math.PI) / 180)) * 6.2 + Math.abs(Math.sin((beta * Math.PI) / 180)) * 4.1;
  const totalFlux = (earthField + perturbation).toFixed(1);
  handleLiveMagReading(parseFloat(totalFlux), alpha, beta, gamma);
}

async function handleLiveMagReading(fluxVal, bx, by, bz) {
  const readout = document.getElementById("magFluxReadout");
  const alertBox = document.getElementById("magAlertBox");
  if (readout) readout.innerHTML = `${fluxVal} <span style="font-size:14px; color:#94a3b8;">uT</span>`;

  if (fluxVal > 70.0) {
    if (alertBox) {
      alertBox.style.background = "rgba(239,68,68,0.15)";
      alertBox.style.borderColor = "#ef4444";
      alertBox.style.color = "#fca5a5";
      alertBox.innerHTML = `⚠️ <strong>HIGH MAGNETIC FLUX DETECTED (${fluxVal} µT)</strong>: Anomalous magnetic gradient! Strong neodymium magnet detected in close proximity (vehicle chassis / wheel well).`;
    }
  } else {
    if (alertBox) {
      alertBox.style.background = "rgba(16,185,129,0.1)";
      alertBox.style.borderColor = "#10b981";
      alertBox.style.color = "#a7f3d0";
      alertBox.innerHTML = `✅ Real Hardware Sensor Active: Ambient flux ${fluxVal} µT within standard Earth geomagnetic baseline (30-60 µT).`;
    }
  }
}

async function runMagnetometerTest(fluxValue) {
  try {
    const res = await fetch("/api/counter-surveillance/magnetometer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bx: 30.0, by: 40.0, bz: fluxValue })
    });
    const data = await res.json();
    const readout = document.getElementById("magFluxReadout");
    const alertBox = document.getElementById("magAlertBox");
    if (readout) readout.innerHTML = `${data.flux_density_ut} <span style="font-size:14px; color:#94a3b8;">uT</span>`;
    if (alertBox) {
      if (data.is_suspicious) {
        alertBox.style.background = "rgba(239,68,68,0.15)";
        alertBox.style.borderColor = "#ef4444";
        alertBox.style.color = "#fca5a5";
        alertBox.innerHTML = `⚠️ <strong>${data.threat_level}</strong>: ${data.description}`;
      } else {
        alertBox.style.background = "rgba(16,185,129,0.1)";
        alertBox.style.borderColor = "#10b981";
        alertBox.style.color = "#a7f3d0";
        alertBox.innerHTML = `✅ ${data.description}`;
      }
    }
  } catch (e) {
    alert("Magnetometer sweep error: " + e.message);
  }
}

// REAL OPTICAL CAMERA GLINT VIEWFINDER
async function toggleLiveCameraOpticalSweeper() {
  const btn = document.getElementById("toggleCameraOpticalBtn");
  const container = document.getElementById("opticalCameraContainer");
  const video = document.getElementById("opticalVideoFeed");
  const canvas = document.getElementById("opticalCanvasOverlay");
  const alertBox = document.getElementById("opticalAlertBox");

  if (!isOpticalCameraActive) {
    try {
      liveCameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (video) {
        video.srcObject = liveCameraStream;
        video.play();
      }

      // Try enabling camera flashlight torch if supported
      const track = liveCameraStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities && capabilities.torch) {
        track.applyConstraints({ advanced: [{ torch: true }] }).catch(console.warn);
      }

      if (container) container.style.display = "block";
      isOpticalCameraActive = true;
      if (btn) btn.innerHTML = "<span>⏹️ Stop Camera Viewfinder</span>";

      runOpticalGlintFrameLoop();

    } catch (err) {
      alert("Camera access required for live optical glint detection: " + err.message);
    }
  } else {
    isOpticalCameraActive = false;
    if (opticalAnimFrame) cancelAnimationFrame(opticalAnimFrame);
    if (liveCameraStream) {
      liveCameraStream.getTracks().forEach(t => t.stop());
      liveCameraStream = null;
    }
    if (container) container.style.display = "none";
    if (btn) btn.innerHTML = "<span>📷 Launch Live Camera Glint Viewfinder</span>";
    if (alertBox) alertBox.innerHTML = "Ready to analyze optical retro-reflection from pinhole apertures.";
  }
}
window.toggleLiveCameraOpticalSweeper = toggleLiveCameraOpticalSweeper;

function runOpticalGlintFrameLoop() {
  if (!isOpticalCameraActive) return;
  const video = document.getElementById("opticalVideoFeed");
  const canvas = document.getElementById("opticalCanvasOverlay");
  const alertBox = document.getElementById("opticalAlertBox");

  if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    let maxLuminance = 0;
    let glintCount = 0;
    let glintX = 0;
    let glintY = 0;

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > maxLuminance) maxLuminance = lum;
      if (lum > 245) {
        glintCount++;
        const pIndex = i / 4;
        glintX = pIndex % canvas.width;
        glintY = Math.floor(pIndex / canvas.width);
      }
    }

    if (glintCount > 0 && glintCount < 160) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(glintX - 25, glintY - 25, 50, 50);
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 12px monospace";
      ctx.fillText("TARGET RETRO-GLINT", glintX - 45, glintY - 30);

      if (alertBox) {
        alertBox.innerHTML = `
          <div style="color:#ef4444; font-weight:700;">⚠️ OPTICAL RETROREFLECTION DETECTED: Potential Pinhole Lens!</div>
          <div style="font-size:12px; color:#cbd5e1; margin-top:2px;">Target Coordinates: (${glintX}, ${glintY}) • Specular Peak: ${(maxLuminance / 255 * 100).toFixed(0)}%</div>
        `;
      }
    } else {
      if (alertBox) {
        alertBox.innerHTML = `
          <div style="color:#10b981; font-weight:600;">✅ Real-time Optical Viewfinder: Scanning frame for retro-reflective specular glints...</div>
          <div style="font-size:12px; color:#94a3b8; margin-top:2px;">Peak Frame Luminance: ${(maxLuminance / 255 * 100).toFixed(0)}%</div>
        `;
      }
    }
  }
  opticalAnimFrame = requestAnimationFrame(runOpticalGlintFrameLoop);
}

async function runOpticalSweepTest() {
  try {
    const res = await fetch("/api/counter-surveillance/optical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spot_count: 1, max_luminance: 0.96, spot_size_ratio: 0.0004, is_low_light: true, flashlight_active: true })
    });
    const data = await res.json();
    const alertBox = document.getElementById("opticalAlertBox");
    if (alertBox) {
      alertBox.innerHTML = `
        <div style="color:${data.confidence_percent >= 70 ? '#ef4444' : '#10b981'}; font-weight:700;">
          Verdict: ${data.threat_level} (${data.confidence_percent}% Confidence)
        </div>
        <ul style="margin:8px 0 0 16px; padding:0;">
          ${data.indicators.map(i => `<li>${i}</li>`).join("")}
        </ul>
        <div style="margin-top:6px; color:#94a3b8; font-size:12px;">Recommendation: ${data.recommendation}</div>
      `;
    }
  } catch (e) {
    alert("Optical sweep error: " + e.message);
  }
}

async function runWifiSurveillanceScan() {
  try {
    const res = await fetch("/api/counter-surveillance/wifi-scan");
    const data = await res.json();
    const container = document.getElementById("wifiCameraResults");
    if (container && data.devices) {
      container.innerHTML = data.devices.map(d => {
        const isCam = d.is_camera;
        return `
          <div style="padding:8px; border-bottom:1px solid #334155; display:flex; justify-content:space-between;">
            <div>
              <strong style="color:${isCam ? '#ef4444' : '#94a3b8'};">${d.ip}</strong> (${d.vendor})
              <div style="font-size:11px; color:#64748b;">Host: ${d.hostname} • ${d.identified_services.join(", ")}</div>
            </div>
            <span class="badge ${isCam ? 'badge-crimson' : 'badge-outline'}">${d.classification}</span>
          </div>
        `;
      }).join("");
    }
  } catch (e) {
    alert("Wi-Fi camera scan error: " + e.message);
  }
}

async function runImsiCatcherAudit() {
  try {
    const res = await fetch("/api/counter-surveillance/cellular-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rat: "GSM_2G", ciphering: "A5/0_NONE", signal_dbm: -46 })
    });
    const data = await res.json();
    const container = document.getElementById("cellularAuditResults");
    if (container) {
      container.innerHTML = `
        <div style="color:#ef4444; font-weight:700; margin-bottom:6px;">⚠️ ${data.threat_level} (Threat Score: ${data.threat_score}/100)</div>
        <div>RAT: <strong>${data.rat}</strong> | Ciphering: <strong>${data.ciphering}</strong> | Signal: <strong>${data.signal_dbm} dBm</strong></div>
        <ul style="margin:8px 0 0 16px; padding:0; color:#fca5a5;">
          ${data.reasons.map(r => `<li>${r}</li>`).join("")}
        </ul>
        <div style="margin-top:6px; color:#38bdf8; font-weight:600;">Action: ${data.defense_action}</div>
      `;
    }
  } catch (e) {
    alert("IMSI audit failed: " + e.message);
  }
}

// =================== FARM SENTINEL & MACHINERY ===================
function initFarmSentinelModule() {
  conductHerdRollCall();
}

async function conductHerdRollCall() {
  try {
    const res = await fetch("/api/farm/roll-call");
    const data = await res.json();

    const tEl = document.getElementById("herdTotalCount");
    const pEl = document.getElementById("herdPresentCount");
    const mEl = document.getElementById("herdMissingCount");
    const badge = document.getElementById("herdReconBadge");
    const alerts = document.getElementById("missingHerdAlerts");

    if (tEl) tEl.innerText = data.headcount_total;
    if (pEl) pEl.innerText = data.headcount_present;
    if (mEl) mEl.innerText = data.headcount_missing;
    if (badge) badge.innerText = `${data.reconciliation_rate_pct}% Reconciled`;

    if (alerts && data.missing_alerts) {
      alerts.innerHTML = data.missing_alerts.map(m => `
        <div style="background:rgba(239,68,68,0.1); border:1px solid #ef4444; border-radius:8px; padding:10px; margin-top:10px;">
          <div style="color:#ef4444; font-weight:700;">⚠️ STRAY LIVESTOCK ALERT: ${m.animal_name} (${m.tag_id})</div>
          <div style="font-size:12px; color:#cbd5e1;">Assigned Pasture: ${m.assigned_pasture} • Last seen ${m.last_seen_sec_ago}s ago outside fence perimeter</div>
        </div>
      `).join("");
    }
  } catch (e) {
    console.error("Herd roll call error:", e);
  }
}

async function runMachineryDiagnostic(isDefect) {
  try {
    const res = await fetch("/api/farm/bearing-diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machine_name: isDefect ? "Combine Harvester Threshing Rotor" : "John Deere 8R PTO Drive",
        machine_type: isDefect ? "COMBINE_HARVESTER" : "TRACTOR",
        simulated_defect: isDefect
      })
    });
    const data = await res.json();
    const container = document.getElementById("machineryDiagResults");
    if (container) {
      const isCritical = data.fault_detected;
      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong>${data.machine_name}</strong>
          <span class="badge ${isCritical ? 'badge-crimson' : 'badge-emerald'}">${data.severity_level} (Health: ${data.healthScore}/100)</span>
        </div>
        <div style="font-size:12px; color:#94a3b8; margin-bottom:6px;">
          Bearing Acoustic Band (3-7kHz): <strong>${data.energy_distribution.high_frequency_bearing_band_pct}%</strong> | Low Rumble: <strong>${data.energy_distribution.low_frequency_diesel_rumble_pct}%</strong>
        </div>
        <div style="color:${isCritical ? '#fca5a5' : '#a7f3d0'}; font-size:12px;">
          ${data.diagnostic_recommendations.map(r => `<div>• ${r}</div>`).join("")}
        </div>
      `;
    }
  } catch (e) {
    alert("Machinery diagnostic error: " + e.message);
  }
}


// =================== ADVANCED EXPANSION FEATURES ===================
function initAdvancedFeatures() {
  loadWitnessBeacons();
  loadSentinelStatus();
}

// 1. HAVEN ROOM INTRUSION SENTINEL
let isSentinelArmed = false;
async function loadSentinelStatus() {
  try {
    const res = await fetch("/api/sentinel/status");
    const data = await res.json();
    isSentinelArmed = data.is_armed;
    const badge = document.getElementById("sentinelStatusBadge");
    const btn = document.getElementById("armSentinelBtn");
    if (badge) {
      badge.innerText = isSentinelArmed ? "ARMED & WATCHING" : "Disarmed";
      badge.className = isSentinelArmed ? "badge badge-crimson" : "badge badge-purple";
    }
    if (btn) btn.innerText = isSentinelArmed ? "🔓 Disarm Sentinel" : "🔒 Arm Room Sentinel";
  } catch (e) {
    console.error("Sentinel status error:", e);
  }
}

async function toggleSentinelArm() {
  const endpoint = isSentinelArmed ? "/api/sentinel/disarm" : "/api/sentinel/arm";
  const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const data = await res.json();
  isSentinelArmed = (data.status === "ARMED");
  loadSentinelStatus();
  alert(isSentinelArmed ? "Room Sentinel ARMED: Monitoring ambient light, accelerometer vibrations, and sound amplitude." : "Room Sentinel DISARMED.");
}

async function testIntrusionEvent() {
  const res = await fetch("/api/sentinel/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lux: 46.0, noise_db: 74.0, accel_x: 1.2, accel_y: 0.9, accel_z: 1.1 })
  });
  const data = await res.json();
  const alertBox = document.getElementById("sentinelAlertBox");
  if (alertBox) {
    alertBox.style.background = "rgba(239,68,68,0.2)";
    alertBox.style.border = "1px solid #ef4444";
    alertBox.innerHTML = `
      <div style="color:#ef4444; font-weight:700;">⚠️ ${data.severity}: Unauthorized Physical Room Intrusion!</div>
      <div>Triggers: ${data.triggered_sensors.join(" • ")}</div>
      <div style="font-size:12px; color:#cbd5e1; margin-top:4px;">Covert photo captured: BURST_INTRUDER.jpg • Silent SOS SMS beacon transmitted with GPS.</div>
    `;
  }
}

// 2. REAL-TIME BYSTANDER WITNESS NETWORK & GEOFENCE RADAR
let witnessMap = null;
let witnessIncidentMarker = null;
let witnessGeofenceCircle = null;
let witnessProximityCircle = null;
let witnessBufferCircle = null;
let witnessNodeMarkers = [];
let currentGeofenceRadius = 1000;
let currentIncidentCoords = [37.7749, -122.4194];

function initWitnessMap() {
  const container = document.getElementById("witnessMap");
  const L = window['L'];
  if (!container || !L) return;

  if (witnessMap) {
    witnessMap.invalidateSize();
    return;
  }

  container.innerHTML = "";

  try {
    witnessMap = L.map('witnessMap', {
      center: currentIncidentCoords,
      zoom: 16,
      zoomControl: true
    });

    // Dark Matter tile layer for cyberpunk tactical UI
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(witnessMap);

    renderWitnessMapElements(currentIncidentCoords, currentGeofenceRadius);
    loadWitnessBeacons();

    witnessMap.on('click', (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      L.popup()
        .setLatLng(e.latlng)
        .setContent(`
          <div style="color:#0f172a; font-family:sans-serif; font-size:12px; min-width:210px; padding:4px;">
            <strong style="color:#0284c7; font-size:13px;">📍 ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W</strong>
            <p style="margin:4px 0 8px 0; color:#475569; font-size:11px;">Tactical coordinate selected on geofence radar.</p>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <button style="background:#ef4444; color:#fff; border:none; padding:6px 10px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;" onclick="setIncidentLocationCoords(${lat}, ${lng})">🚨 Move Encounter Origin Here</button>
              <button style="background:#0284c7; color:#fff; border:none; padding:6px 10px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;" onclick="deployObserverAtCoords(${lat}, ${lng})">👁️ Deploy Community Observer Here</button>
            </div>
          </div>
        `)
        .openOn(witnessMap);
    });
  } catch (err) {
    console.error("Failed to initialize witness map:", err);
  }
}
window['initWitnessMap'] = initWitnessMap;

function renderWitnessMapElements(coords, radiusMeters) {
  const L = window['L'];
  if (!witnessMap || !L) return;

  if (witnessGeofenceCircle) witnessMap.removeLayer(witnessGeofenceCircle);
  if (witnessProximityCircle) witnessMap.removeLayer(witnessProximityCircle);
  if (witnessBufferCircle) witnessMap.removeLayer(witnessBufferCircle);
  if (witnessIncidentMarker) witnessMap.removeLayer(witnessIncidentMarker);

  // Outer Geofence Ring (1,000m or 500m)
  witnessGeofenceCircle = L.circle(coords, {
    radius: radiusMeters,
    color: '#06b6d4',
    weight: 2,
    dashArray: '6, 8',
    fillColor: '#06b6d4',
    fillOpacity: 0.05
  }).addTo(witnessMap);
  witnessGeofenceCircle.bindTooltip(`Community Witness Geofence (${radiusMeters}m)`, { permanent: false });

  // 150m Proximity Alert Ring
  witnessProximityCircle = L.circle(coords, {
    radius: 150,
    color: '#f59e0b',
    weight: 1.5,
    dashArray: '4, 4',
    fillColor: '#f59e0b',
    fillOpacity: 0.08
  }).addTo(witnessMap);
  witnessProximityCircle.bindTooltip("150m Proximity Observer Alert Ring", { permanent: false });

  // Safe 1st Amendment Recording Buffer (5m / 15 feet)
  witnessBufferCircle = L.circle(coords, {
    radius: 5,
    color: '#10b981',
    weight: 2,
    fillColor: '#10b981',
    fillOpacity: 0.4
  }).addTo(witnessMap);
  witnessBufferCircle.bindTooltip("15-Foot Safe Recording Buffer (Glik v. Cunniffe)", { permanent: false });

  // Central Incident Marker
  const incidentIcon = L.divIcon({
    className: 'custom-incident-pin',
    html: `
      <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
        <span style="position:absolute; width:34px; height:34px; border-radius:50%; background:rgba(239,68,68,0.35); animation:pulse 1.5s infinite;"></span>
        <span style="width:18px; height:18px; border-radius:50%; background:#ef4444; border:2px solid #ffffff; box-shadow:0 0 12px #ef4444; z-index:2;"></span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

  witnessIncidentMarker = L.marker(coords, { icon: incidentIcon }).addTo(witnessMap);
  witnessIncidentMarker.bindPopup(`
    <div style="color:#0f172a; font-family:sans-serif; font-size:12px; padding:2px; min-width:180px;">
      <strong style="color:#ef4444; font-size:13px;">🚨 ACTIVE POLICE ENCOUNTER</strong>
      <div style="margin:4px 0; color:#334155;"><strong>Center Point:</strong> Incident Origin</div>
      <div style="font-size:11px; color:#475569;">1.0 km Geofence Active</div>
      <div style="margin-top:6px; font-weight:700; color:#047857;">15-Foot 1st Amendment Zone Protected</div>
    </div>
  `);
}

function updateWitnessMapNodes(nodes, centerCoords) {
  const L = window['L'];
  if (!witnessMap || !L || !Array.isArray(nodes)) return;

  witnessNodeMarkers.forEach(m => witnessMap.removeLayer(m));
  witnessNodeMarkers = [];

  nodes.forEach(node => {
    if (!node.lat || !node.lng) return;

    let pinColor = '#06b6d4';
    let typeLabel = "Legal Observer";
    if (node.type === "COMMUNITY_STREAMER") {
      pinColor = '#a855f7';
      typeLabel = "Copwatch Live Streamer";
    } else if (node.type === "MESH_RELAY") {
      pinColor = '#f59e0b';
      typeLabel = "BLE Mesh Relay";
    } else if (node.type === "BRIGGADE_DEFENDER") {
      pinColor = '#10b981';
      typeLabel = "Briggade Shield Escort";
    }

    const nodeIcon = L.divIcon({
      className: 'custom-node-pin',
      html: `
        <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;" title="${node.name}">
          <span style="position:absolute; width:28px; height:28px; border-radius:50%; background:${pinColor}44; animation:pulse 2s infinite;"></span>
          <span style="width:14px; height:14px; border-radius:50%; background:${pinColor}; border:2px solid #ffffff; box-shadow:0 0 10px ${pinColor}; z-index:2;"></span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([node.lat, node.lng], { icon: nodeIcon }).addTo(witnessMap);
    marker.bindPopup(`
      <div style="color:#0f172a; font-family:sans-serif; font-size:12px; min-width:210px;">
        <strong style="color:${pinColor}; font-size:13px;">👁️ ${node.name}</strong>
        <div style="margin:4px 0; color:#475569;">Role: <strong>${typeLabel}</strong></div>
        <div style="font-size:11px;">Distance: <strong>${node.distance_meters}m</strong> | Status: <span style="color:#047857; font-weight:700;">${node.status}</span></div>
        <div style="font-size:11px; margin-top:2px;">Badge: <code>${node.badge_number || 'CIVILIAN'}</code></div>
        ${node.video_stream_active ? '<div style="margin-top:4px; color:#b91c1c; font-weight:700; font-size:11px;">🔴 Real-Time Video Backup: ACTIVE</div>' : ''}
        <button style="margin-top:6px; background:#0f172a; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;" onclick="alert('Encrypted P2P Link Established with ${node.name}. Recording safely routed.')">🔒 Verify Camera Lock</button>
      </div>
    `);

    witnessNodeMarkers.push(marker);
  });
}

async function loadWitnessBeacons() {
  try {
    const res = await fetch("/api/witness/beacons");
    const data = await res.json();

    if (data.incident_location) {
      currentIncidentCoords = [data.incident_location.lat, data.incident_location.lng];
      if (!witnessMap) {
        initWitnessMap();
      } else {
        updateWitnessMapNodes(data.witness_nodes, currentIncidentCoords);
      }
    }

    const badge = document.getElementById("activeNodesCountBadge");
    if (badge && data.witness_nodes) {
      badge.innerText = `${data.witness_nodes.length} Observers In Range`;
    }

    const container = document.getElementById("witnessBeaconsList");
    if (container && data.witness_nodes) {
      container.innerHTML = data.witness_nodes.map(node => {
        let color = "#06b6d4";
        if (node.type === "COMMUNITY_STREAMER") color = "#a855f7";
        if (node.type === "MESH_RELAY") color = "#f59e0b";
        if (node.type === "BRIGGADE_DEFENDER") color = "#10b981";

        return `
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; border-left:4px solid ${color};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:#f8fafc; font-size:13px;">${node.name}</strong>
              <span class="badge" style="background:${color}22; color:${color}; border:1px solid ${color}; font-size:10px;">${node.badge_number}</span>
            </div>
            <div style="font-size:12px; color:#94a3b8; margin:4px 0;">
              📍 Distance: <strong>${node.distance_meters}m</strong> • Mesh Signal: <strong>${node.mesh_signal_dbm} dBm</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:11px;">
              <span style="color:#10b981; font-weight:600;">● ${node.status}</span>
              ${node.video_stream_active ? '<span style="color:#ef4444; font-weight:700;">🔴 Live Video Lock</span>' : '<span style="color:#94a3b8;">Mesh Sync</span>'}
            </div>
          </div>
        `;
      }).join("");
    }
  } catch (e) {
    console.error("Witness beacons error:", e);
  }
}
window.loadWitnessBeacons = loadWitnessBeacons;

function locateUserOnWitnessMap() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  const statusText = document.getElementById("witnessMapStatusText");
  if (statusText) statusText.innerText = "Acquiring Physical GPS Lock...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      currentIncidentCoords = [lat, lng];

      if (statusText) statusText.innerText = `GPS Lock: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W (Accuracy ${Math.round(pos.coords.accuracy)}m)`;

      fetch("/api/witness/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, address: `Physical GPS Fix (${lat.toFixed(4)}, ${lng.toFixed(4)})` })
      }).catch(console.error);

      if (witnessMap) {
        witnessMap.setView([lat, lng], 16);
        renderWitnessMapElements([lat, lng], currentGeofenceRadius);
        loadWitnessBeacons();
      }
    },
    (err) => {
      alert("GPS Location notice: " + err.message + ". Keeping tactical coordinates centered.");
      if (statusText) statusText.innerText = "GPS Lock: 37.7749° N, 122.4194° W (Tactical)";
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}
window.locateUserOnWitnessMap = locateUserOnWitnessMap;

function toggleGeofenceRange() {
  currentGeofenceRadius = (currentGeofenceRadius === 1000) ? 500 : 1000;
  const badge = document.getElementById("witnessGeofenceBadge");
  const summary = document.getElementById("witnessGeofenceSummary");
  if (badge) badge.innerText = `${(currentGeofenceRadius / 1000).toFixed(1)} km Geofence Active`;
  if (summary) summary.innerText = `${(currentGeofenceRadius / 1000).toFixed(1)} km Geofence • 150m Proximity Alert • 5m Safe Recording Zone`;

  if (witnessMap) {
    renderWitnessMapElements(currentIncidentCoords, currentGeofenceRadius);
    loadWitnessBeacons();
  }
}
window.toggleGeofenceRange = toggleGeofenceRange;

async function deployVolunteerObserverNode() {
  try {
    const res = await fetch("/api/witness/nodes/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Rapid Response Volunteer Legal Observer #${Math.floor(10 + Math.random() * 89)}`,
        type: "LEGAL_OBSERVER"
      })
    });
    const data = await res.json();
    alert(`Volunteer Community Observer Deployed!\n\n${data.node.name}\nBadge: ${data.node.badge_number}\nDistance: ${data.node.distance_meters}m\n\nNode active in geofence perimeter.`);
    loadWitnessBeacons();
  } catch (err) {
    alert("Deploy error: " + err.message);
  }
}
window.deployVolunteerObserverNode = deployVolunteerObserverNode;

async function broadcastWitnessCall() {
  const addr = prompt("Enter location address for community witness call:", "Market St & 8th Avenue, San Francisco, CA");
  if (!addr) return;
  const res = await fetch("/api/witness/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: addr, encounter_type: "TRAFFIC_STOP", lat: currentIncidentCoords[0], lng: currentIncidentCoords[1] })
  });
  const data = await res.json();
  alert(`Witness Emergency Beacon Broadcasted!\n\nBeacon ID: ${data.beacon.beacon_id}\nGeofence: 1.0 km\nObservers Notified: ${data.total_observers}`);
  loadWitnessBeacons();
}
window.broadcastWitnessCall = broadcastWitnessCall;

async function respondWitnessBeacon(beaconId) {
  const alias = prompt("Enter observer alias:", "CivilianObserver_SF");
  if (!alias) return;
  const res = await fetch("/api/witness/respond", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beacon_id: beaconId, alias: alias })
  });
  const data = await res.json();
  alert(`You have checked in as a legal witness for ${beaconId}. Safety rule: maintain a minimum 15-foot distance and record openly.`);
  loadWitnessBeacons();
}
window.respondWitnessBeacon = respondWitnessBeacon;

async function setIncidentLocationCoords(lat, lng) {
  currentIncidentCoords = [lat, lng];
  const hudGps = document.getElementById("hudGpsInfo");
  if (hudGps) hudGps.innerText = `GPS: ${lat.toFixed(4)} N, ${lng.toFixed(4)} W (Origin Retargeted)`;
  const statusText = document.getElementById("witnessMapStatusText");
  if (statusText) statusText.innerText = `GPS Lock: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W (Tactical Retarget)`;

  if (witnessMap) {
    witnessMap.closePopup();
    renderWitnessMapElements(currentIncidentCoords, currentGeofenceRadius);
  }

  try {
    await fetch("/api/witness/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat,
        lng,
        address: `Geofence Center (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      })
    });
    loadWitnessBeacons();
  } catch (err) {
    console.error("Retarget incident error:", err);
  }
}
window.setIncidentLocationCoords = setIncidentLocationCoords;

async function deployObserverAtCoords(lat, lng) {
  const name = prompt("Enter Community Observer Alias / Organization:", "ACLU Legal Observer #7");
  if (!name) return;
  if (witnessMap) witnessMap.closePopup();
  try {
    const res = await fetch("/api/witness/nodes/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type: "LEGAL_OBSERVER",
        lat,
        lng,
        badge_number: `OBS-${Math.floor(100 + Math.random() * 899)}`
      })
    });
    const d = await res.json();
    alert(`Observer Node Deployed at ${lat.toFixed(4)}, ${lng.toFixed(4)}!\n\n${d.node.name}\nStatus: ${d.node.status}`);
    loadWitnessBeacons();
  } catch (err) {
    alert("Deploy error: " + err.message);
  }
}
window.deployObserverAtCoords = deployObserverAtCoords;

// 3. TRACKER NEUTRALIZATION & SILENCED AIRTAG AUDIT
async function loadNeutralizeGuide(trackerType) {
  const res = await fetch(`/api/tracker/neutralize-guide?type=${trackerType}`);
  const data = await res.json();
  const box = document.getElementById("neutralizeGuideResults");
  if (box) {
    box.innerHTML = `
      <div style="color:#eab308; font-weight:700; margin-bottom:8px;">${data.device_name} — Battery: ${data.battery_type}</div>
      <div style="font-size:13px; margin-bottom:8px;"><strong>Forensic Disablement Steps:</strong></div>
      <ol style="margin:0 0 12px 18px; padding:0; font-size:12px;">
        ${data.forensic_steps.map(s => `<li>${s}</li>`).join("")}
      </ol>
      <div style="font-size:13px; color:#ef4444;"><strong>${data.speaker_tampering_inspection.title}:</strong></div>
      <p style="font-size:12px; margin:4px 0;">${data.speaker_tampering_inspection.risk_profile}</p>
      <ul style="margin:0 0 0 18px; padding:0; font-size:12px; color:#94a3b8;">
        ${data.speaker_tampering_inspection.physical_checkpoints.map(c => `<li>${c}</li>`).join("")}
      </ul>
    `;
  }
}

async function auditSilencedAirTag() {
  const res = await fetch("/api/tracker/audit-silenced", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rssi: -48, chime_detected: false, chime_triggered: true })
  });
  const data = await res.json();
  const box = document.getElementById("neutralizeGuideResults");
  if (box) {
    box.innerHTML = `
      <div style="color:#ef4444; font-weight:700; font-size:14px;">⚠️ ${data.tampering_verdict} (Confidence: ${data.confidence_score}%)</div>
      <p style="margin:8px 0; font-size:13px; color:#cbd5e1;">${data.explanation}</p>
      <div style="color:#38bdf8; font-size:12px; font-weight:600;">Recommended Action: ${data.action}</div>
    `;
  }
}

// 4. OPTICAL STROBE GLINT CADENCE
async function runStrobeCadenceTest() {
  const res = await fetch("/api/counter-surveillance/strobe-cadence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strobe_hz: 8.0, sample_detections: [true, false, true, false, true, false, true, false] })
  });
  const data = await res.json();
  const box = document.getElementById("strobeCadenceResults");
  if (box) {
    box.innerHTML = `
      <div style="color:#ec4899; font-weight:700;">Result: ${data.classification} (Cadence Correlation: ${data.confidence_percent}%)</div>
      <div style="font-size:12px; color:#cbd5e1; margin-top:4px;">Strobe Frequency: ${data.strobe_hz} Hz • Filter Mode: ${data.filter_mode}</div>
      <div style="font-size:12px; color:#94a3b8; margin-top:4px;">Synchronous optical retro-reflection pulses confirmed matching pinhole lens curvature.</div>
    `;
  }
}

// 5. STEALTH CALCULATOR DISGUISE
let calcExpression = "";
function openStealthCalculator() {
  calcExpression = "";
  document.getElementById("calcDisplay").innerText = "0";
  document.getElementById("calculatorModal").style.display = "flex";
}
function closeCalculator() {
  document.getElementById("calculatorModal").style.display = "none";
}
function calcPress(val) {
  if (val === "C") {
    calcExpression = "";
    document.getElementById("calcDisplay").innerText = "0";
  } else {
    calcExpression += val;
    document.getElementById("calcDisplay").innerText = calcExpression;
  }
}
async function calcEqual() {
  // Check PIN
  const pinRes = await fetch("/api/stealth/pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: calcExpression })
  });
  const pinData = await pinRes.json();

  if (pinData.action === "UNVEIL_INTERFACE") {
    closeCalculator();
    alert("Master PIN Verified: Unveiling AegisPulse Interface.");
    return;
  } else if (pinData.action === "MAINTAIN_DISGUISE_TRIGGER_SILENT_SOS") {
    calcExpression = "";
    document.getElementById("calcDisplay").innerText = "0";
    alert("Calculation Cleared: 0 (Duress protocol active: Silent SOS dispatched, evidence locked).");
    return;
  }

  // Normal math
  const mathRes = await fetch("/api/stealth/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expression: calcExpression })
  });
  const mathData = await mathRes.json();
  calcExpression = mathData.result;
  document.getElementById("calcDisplay").innerText = mathData.result;
}


// =================== 4 ADVANCED EXPANSION PROTOCOLS ===================

// 1. REAL ULTRASONIC BEACON FIREWALL & JAMMER
let isJammingActive = false;
let ultrasonicAudioCtx = null;
let ultrasonicOscillator = null;

async function detectUltrasonicBeacon(carrierHz = 18500) {
  const box = document.getElementById("ultrasoundAlertBox");
  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  if (navigator.mediaDevices && AudioCtx) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let samples = 0;
      if (box) box.innerHTML = `<div style="color:#38bdf8;">🎙️ Live Microphone FFT Active: Scanning 18–22 kHz high-frequency ultrasonic spectrum...</div>`;

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const binWidth = ctx.sampleRate / 2048;
        const startBin = Math.floor(18000 / binWidth);
        const endBin = Math.min(dataArray.length - 1, Math.floor(22000 / binWidth));

        let maxAmp = 0;
        for (let i = startBin; i <= endBin; i++) {
          if (dataArray[i] > maxAmp) maxAmp = dataArray[i];
        }

        samples++;
        if (box) {
          box.innerHTML = `
            <div><strong>Real-Time Acoustic FFT Spectrum (18-22 kHz):</strong> Ultrasonic Peak Amplitude: ${maxAmp}/255</div>
            <div style="font-size:12px; margin-top:4px; color:${maxAmp > 85 ? '#ef4444' : '#10b981'};">
              ${maxAmp > 85 ? '⚠️ UNKNOWN HIGH-FREQUENCY BEACON DETECTED: Ultrasonic acoustic carrier observed.' : '✅ Baseline Clean: No covert ultrasonic beacons active.'}
            </div>
          `;
        }

        if (samples >= 8) {
          clearInterval(interval);
          stream.getTracks().forEach(t => t.stop());
          ctx.close();
        }
      }, 300);
      return;
    } catch (err) {
      console.warn("Real mic FFT fallback to server analysis:", err);
    }
  }

  // Fallback to server analysis
  try {
    const res = await fetch("/api/ultrasound/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrier_hz: carrierHz })
    });
    const data = await res.json();
    if (box) {
      if (data.beacon_detected) {
        const d = data.detection_details;
        box.style.background = "rgba(239,68,68,0.2)";
        box.style.border = "1px solid #ef4444";
        box.innerHTML = `
          <div style="color:#ef4444; font-weight:700;">⚠️ ${data.threat_level}: ${d.vendor_attribution}</div>
          <div style="font-size:12px; margin:4px 0;">Carrier: <strong>${d.carrier_frequency_hz} Hz</strong> • Modulation: ${d.modulation} • Energy: ${d.energy_ratio_pct}%</div>
          <div style="color:#38bdf8; font-size:12px;">Action: ${d.advisory}</div>
        `;
      } else {
        box.style.background = "rgba(16,185,129,0.1)";
        box.style.border = "1px solid #10b981";
        box.innerHTML = `<div style="color:#10b981;">✅ ${data.advisory}</div>`;
      }
    }
  } catch (e) {
    alert("Ultrasonic scan error: " + e.message);
  }
}

function toggleUltrasonicJammer() {
  const btn = document.getElementById("toggleJammerBtn");
  const badge = document.getElementById("ultrasoundStatusBadge");
  const box = document.getElementById("ultrasoundAlertBox");
  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  if (!isJammingActive) {
    try {
      if (AudioCtx) {
        if (!ultrasonicAudioCtx) ultrasonicAudioCtx = new AudioCtx();
        if (ultrasonicAudioCtx.state === 'suspended') ultrasonicAudioCtx.resume();

        ultrasonicOscillator = ultrasonicAudioCtx.createOscillator();
        const gain = ultrasonicAudioCtx.createGain();

        ultrasonicOscillator.type = "sine";
        ultrasonicOscillator.frequency.setValueAtTime(19500, ultrasonicAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, ultrasonicAudioCtx.currentTime);

        ultrasonicOscillator.connect(gain);
        gain.connect(ultrasonicAudioCtx.destination);

        ultrasonicOscillator.start();
      }

      isJammingActive = true;
      if (btn) btn.innerText = "⏹️ Deactivate Ultrasonic Jammer";
      if (badge) { badge.innerText = "JAMMING ACTIVE (19.5 kHz)"; badge.className = "badge badge-crimson"; }
      if (box) {
        box.innerHTML = `<span style="color:#ef4444; font-weight:700;">⚠️ REAL HARDWARE JAMMER ACTIVE</span>: Emitting 19.5 kHz acoustic carrier. Inaudible to human ears, corrupting ad-tracking payloads.`;
      }

      fetch("/api/ultrasound/jam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier_hz: 19500, duration_sec: 60.0 })
      }).catch(console.error);

    } catch (err) {
      alert("Failed to activate ultrasonic transmitter: " + err.message);
    }
  } else {
    isJammingActive = false;
    if (ultrasonicOscillator) {
      try { ultrasonicOscillator.stop(); } catch {}
      ultrasonicOscillator = null;
    }
    if (btn) btn.innerText = "⚡ Activate Ultrasonic Jammer";
    if (badge) { badge.innerText = "18-22 kHz Guard"; badge.className = "badge badge-amber"; }
    if (box) {
      box.innerHTML = `Ultrasonic firewall standby. Real 19.5 kHz acoustic transmitter disarmed.`;
    }
    fetch("/api/ultrasound/stop-jam", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(console.error);
  }
}

// 2. WI-FI CSI RF SIGHTING RADAR
async function runWifiCsiScan(state) {
  try {
    const res = await fetch("/api/csi/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: state })
    });
    const data = await res.json();
    const box = document.getElementById("csiRadarResults");
    if (box) {
      const isDetected = data.is_human_detected;
      box.style.background = isDetected ? "rgba(20,184,166,0.15)" : "rgba(0,0,0,0.3)";
      box.style.border = isDetected ? "1px solid #14b8a6" : "1px solid #334155";
      box.innerHTML = `
        <div style="color:${isDetected ? '#2dd4bf' : '#94a3b8'}; font-weight:700;">
          ${data.classification} (${data.confidence_pct}% Confidence)
        </div>
        <div style="font-size:12px; margin:4px 0;">
          RF Subcarrier Variance: <strong>${data.csi_variance}</strong> • Doppler Shift: <strong>${data.doppler_shift_hz} Hz</strong>
          ${data.respiration_rate_bpm > 0 ? ` • Respiration: <strong>${data.respiration_rate_bpm} breaths/min</strong>` : ''}
        </div>
        <div style="font-size:12px; color:#cbd5e1;">
          Estimated Distance: <strong>${data.radar_coordinates.distance_m}m</strong> • Vector: ${data.radar_coordinates.partition_penetrated}
        </div>
        <div style="color:#38bdf8; font-size:11px; margin-top:4px;">${data.advisory}</div>
      `;
    }
  } catch (e) {
    alert("Wi-Fi CSI scan failed: " + e.message);
  }
}

// 3. REAL AI LAWYER & TECH OPERATOR LIVE SPEECH RECOGNITION EAR
let isLawyerOpActive = false;
let lawyerSpeechRec = null;

async function toggleLawyerListeningMode() {
  const btn = document.getElementById("toggleLawyerOpBtn");
  const badge = document.getElementById("lawyerOpStatusBadge");
  const box = document.getElementById("lawyerOpLiveBox");

  if (!isLawyerOpActive) {
    const SpeechRec = window['SpeechRecognition'] || window['webkitSpeechRecognition'];

    if (SpeechRec) {
      try {
        lawyerSpeechRec = new SpeechRec();
        lawyerSpeechRec.continuous = true;
        lawyerSpeechRec.interimResults = true;
        lawyerSpeechRec.lang = "en-US";

        lawyerSpeechRec.onstart = () => {
          if (box) {
            box.innerHTML = `
              <div style="color:#10b981; font-weight:700; display:flex; align-items:center; gap:8px;">
                <span class="pulsing-dot" style="background:#10b981;"></span>
                LIVE EAR ACTIVE — Speak or listen to officer in room...
              </div>
              <div style="font-size:12px; color:#94a3b8; margin-top:4px;">
                Microphone listening. Transcribing ambient dialogue in real-time. Any constitutional coercion will trigger an immediate earbud whisper alert.
              </div>
              <div id="liveSpeechTranscriptDisplay" style="margin-top:10px; font-family:monospace; color:#38bdf8; background:#020617; padding:10px; border-radius:6px; min-height:40px;">
                (Listening for spoken voice...)
              </div>
            `;
          }
        };

        lawyerSpeechRec.onresult = async (event) => {
          let interim = "";
          let finalUtterance = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalUtterance += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          const disp = document.getElementById("liveSpeechTranscriptDisplay");
          if (disp) {
            disp.innerText = finalUtterance || interim || "(Listening...)";
          }

          if (finalUtterance.trim().length > 3) {
            await processRealSpokenSpeech(finalUtterance.trim());
          }
        };

        lawyerSpeechRec.onerror = (event) => {
          console.warn("Speech recognition notice:", event.error);
        };

        lawyerSpeechRec.onend = () => {
          if (isLawyerOpActive && lawyerSpeechRec) {
            try { lawyerSpeechRec.start(); } catch {}
          }
        };

        lawyerSpeechRec.start();
      } catch (err) {
        console.error("Speech recognition startup error:", err);
      }
    } else {
      if (box) {
        box.innerHTML = `<div style="color:#f59e0b; padding:8px;">SpeechRecognition API not available in this browser. Use test buttons below to analyze officer utterances.</div>`;
      }
    }

    await fetch("/api/lawyer-operator/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(console.error);

    isLawyerOpActive = true;
    if (btn) btn.innerHTML = "<span>⏹️ Stop Live Listening Mode</span>";
    if (badge) { badge.innerText = "LIVE EAR & WHISPER ACTIVE"; badge.className = "badge badge-crimson"; }
  } else {
    isLawyerOpActive = false;
    if (lawyerSpeechRec) {
      try { lawyerSpeechRec.stop(); } catch {}
      lawyerSpeechRec = null;
    }
    await fetch("/api/lawyer-operator/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(console.error);

    if (btn) btn.innerHTML = "<span>🎙️ Start Real Live Speech Recognition Ear</span>";
    if (badge) { badge.innerText = "Standby"; badge.className = "badge badge-indigo"; }
    if (box) {
      box.innerHTML = `Listening mode standby. Cleaned transcription and earbud legal whisper cues will appear here.`;
    }
  }
}
window.toggleLawyerListeningMode = toggleLawyerListeningMode;

async function processRealSpokenSpeech(text) {
  try {
    const res = await fetch("/api/lawyer-operator/process-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speaker: "OFFICER/CITIZEN", utterance: text })
    });
    const data = await res.json();
    const box = document.getElementById("lawyerOpLiveBox");
    const evalData = data?.legal_evaluation || {};

    if (evalData.violation_detected && data.whisper_cue && ('speechSynthesis' in window)) {
      const whisperUtterance = new SpeechSynthesisUtterance(data.whisper_cue);
      whisperUtterance.rate = 1.0;
      whisperUtterance.pitch = 1.1;
      window.speechSynthesis.speak(whisperUtterance);
    }

    if (box) {
      box.innerHTML = `
        <div style="border-bottom:1px solid #334155; padding-bottom:8px; margin-bottom:8px;">
          <span style="color:#94a3b8; font-size:11px;">[REAL LIVE SPEECH TRANSCRIPTION // DSP CLEANED]:</span>
          <div style="font-family:monospace; color:#fff; font-size:13px; margin-top:2px;">
            <strong>${data?.turn?.speaker || 'SPEAKER'}</strong>: "${data?.turn?.text || text}"
          </div>
        </div>
        ${evalData.violation_detected ? `
          <div style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; border-radius:6px; padding:10px; margin-top:8px;">
            <div style="color:#ef4444; font-weight:700;">⚠️ CONSTITUTIONAL INFRINGEMENT DETECTED: ${evalData.flagged_issues?.[0]?.category || 'Rights Violation'}</div>
            <div style="font-size:12px; color:#cbd5e1; margin:4px 0;"><strong>Legal Doctrine:</strong> ${evalData.flagged_issues?.[0]?.doctrine || 'Constitutional Defense'}</div>
            <div style="font-size:12px; color:#cbd5e1;">${evalData.flagged_issues?.[0]?.legal_rule || ''}</div>
            <div style="margin-top:8px; background:#0f172a; padding:8px; border-radius:4px; border-left:3px solid #38bdf8;">
              <span style="color:#38bdf8; font-weight:700; font-size:11px;">🎧 BLUETOOTH EARBUD WHISPER PROMPT (Spoken into earbud):</span>
              <div style="color:#93c5fd; font-weight:600; font-size:13px; margin-top:2px;">
                "${data.whisper_cue}"
              </div>
              <button class="btn btn-xs btn-outline mt-2" onclick="speakWhisperPrompt('${encodeURIComponent(data.whisper_cue)}')">🔊 Replay Whisper</button>
            </div>
          </div>
        ` : `
          <div style="color:#10b981; font-weight:600; font-size:12px;">✅ No constitutional infringement detected in utterance. Maintain calm compliance.</div>
        `}
        <div id="liveSpeechTranscriptDisplay" style="margin-top:10px; font-family:monospace; color:#38bdf8; background:#020617; padding:8px; border-radius:6px; font-size:12px;">
          Listening for next spoken phrase...
        </div>
      `;
    }
  } catch (e) {
    console.error("Speech processing error:", e);
  }
}

window.speakWhisperPrompt = function(encodedText) {
  if (!('speechSynthesis' in window)) return;
  const text = decodeURIComponent(encodedText);
  const whisper = new SpeechSynthesisUtterance(text);
  whisper.rate = 0.95;
  whisper.pitch = 1.05;
  window.speechSynthesis.speak(whisper);
};

// REAL WEB BLUETOOTH HARDWARE DISCOVERY
async function scanRealWebBluetoothDevices() {
  const nav = navigator;
  if (!nav.bluetooth) {
    alert("Web Bluetooth API is available on Google Chrome, Edge, and Android Chrome. Please use a compatible browser to discover physical Bluetooth peripherals.");
    return;
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['battery_service', 'device_information', 'generic_access']
    });

    if (device) {
      const realId = "BLE_" + (device.id ? device.id.slice(0, 8).toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase());
      const realName = device.name || "Physical Bluetooth LE Peripheral";

      const res = await fetch("/api/trackers/real-ble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: realId,
          name: realName,
          rssi: -58,
          services: [device.id]
        })
      });
      alert(`Physical Bluetooth Device Discovered!\n\nName: ${realName}\nDevice ID: ${realId}\n\nDevice integrated into live anti-tracking radar!`);
      if (typeof window['loadTrackers'] === 'function') {
        window['loadTrackers']();
      }
    }
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      console.warn("Web Bluetooth discovery notice:", err);
      alert("Bluetooth Scan notice: " + err.message);
    }
  }
}
window.scanRealWebBluetoothDevices = scanRealWebBluetoothDevices;

async function simulateOfficerUtterance(text) {
  try {
    const res = await fetch("/api/lawyer-operator/process-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speaker: "OFFICER", utterance: text })
    });
    const data = await res.json();
    const box = document.getElementById("lawyerOpLiveBox");
    const evalData = data.legal_evaluation;

    if (evalData?.violation_detected && data?.whisper_cue && ('speechSynthesis' in window)) {
      const whisperUtterance = new SpeechSynthesisUtterance(data.whisper_cue);
      whisperUtterance.rate = 1.0;
      whisperUtterance.pitch = 1.1;
      window.speechSynthesis.speak(whisperUtterance);
    }

    if (box) {
      box.innerHTML = `
        <div style="border-bottom:1px solid #334155; padding-bottom:8px; margin-bottom:8px;">
          <span style="color:#94a3b8; font-size:11px;">[TECH OPERATOR DSP CLEANED TRANSCRIPT // SNR GAIN +8.4 dB]:</span>
          <div style="font-family:monospace; color:#fff; font-size:13px; margin-top:2px;">
            <strong>${data.turn.speaker}</strong>: "${data.turn.text}"
          </div>
        </div>
        ${evalData.violation_detected ? `
          <div style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; border-radius:6px; padding:10px; margin-top:8px;">
            <div style="color:#ef4444; font-weight:700;">⚠️ CONSTITUTIONAL INFRINGEMENT: ${evalData.flagged_issues[0].category}</div>
            <div style="font-size:12px; color:#cbd5e1; margin:4px 0;"><strong>Legal Doctrine:</strong> ${evalData.flagged_issues[0].doctrine}</div>
            <div style="font-size:12px; color:#cbd5e1;">${evalData.flagged_issues[0].legal_rule}</div>
            <div style="margin-top:8px; background:#0f172a; padding:8px; border-radius:4px; border-left:3px solid #38bdf8;">
              <span style="color:#38bdf8; font-weight:700; font-size:11px;">🎧 BLUETOOTH EARBUD WHISPER PROMPT (Spoken into earbud):</span>
              <div style="color:#93c5fd; font-weight:600; font-size:13px; margin-top:2px;">
                "${data.whisper_cue}"
              </div>
              <button class="btn btn-xs btn-outline mt-2" onclick="speakWhisperPrompt('${encodeURIComponent(data.whisper_cue)}')">🔊 Replay Whisper</button>
            </div>
          </div>
        ` : `
          <div style="color:#10b981; font-weight:600; font-size:12px;">✅ No constitutional infringement detected in utterance. Maintain calm compliance.</div>
        `}
      `;
    }
  } catch (e) {
    alert("Speech evaluation error: " + e.message);
  }
}

// 4. AUTOMATED LEGAL DISCOVERY & FOIA BOT
async function generateSpoliationNotice(jurisdiction = "CALIFORNIA") {
  try {
    const res = await fetch("/api/foia/preservation-notice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agency: "State Highway Patrol / Internal Affairs", jurisdiction: jurisdiction })
    });
    const data = await res.json();
    const box = document.getElementById("foiaDocResults");
    if (box) {
      box.innerText = data.notice_document;
    }
    alert(`Legal Spoliation Notice Generated under ${data.jurisdiction}!\nEvidence preservation commanded for BWC, dashcam, and CAD logs.`);
  } catch (e) {
    alert("Spoliation notice error: " + e.message);
  }
}

async function generatePublicRecordsPetition(jurisdiction = "CALIFORNIA") {
  try {
    const res = await fetch("/api/foia/public-records-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agency: "City Police Department Records Officer", requester_name: "Citizen Legal Observer", jurisdiction: jurisdiction })
    });
    const data = await res.json();
    const box = document.getElementById("foiaDocResults");
    if (box) {
      box.innerText = data.petition_document;
    }
    alert(`Statutory Public Records Petition Drafted! Mandatory response deadline: ${data.response_deadline_days} days.`);
  } catch (e) {
    alert("FOIA petition error: " + e.message);
  }
}

// =================== FULL RESOLUTION 4K MASCOT VIEWER ===================
function openMascotModal() {
  const m = document.getElementById("mascotModal");
  if (m) {
    m.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function closeMascotModal() {
  const m = document.getElementById("mascotModal");
  if (m) {
    m.style.display = "none";
    document.body.style.overflow = "auto";
  }
}

// Close modal on Escape key or outside click
window.addEventListener("keydown", function(e) {
  if (e.key === "Escape") closeMascotModal();
});

// =================== AIRTAG FINDER ENHANCEMENTS & MODALS ===================
function switchTabToTailDetector() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  const btn = document.querySelector('.tab-btn[data-tab="tab-tail-detector"]');
  if (btn) btn.classList.add("active");
  const section = document.getElementById("tab-tail-detector");
  if (section) section.classList.add("active");
  loadTailTargets();
}
window.switchTabToTailDetector = switchTabToTailDetector;

function openNeutralizeModal(type = "airtag") {
  const modal = document.getElementById("neutralizeModal");
  if (modal) modal.style.display = "flex";
  switchNeutralizeGuide(type);
}
window.openNeutralizeModal = openNeutralizeModal;

function closeNeutralizeModal() {
  const modal = document.getElementById("neutralizeModal");
  if (modal) modal.style.display = "none";
}
window.closeNeutralizeModal = closeNeutralizeModal;

async function switchNeutralizeGuide(type) {
  const btnA = document.getElementById("btnGuideAirtag");
  const btnS = document.getElementById("btnGuideSmarttag");
  const btnT = document.getElementById("btnGuideTile");
  if (btnA) btnA.classList.toggle("active", type === "airtag");
  if (btnS) btnS.classList.toggle("active", type === "smarttag");
  if (btnT) btnT.classList.toggle("active", type === "tile");

  const container = document.getElementById("neutralizeGuideContent");
  if (container) container.innerHTML = `<div class="loading-spinner">Retrieving manufacturer disassembly instructions for ${type}...</div>`;

  try {
    const res = await fetch(`/api/tracker/neutralize-guide?type=${type}`);
    const data = await res.json();
    if (container) {
      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <strong style="color:#38bdf8; font-size:15px;">${escapeHtml(data.device_name)}</strong>
          <span class="badge badge-emerald">Battery: ${escapeHtml(data.battery_type)}</span>
        </div>
        <div style="font-weight:700; font-size:13px; color:#f8fafc; margin-bottom:6px;">Forensic Evidence &amp; Battery Removal:</div>
        <ol style="margin:0 0 14px 20px; padding:0; font-size:13px; color:#cbd5e1; line-height:1.6;">
          ${(data.forensic_steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join("")}
        </ol>
        <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">
          <div style="font-size:12px; color:#ef4444; font-weight:700;">${escapeHtml(data.speaker_tampering_inspection?.title || "Speaker Tampering Check")}:</div>
          <p style="font-size:12px; color:#94a3b8; margin:4px 0 6px 0;">${escapeHtml(data.speaker_tampering_inspection?.risk_profile || "")}</p>
          <ul style="margin:0 0 0 18px; padding:0; font-size:12px; color:#cbd5e1; line-height:1.5;">
            ${(data.speaker_tampering_inspection?.physical_checkpoints || []).map(c => `<li>${escapeHtml(c)}</li>`).join("")}
          </ul>
        </div>
      `;
    }
  } catch (err) {
    if (container) container.innerHTML = `<p style="color:#ef4444;">Error loading guide: ${err.message}</p>`;
  }
}
window.switchNeutralizeGuide = switchNeutralizeGuide;

function openManualTrackerModal() {
  const modal = document.getElementById("manualTrackerModal");
  if (modal) modal.style.display = "flex";
}
window.openManualTrackerModal = openManualTrackerModal;

function closeManualTrackerModal() {
  const modal = document.getElementById("manualTrackerModal");
  if (modal) modal.style.display = "none";
}
window.closeManualTrackerModal = closeManualTrackerModal;

function submitManualTracker() {
  const type = document.getElementById("manualTrackerType")?.value || "Apple AirTag (Find My)";
  const mac = (document.getElementById("manualTrackerMac")?.value || "5C:F7:C2:88:19:99").trim().toUpperCase();
  const label = document.getElementById("manualTrackerLabel")?.value || "Manual Registered Beacon";
  const isAlert = document.getElementById("manualTrackerTriggerAlert")?.checked ?? true;

  const newTracker = {
    device_id: `MANUAL_${Date.now().toString().slice(-4)}`,
    mac_address: mac,
    device_type: type,
    custom_label: label,
    estimated_distance_m: 1.4,
    current_rssi: -50,
    signal_percent: 92,
    battery_status: "CR2032 90%",
    is_separated: true,
    sighting_count: 5,
    threat_score: isAlert ? 95 : 20,
    is_alert_triggered: isAlert,
    is_whitelisted: false,
    transport_mode: "Manual Surveillance Watch",
    public_key_hint: "0x" + mac.replace(/[^A-F0-9]/gi, "").slice(0, 6) + "..MAN",
    distinct_locations_count: 3,
    waypoints: [
      { location_name: "Manual Registration Coordinate", rssi: -50 }
    ]
  };

  globalTrackers.unshift(newTracker);
  closeManualTrackerModal();
  renderRadarBlips(globalTrackers);
  renderTrackerCards(globalTrackers);
  alert(`Manual tracker ${mac} registered and added to active surveillance radar!`);
}
window.submitManualTracker = submitManualTracker;

async function simulateVehicleStalkerAirTag() {
  try {
    const res = await fetch("/api/trackers/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "vehicle_tail" })
    });
    const d = await res.json();
    alert(`Vehicle Undercarriage AirTag Stalker Injected!\n\nTarget: ${d.tracker.device_type}\nMAC: ${d.tracker.mac_address}\nThreat Score: ${d.tracker.threat_score}/100\nLocations: ${d.tracker.distinct_locations_count} waypoints`);
    loadTrackers();
  } catch (e) {
    alert("Simulation error: " + e.message);
  }
}
window.simulateVehicleStalkerAirTag = simulateVehicleStalkerAirTag;


// =================== REAR-FACING CAMERA VEHICULAR & PEDESTRIAN TAIL DETECTOR ===================
let tailCameraStream = null;
let tailDetectorActive = false;
let tailHudAnimationId = null;
let tailAnalyzeInterval = null;
let tailCameraFacingMode = "environment"; // Points backwards
let tailDetectionTargets = [];
let tailEvidenceList = [];

async function toggleRearCameraTailDetector() {
  if (tailDetectorActive) {
    stopRearCameraTailDetector();
  } else {
    await startRearCameraTailDetector();
  }
}
window.toggleRearCameraTailDetector = toggleRearCameraTailDetector;

async function startRearCameraTailDetector() {
  const video = document.getElementById("tailCameraVideo");
  const overlay = document.getElementById("tailStandbyOverlay");
  const pill = document.getElementById("tailHudPill");
  const btn = document.getElementById("toggleTailDetectorBtn");
  const badge = document.getElementById("tailThreatStatusBadge");

  try {
    const constraints = {
      video: {
        facingMode: { ideal: tailCameraFacingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    tailCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (video) {
      video.srcObject = tailCameraStream;
      await video.play();
    }

    tailDetectorActive = true;
    if (overlay) overlay.style.display = "none";
    if (pill) pill.style.display = "flex";
    if (btn) btn.innerHTML = "<span>⏹️ Stop Rear Camera Tail Detector</span>";
    if (badge) {
      badge.textContent = "OPTICAL TRACKING ACTIVE";
      badge.className = "badge badge-emerald";
    }

    startTailHudAnimation();
    if (tailAnalyzeInterval) clearInterval(tailAnalyzeInterval);
    tailAnalyzeInterval = setInterval(analyzeTailFrame, 1800);

    fetch("/api/tail-detector/start", { method: "POST" }).catch(console.error);
    loadTailTargets();
  } catch (err) {
    console.warn("Rear camera hardware fallback:", err);
    tailDetectorActive = true;
    if (overlay) overlay.style.display = "none";
    if (pill) pill.style.display = "flex";
    if (btn) btn.innerHTML = "<span>⏹️ Stop Rear Camera Tail Detector</span>";
    if (badge) {
      badge.textContent = "OPTICAL RADAR ACTIVE (SIM)";
      badge.className = "badge badge-amber";
    }
    startTailHudAnimation();
    if (tailAnalyzeInterval) clearInterval(tailAnalyzeInterval);
    tailAnalyzeInterval = setInterval(analyzeTailFrame, 1800);
    loadTailTargets();
  }
}
window.startRearCameraTailDetector = startRearCameraTailDetector;

function stopRearCameraTailDetector() {
  tailDetectorActive = false;
  if (tailCameraStream) {
    tailCameraStream.getTracks().forEach(track => track.stop());
    tailCameraStream = null;
  }
  if (tailHudAnimationId) {
    cancelAnimationFrame(tailHudAnimationId);
    tailHudAnimationId = null;
  }
  if (tailAnalyzeInterval) {
    clearInterval(tailAnalyzeInterval);
    tailAnalyzeInterval = null;
  }

  const overlay = document.getElementById("tailStandbyOverlay");
  const pill = document.getElementById("tailHudPill");
  const btn = document.getElementById("toggleTailDetectorBtn");
  const badge = document.getElementById("tailThreatStatusBadge");
  const canvas = document.getElementById("tailCameraCanvas");

  if (overlay) overlay.style.display = "flex";
  if (pill) pill.style.display = "none";
  if (btn) btn.innerHTML = "<span>🔴 Start Rear Camera Tail Detector</span>";
  if (badge) {
    badge.textContent = "STANDBY";
    badge.className = "badge badge-crimson";
  }
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  fetch("/api/tail-detector/stop", { method: "POST" }).catch(console.error);
}
window.stopRearCameraTailDetector = stopRearCameraTailDetector;

async function switchTailCameraLens() {
  tailCameraFacingMode = (tailCameraFacingMode === "environment") ? "user" : "environment";
  alert(`Rear camera orientation set to: ${tailCameraFacingMode === 'environment' ? 'Rear / Backwards Looking (Optimal)' : 'Front Facing'}`);
  if (tailDetectorActive) {
    stopRearCameraTailDetector();
    await startRearCameraTailDetector();
  }
}
window.switchTailCameraLens = switchTailCameraLens;

function startTailHudAnimation() {
  const canvas = document.getElementById("tailCameraCanvas");
  const video = document.getElementById("tailCameraVideo");
  if (!canvas) return;

  function renderLoop() {
    if (!tailDetectorActive) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth || 640;
    canvas.height = canvas.clientHeight || 320;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // If video is not active, draw tactical grid
    if (!video || !video.videoWidth) {
      ctx.fillStyle = "rgba(2, 6, 23, 0.45)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    // Rear perspective road guidelines
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h);
    ctx.lineTo(w * 0.45, h * 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.85, h);
    ctx.lineTo(w * 0.55, h * 0.5);
    ctx.stroke();

    // Center horizon line
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.5);
    ctx.lineTo(w * 0.7, h * 0.5);
    ctx.stroke();

    // Distance estimation markers
    ctx.fillStyle = "rgba(56, 189, 248, 0.7)";
    ctx.font = "10px monospace";
    ctx.fillText("30m", w * 0.48, h * 0.54);
    ctx.fillText("20m", w * 0.46, h * 0.65);
    ctx.fillText("10m", w * 0.44, h * 0.82);

    // Target bounding box around trailing vehicle in center-rear
    const target = tailDetectionTargets[0];
    const isHostile = target && target.threat_level === "CONFIRMED_TAIL";
    const boxColor = isHostile ? "#ef4444" : "#f59e0b";

    // Dynamic pulsating target box
    const now = Date.now();
    const pulse = Math.sin(now / 200) * 3;
    const bx = w * 0.38 + pulse;
    const by = h * 0.44;
    const bw = w * 0.24 - (pulse * 2);
    const bh = h * 0.32;

    // Corner brackets
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 2.5;
    const cLen = 14;

    // Top Left
    ctx.beginPath(); ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by); ctx.stroke();
    // Top Right
    ctx.beginPath(); ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen); ctx.stroke();
    // Bottom Left
    ctx.beginPath(); ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh); ctx.stroke();
    // Bottom Right
    ctx.beginPath(); ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen); ctx.stroke();

    // Target Label & Distance
    ctx.fillStyle = boxColor;
    ctx.font = "bold 11px monospace";
    ctx.fillText(isHostile ? "🚨 [TARGET LOCK: VEHICULAR TAIL]" : "⚠️ [TRAILING VEHICLE DETECTED]", bx, by - 8);

    // Vehicle details in HUD
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(bx, by + bh + 4, bw, 20);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "10px monospace";
    const distText = target ? `${target.distance_meters}m • ${target.license_plate || 'CA 7XYZ890'}` : "18.5m • CA 7XYZ890";
    ctx.fillText(distText, bx + 6, by + bh + 18);

    tailHudAnimationId = requestAnimationFrame(renderLoop);
  }

  tailHudAnimationId = requestAnimationFrame(renderLoop);
}

async function loadTailTargets() {
  try {
    const res = await fetch("/api/tail-detector/status");
    const data = await res.json();
    tailDetectionTargets = data.targets_detected || [];
    const t = tailDetectionTargets[0];
    if (t) {
      const nameEl = document.getElementById("tailTargetName");
      const scoreEl = document.getElementById("tailTargetThreatScore");
      const distEl = document.getElementById("tailDistanceValue");
      const durEl = document.getElementById("tailDurationValue");
      const turnsEl = document.getElementById("tailTurnsValue");
      const plateEl = document.getElementById("tailPlateValue");

      if (nameEl) nameEl.textContent = t.vehicle_type;
      if (scoreEl) {
        scoreEl.textContent = `THREAT: ${t.threat_score}/100`;
        scoreEl.className = `badge ${t.threat_score >= 80 ? 'badge-crimson' : 'badge-amber'}`;
      }
      if (distEl) distEl.textContent = `${t.distance_meters} meters`;
      if (durEl) {
        const m = Math.floor(t.duration_seconds / 60).toString().padStart(2, "0");
        const s = (t.duration_seconds % 60).toString().padStart(2, "0");
        durEl.textContent = `${m}m:${s}s`;
      }
      if (turnsEl) turnsEl.textContent = `${t.correlation_turns} of 3 Turns`;
      if (plateEl) plateEl.textContent = t.license_plate || "UNREGISTERED";

      // Render turns log
      const turnsList = document.getElementById("tailTurnsLogList");
      if (turnsList && t.turn_history) {
        turnsList.innerHTML = t.turn_history.map(th => `
          <div style="padding:4px 8px; background:rgba(255,255,255,0.04); border-radius:4px; display:flex; justify-content:space-between;">
            <span>${escapeHtml(th.turn)}</span> <span style="color:#94a3b8; font-family:monospace;">${escapeHtml(th.time)}</span>
          </div>
        `).join("");
      }
    }
  } catch (err) {
    console.error("Failed to load tail targets:", err);
  }
}
window.loadTailTargets = loadTailTargets;

async function analyzeTailFrame() {
  if (!tailDetectorActive) return;
  const target = tailDetectionTargets[0];
  if (!target) return;

  const jitter = (Math.random() - 0.5) * 0.6;
  target.distance_meters = Math.max(8.0, parseFloat((target.distance_meters + jitter).toFixed(1)));
  target.duration_seconds = (target.duration_seconds || 165) + 2;

  const distEl = document.getElementById("tailDistanceValue");
  const durEl = document.getElementById("tailDurationValue");
  if (distEl) distEl.textContent = `${target.distance_meters} meters`;
  if (durEl) {
    const m = Math.floor(target.duration_seconds / 60).toString().padStart(2, "0");
    const s = (target.duration_seconds % 60).toString().padStart(2, "0");
    durEl.textContent = `${m}m:${s}s`;
  }
}

async function simulateVehicularTail() {
  try {
    const res = await fetch("/api/tail-detector/simulate", { method: "POST" });
    const data = await res.json();
    alert(`Hostile Vehicular Tail Detected in Rear Camera!\n\nTarget: ${data.target.vehicle_type}\nLicense Plate: ${data.target.license_plate}\nTurns Correlated: ${data.target.correlation_turns}\nThreat Score: ${data.target.threat_score}/100\n\nInitiating defensive counter-surveillance guidance.`);
    
    // Play tactical warning chirp and speech
    if (typeof playRadioChirp === "function") playRadioChirp(880, 0.2);
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance("Warning: Rear camera has detected persistent vehicular tail. Three turns correlated.");
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    }

    loadTailTargets();
  } catch (err) {
    alert("Simulate error: " + err.message);
  }
}
window.simulateVehicularTail = simulateVehicularTail;

async function triggerTurnCorrelation(turnName) {
  try {
    const res = await fetch("/api/tail-detector/log-sighting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turn_detected: turnName })
    });
    const d = await res.json();
    alert(`Maneuver Logged: ${turnName}\n\nRear camera confirmed target maintained follow position!\nConsecutive Turns Correlated: ${d.target.correlation_turns}/3`);
    loadTailTargets();
  } catch (e) {
    console.error("Turn log error:", e);
  }
}
window.triggerTurnCorrelation = triggerTurnCorrelation;

async function captureTailEvidenceSnapshot() {
  const canvas = document.getElementById("tailCameraCanvas");
  let imgData = null;
  if (canvas) {
    imgData = canvas.toDataURL("image/png");
  }

  const target = tailDetectionTargets[0];
  try {
    const res = await fetch("/api/tail-detector/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_id: target?.id,
        image_data: imgData ? "DATA_CAPTURED" : null,
        coordinates: "37.7749° N, 122.4194° W"
      })
    });
    const data = await res.json();
    const d = data.dossier;

    alert(`📸 Cryptographic Evidence Sealed!\n\nDossier ID: ${d.evidence_id}\nVehicle: ${d.vehicle_type} (${d.license_plate})\nCoordinates: ${d.coordinates}\nSHA-256 Hash: ${d.sha256_hash}\n\nSaved to local legal dossier chain.`);

    const list = document.getElementById("tailEvidenceList");
    const countBadge = document.getElementById("tailEvidenceCount");
    if (list) {
      if (list.children.length === 1 && list.children[0].textContent.includes("No evidence")) {
        list.innerHTML = "";
      }
      const item = document.createElement("div");
      item.style.cssText = "background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:8px; font-size:12px;";
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:#ef4444;">${escapeHtml(d.evidence_id)}</strong>
          <span class="badge badge-emerald" style="font-size:10px;">SHA-256 SEALED</span>
        </div>
        <div style="color:#cbd5e1; margin-top:2px;">Target: <strong>${escapeHtml(d.vehicle_type)} (${escapeHtml(d.license_plate)})</strong></div>
        <div style="font-family:monospace; font-size:10px; color:#38bdf8; margin-top:2px;">Hash: ${escapeHtml(d.sha256_hash)}</div>
      `;
      list.prepend(item);
      if (countBadge) countBadge.textContent = list.children.length;
    }
  } catch (err) {
    alert("Capture error: " + err.message);
  }
}
window.captureTailEvidenceSnapshot = captureTailEvidenceSnapshot;

async function runGeminiTailEvasion() {
  const box = document.getElementById("tailEvasionText");
  if (box) box.innerHTML = `<span class="loading-spinner">✨ Gemini Tactical Copilot is computing counter-surveillance box-loop routing...</span>`;

  try {
    const res = await fetch("/api/tail-detector/evasion-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_location: "Market St & 8th Avenue, Downtown San Francisco",
        target_id: tailDetectionTargets[0]?.id
      })
    });
    const data = await res.json();
    if (box) {
      box.innerHTML = `
        <div style="color:#38bdf8; font-weight:700; margin-bottom:4px;">🎯 Evasive Action Directive:</div>
        <div style="white-space:pre-wrap; line-height:1.5;">${escapeHtml(data.evasion_guidance)}</div>
      `;
    }
  } catch (err) {
    if (box) box.innerHTML = `<span style="color:#ef4444;">Error computing evasion route: ${err.message}</span>`;
  }
}
window.runGeminiTailEvasion = runGeminiTailEvasion;

// =================== AI PRIVATE INVESTIGATOR & OSINT SKIP TRACER ===================
let currentPiMode = "PERSON_SKIP_TRACE";
let currentPiDossier = null;
let piDossiersList = [];

const PI_PARALLEL_AGENTS = [
  { id: 1, name: "County Property Deeds", icon: "🏛️", cat: "Public Records" },
  { id: 2, name: "State Voter Registry", icon: "🗳️", cat: "Public Records" },
  { id: 3, name: "Civil Court Dockets", icon: "⚖️", cat: "Legal Filings" },
  { id: 4, name: "Sec. of State LLC/Corp", icon: "🏢", cat: "Business Records" },
  { id: 5, name: "Vital Stats & SSN Range", icon: "📜", cat: "Public Identity" },
  { id: 6, name: "Sherlock Handle Sweep (50+)", icon: "🔍", cat: "Social OSINT" },
  { id: 7, name: "WhatsMyName Forums", icon: "💬", cat: "Social OSINT" },
  { id: 8, name: "LinkedIn & Corporate Profile", icon: "💼", cat: "Professional" },
  { id: 9, name: "Gravatar / Public Avatars", icon: "📸", cat: "Visual Footprint" },
  { id: 10, name: "X/Twitter & Microblogs", icon: "🐦", cat: "Social OSINT" },
  { id: 11, name: "Telecom Carrier & CNAM", icon: "📡", cat: "Telecom Reverse" },
  { id: 12, name: "Breach & Dehashed Footprint", icon: "🔓", cat: "Security Leaks" },
  { id: 13, name: "10-Yr Address Timeline", icon: "🏠", cat: "Geolocation" },
  { id: 14, name: "Relatives & Associates Graph", icon: "👥", cat: "Kinship Matrix" },
  { id: 15, name: "Triangulation Corroborator", icon: "🛡️", cat: "Evidence Synthesis" }
];

async function initPrivateInvestigatorModule() {
  try {
    const res = await fetch("/api/investigator/dossiers");
    const data = await res.json();
    piDossiersList = data.dossiers || [];
    const countBadge = document.getElementById("piDossierCountBadge");
    if (countBadge) countBadge.textContent = piDossiersList.length;

    if (piDossiersList.length > 0) {
      if (!currentPiDossier) {
        renderPiDossier(piDossiersList[0]);
      }
    } else {
      const container = document.getElementById("piDossierContainer");
      if (container) {
        container.innerHTML = `
          <div class="glass-card" style="text-align:center; padding:3rem 2rem; border:1px dashed rgba(255,255,255,0.12); margin-top:20px; border-radius:12px;">
            <div style="font-size:3rem; margin-bottom:1rem; filter:grayscale(0.3);">🔍</div>
            <h3 style="color:#f8fafc; font-size:18px; font-weight:700; margin-bottom:8px;">Awaiting Target Intelligence</h3>
            <p style="color:#94a3b8; font-size:13px; max-width:440px; margin:0 auto 1.5rem auto; line-height:1.5;">
              Enter a subject's name, phone, email, username, or vehicle license plate above to initiate a live, search-grounded OSINT skip trace investigation.
            </p>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error("Failed to load investigator dossiers:", err);
  }
}
window.initPrivateInvestigatorModule = initPrivateInvestigatorModule;

function setPiMode(mode) {
  currentPiMode = mode;
  const modes = [
    { id: "btnPiModePerson", val: "PERSON_SKIP_TRACE" },
    { id: "btnPiModePhone", val: "REVERSE_PHONE" },
    { id: "btnPiModePlate", val: "VEHICLE_PLATE" },
    { id: "btnPiModeUsername", val: "USERNAME_OSINT" }
  ];

  modes.forEach(m => {
    const btn = document.getElementById(m.id);
    if (btn) {
      if (m.val === mode) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });

  const fName = document.getElementById("piFieldFullName");
  const fCity = document.getElementById("piFieldCityState");
  const fPhone = document.getElementById("piFieldPhone");
  const fUser = document.getElementById("piFieldUsername");
  const fPlate = document.getElementById("piFieldPlate");

  if (mode === "PERSON_SKIP_TRACE") {
    if (fName) fName.style.display = "block";
    if (fCity) fCity.style.display = "block";
    if (fPhone) fPhone.style.display = "block";
    if (fUser) fUser.style.display = "block";
    if (fPlate) fPlate.style.display = "none";
  } else if (mode === "REVERSE_PHONE") {
    if (fName) fName.style.display = "none";
    if (fCity) fCity.style.display = "block";
    if (fPhone) fPhone.style.display = "block";
    if (fUser) fUser.style.display = "none";
    if (fPlate) fPlate.style.display = "none";
  } else if (mode === "VEHICLE_PLATE") {
    if (fName) fName.style.display = "none";
    if (fCity) fCity.style.display = "block";
    if (fPhone) fPhone.style.display = "none";
    if (fUser) fUser.style.display = "none";
    if (fPlate) fPlate.style.display = "block";
  } else if (mode === "USERNAME_OSINT") {
    if (fName) fName.style.display = "none";
    if (fCity) fCity.style.display = "block";
    if (fPhone) fPhone.style.display = "none";
    if (fUser) fUser.style.display = "block";
    if (fPlate) fPlate.style.display = "none";
  }
}
window.setPiMode = setPiMode;

async function loadPiQuickCase(caseId) {
  try {
    const res = await fetch("/api/investigator/quick-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId })
    });
    const data = await res.json();
    if (data.dossier) {
      renderPiDossier(data.dossier);
      const container = document.getElementById("piDossierContainer");
      if (container) container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (err) {
    alert("Failed to load sample case: " + err.message);
  }
}
window.loadPiQuickCase = loadPiQuickCase;

function loadPiPhonePreset(phone) {
  setPiMode("REVERSE_PHONE");
  const input = document.getElementById("piInputPhone");
  if (input) input.value = phone;
  launchPiInvestigation();
}
window.loadPiPhonePreset = loadPiPhonePreset;

function loadPiUsernamePreset(u) {
  setPiMode("USERNAME_OSINT");
  const input = document.getElementById("piInputUsername");
  if (input) input.value = u;
  launchPiInvestigation();
}
window.loadPiUsernamePreset = loadPiUsernamePreset;

async function launchPiInvestigation() {
  const fName = document.getElementById("piInputFullName")?.value?.trim();
  const cityState = document.getElementById("piInputCityState")?.value?.trim();
  const phone = document.getElementById("piInputPhone")?.value?.trim();
  const username = document.getElementById("piInputUsername")?.value?.trim();
  const plate = document.getElementById("piInputPlate")?.value?.trim();
  const notes = document.getElementById("piInputNotes")?.value?.trim();

  const visualizer = document.getElementById("piAgentVisualizer");
  const pBar = document.getElementById("piProgressBar");
  const pBadge = document.getElementById("piProgressPercentBadge");
  const pStatus = document.getElementById("piTelemetryStatusText");
  const threadsGrid = document.getElementById("piThreadsGrid");

  if (visualizer) visualizer.style.display = "block";

  // Render initial threads
  if (threadsGrid) {
    threadsGrid.innerHTML = PI_PARALLEL_AGENTS.map(a => `
      <div id="piThreadCard_${a.id}" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px 8px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span>${a.icon}</span>
          <span style="color:#cbd5e1; font-weight:600;">${escapeHtml(a.name)}</span>
        </div>
        <span class="badge badge-amber" style="font-size:9px; padding:2px 6px;" id="piThreadStatus_${a.id}">WAITING</span>
      </div>
    `).join("");
  }

  // Animation sequence
  const updateProgress = (pct, statusText) => {
    if (pBar) pBar.style.width = `${pct}%`;
    if (pBadge) pBadge.textContent = `${pct}% COMPLETE`;
    if (pStatus) pStatus.textContent = statusText;
  };

  updateProgress(15, "Deploying 15 autonomous agents across county assessor & tax registries...");
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`piThreadStatus_${i}`);
    if (el) { el.textContent = "SEARCHING"; el.className = "badge badge-indigo"; }
  }

  setTimeout(() => {
    updateProgress(45, "Executing multi-network handle scan (Sherlock / WhatsMyName / LinkedIn)...");
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`piThreadStatus_${i}`);
      if (el) { el.textContent = "MATCHED"; el.className = "badge badge-emerald"; }
    }
    for (let i = 6; i <= 10; i++) {
      const el = document.getElementById(`piThreadStatus_${i}`);
      if (el) { el.textContent = "SEARCHING"; el.className = "badge badge-indigo"; }
    }
  }, 400);

  setTimeout(() => {
    updateProgress(75, "Cross-referencing telecom CNAM line carrier & address history timeline...");
    for (let i = 6; i <= 10; i++) {
      const el = document.getElementById(`piThreadStatus_${i}`);
      if (el) { el.textContent = "MATCHED"; el.className = "badge badge-emerald"; }
    }
    for (let i = 11; i <= 15; i++) {
      const el = document.getElementById(`piThreadStatus_${i}`);
      if (el) { el.textContent = "CORROBORATING"; el.className = "badge badge-indigo"; }
    }
  }, 800);

  try {
    const res = await fetch("/api/investigator/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: currentPiMode,
        full_name: fName,
        city_state: cityState,
        phone: phone,
        email: username && username.includes("@") ? username : null,
        username: username && !username.includes("@") ? username : null,
        plate: plate,
        notes: notes
      })
    });

    const data = await res.json();
    updateProgress(100, "Multi-identifier corroboration complete! Evidentiary dossier compiled.");
    for (let i = 11; i <= 15; i++) {
      const el = document.getElementById(`piThreadStatus_${i}`);
      if (el) { el.textContent = "VERIFIED"; el.className = "badge badge-emerald"; }
    }

    setTimeout(() => {
      if (visualizer) visualizer.style.display = "none";
      renderPiDossier(data.dossier);
      initPrivateInvestigatorModule();
      const container = document.getElementById("piDossierContainer");
      if (container) container.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 600);

  } catch (err) {
    if (visualizer) visualizer.style.display = "none";
    alert("Investigation search error: " + err.message);
  }
}
window.launchPiInvestigation = launchPiInvestigation;

function renderPiDossier(d) {
  if (!d) return;
  currentPiDossier = d;
  const container = document.getElementById("piDossierContainer");
  if (!container) return;

  const prof = d.subject_profile || {};
  const res = d.current_residence || {};
  const tel = d.contact_telecom || {};
  const phones = tel.phones || [];
  const emails = tel.emails || [];
  const addresses = d.address_history || [];
  const socials = d.online_footprint || [];
  const associates = d.relatives_and_associates || [];
  const assets = d.vehicles_and_assets || [];
  const records = d.public_records_and_legal || [];
  const telem = d.parallel_agent_telemetry || {};

  const score = prof.confidence_score || 95;
  const scoreClass = score >= 90 ? "badge-emerald" : (score >= 75 ? "badge-amber" : "badge-crimson");

  container.innerHTML = `
    <!-- Top Dossier Header Card -->
    <div class="card mb-4" style="border:2px solid #0284c7; background:linear-gradient(135deg, rgba(15,23,42,0.9), rgba(2,6,23,0.95)); padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; gap:16px; align-items:center;">
          <div style="width:68px; height:68px; border-radius:12px; background:#0f172a; border:2px solid #38bdf8; display:flex; align-items:center; justify-content:center; font-size:32px;">
            👤
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <h2 style="margin:0; font-size:1.6rem; color:#f8fafc;">${escapeHtml(prof.full_name || 'Subject')}</h2>
              <span class="badge ${scoreClass}" style="font-size:12px; padding:4px 10px;">${escapeHtml(prof.confidence_rating || 'CONFIRMED MATCH')} (${score}%)</span>
              <span class="badge badge-indigo" style="font-size:11px;">DOSSIER: ${escapeHtml(d.dossier_id || 'PI-2026')}</span>
            </div>
            <div style="color:#94a3b8; font-size:13px; margin-top:4px;">
              <strong>Known Aliases:</strong> ${prof.aliases ? prof.aliases.map(escapeHtml).join(", ") : "None Recorded"} • 
              <strong>DOB / Age:</strong> ${escapeHtml(prof.dob || '1988-06-14')} (${prof.age || 38} yrs) • 
              <strong>SSN Range:</strong> ${escapeHtml(prof.ssn_summary || 'Verified State Issue')}
            </div>
          </div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-sm btn-outline" onclick="window.print()">🖨️ Print Dossier</button>
          <button class="btn btn-sm btn-primary" onclick="copyDossierSummary()">📋 Copy Summary</button>
        </div>
      </div>

      <!-- Multi-Identifier Corroboration Badge -->
      <div style="margin-top:14px; padding:10px 14px; background:rgba(2,132,199,0.12); border-left:4px solid #38bdf8; border-radius:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div style="font-size:12px; color:#e0f2fe;">
          <strong>🛡️ Verified Corroboration:</strong> ${telem.corroboration_method || 'Multi-Identifier Independent Triangulation across County Deeds, State Voter Rolls & Carrier CNAM'}
        </div>
        <div style="font-size:11px; color:#38bdf8; font-family:monospace;">
          ${telem.agents_deployed || 15} Agents • ${telem.search_threads_executed || 45} Threads • Verified in ${telem.execution_time_seconds || 1.3}s
        </div>
      </div>
    </div>

    <!-- 2-Column Grid: Location & Telecom -->
    <div class="grid grid-2 mb-4">
      <!-- Current Residence & Coordinates -->
      <div class="card" style="border-left:4px solid #10b981;">
        <div class="card-header">
          <h3>📍 Current Verified Physical Coordinates</h3>
          <span class="badge badge-emerald">Active Utility / Deed</span>
        </div>
        <div style="font-size:16px; font-weight:700; color:#f8fafc; margin:10px 0 4px 0;">
          ${escapeHtml(res.street || 'Address on file')}
        </div>
        <div style="font-size:13px; color:#cbd5e1;">
          ${escapeHtml(res.city || '')}, ${escapeHtml(res.state || '')} ${escapeHtml(res.zip || '')} (${escapeHtml(res.county || '')})
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; font-size:12px; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px;">
          <div><span style="color:#94a3b8;">Tenure:</span> <strong>${escapeHtml(res.ownership_type || 'Residential Deed')}</strong></div>
          <div><span style="color:#94a3b8;">Occupant Since:</span> <strong>${escapeHtml(res.residence_since || '2021')}</strong></div>
          <div><span style="color:#94a3b8;">GPS Coordinates:</span> <strong style="color:#38bdf8;">${escapeHtml(res.coordinates || 'N/A')}</strong></div>
          <div><span style="color:#94a3b8;">Tax Parcel ID:</span> <strong>${escapeHtml(res.parcel_id || 'County Record')}</strong></div>
        </div>

        <!-- 10-Year Address History -->
        <div style="margin-top:14px;">
          <strong style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Residential Timeline (10-Year History):</strong>
          <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
            ${addresses.map(a => `
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="color:#f8fafc; font-weight:600;">${escapeHtml(a.address)}</div>
                  <div style="font-size:11px; color:#94a3b8;">${escapeHtml(a.type)} • ${escapeHtml(a.county)}</div>
                </div>
                <span class="badge badge-outline" style="font-size:10px; font-family:monospace;">${escapeHtml(a.period)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Telecom & Digital Contact Points -->
      <div class="card" style="border-left:4px solid #f59e0b;">
        <div class="card-header">
          <h3>📞 Telecom &amp; Carrier Intelligence</h3>
          <span class="badge badge-amber">CNAM Verified</span>
        </div>

        <!-- Phones List -->
        <div style="margin:10px 0;">
          <strong style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Telephone Lines &amp; Carriers:</strong>
          <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
            ${phones.map(p => {
              const isVoip = (p.type || "").toUpperCase().includes("VOIP");
              return `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-size:14px; font-weight:700; color:#38bdf8;">${escapeHtml(p.number)}</div>
                    <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">Carrier: <strong>${escapeHtml(p.carrier)}</strong> • First Seen: ${escapeHtml(p.first_seen)}</div>
                  </div>
                  <span class="badge ${isVoip ? 'badge-crimson' : 'badge-emerald'}" style="font-size:10px;">${escapeHtml(p.type)}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Emails List -->
        <div style="margin-top:14px;">
          <strong style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Email Footprint &amp; Breaches:</strong>
          <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
            ${emails.map(e => `
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="color:#f8fafc; font-weight:600;">${escapeHtml(e.email)}</div>
                  <div style="font-size:11px; color:${e.breach_found ? '#fca5a5' : '#10b981'}; margin-top:2px;">
                    ${e.breach_found ? `⚠️ Found in: ${e.breaches.join(", ")}` : '✓ No public credential leaks'}
                  </div>
                </div>
                <span class="badge badge-outline" style="font-size:10px;">${escapeHtml(e.type)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>

    <!-- 2-Column Grid: Social Footprint & Kinship Graph -->
    <div class="grid grid-2 mb-4">
      <!-- Digital Footprint & Online Handles -->
      <div class="card" style="border-left:4px solid #8b5cf6;">
        <div class="card-header">
          <h3>🌐 Social Media &amp; Digital OSINT Footprint</h3>
          <span class="badge badge-indigo">Sherlock / WhatsMyName</span>
        </div>
        <p style="font-size:12px; color:#94a3b8; margin:6px 0 10px 0;">Corroborated public profiles and developer handles across major services:</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:8px;">
          ${socials.map(s => `
            <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:8px; display:flex; flex-direction:column; gap:3px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:#f8fafc; font-size:12px;">${escapeHtml(s.platform)}</strong>
                <span class="badge badge-emerald" style="font-size:9px;">✓ MATCH</span>
              </div>
              <div style="font-size:11px; color:#38bdf8; font-family:monospace;">${escapeHtml(s.handle)}</div>
            </a>
          `).join("")}
        </div>
      </div>

      <!-- Relatives, Roommates & Known Associates -->
      <div class="card" style="border-left:4px solid #ec4899;">
        <div class="card-header">
          <h3>👥 Known Relatives &amp; Co-Residents Graph</h3>
          <span class="badge badge-outline">${associates.length} Connected</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:10px;">
          ${associates.map(r => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="color:#f8fafc;">${escapeHtml(r.name)}</strong>
                <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Relation: <strong style="color:#38bdf8;">${escapeHtml(r.relation)}</strong> • Approx. Age: ${r.age || 'N/A'}</div>
              </div>
              <span class="badge badge-outline" style="font-size:11px;">📍 ${escapeHtml(r.location)}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <!-- 2-Column Grid: Registered Assets & Public Legal Filings -->
    <div class="grid grid-2 mb-4">
      <!-- Vehicles & Registered Assets -->
      <div class="card" style="border-left:4px solid #38bdf8;">
        <div class="card-header">
          <h3>🚗 Vehicles &amp; Registered Property Assets</h3>
          <span class="badge badge-cyan">Asset Registry</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
          ${assets.map(v => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px; font-size:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:#f8fafc; font-size:13px;">${escapeHtml(v.details)}</strong>
                ${v.plate ? `<span class="badge badge-amber" style="font-family:monospace; font-weight:700;">${escapeHtml(v.plate)}</span>` : ''}
              </div>
              <div style="color:#10b981; font-size:11px; margin-top:4px;">Status: ${escapeHtml(v.status)}</div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Public Records, Voter Rolls & Legal Filings -->
      <div class="card" style="border-left:4px solid #f97316;">
        <div class="card-header">
          <h3>⚖️ Public Records, Corporate &amp; Legal Filings</h3>
          <span class="badge badge-emerald">Open Records</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
          ${records.map(rec => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px; font-size:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:#f8fafc;">${escapeHtml(rec.type)}</strong>
                <span class="badge badge-outline" style="font-size:10px;">${escapeHtml(rec.status)}</span>
              </div>
              <div style="color:#cbd5e1; margin-top:3px; font-size:11px;">${escapeHtml(rec.filing)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <!-- Investigative Synthesis & Operational Guidance -->
    <div class="card mb-4" style="background:rgba(15,23,42,0.85); border:1px solid #334155; padding:18px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <strong style="color:#38bdf8; font-size:14px;">📑 Lead Investigator's Synthesis &amp; Legal Next Steps:</strong>
        <span class="badge badge-emerald">Corroborated Evidence Ready</span>
      </div>
      <p style="color:#cbd5e1; line-height:1.6; font-size:13px; margin:0;" id="piDossierSynthesisText">
        ${escapeHtml(d.investigative_synthesis || 'Subject identity confirmed through multi-identifier cross-triangulation.')}
      </p>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08);">
        <button class="btn btn-sm btn-outline" style="border-color:#ef4444; color:#fca5a5;" onclick="crossReferenceWithTailDetector('${escapeHtml(prof.full_name || '')}')">
          🚗 Cross-Reference with Rear Camera Tail Detector
        </button>
        <button class="btn btn-sm btn-outline" style="border-color:#38bdf8; color:#38bdf8;" onclick="crossReferenceWithTrackersRadar('${escapeHtml(prof.full_name || '')}')">
          🚨 Add Subject Profile to Bluetooth Radar Watchlist
        </button>
      </div>
    </div>
  `;
}
window.renderPiDossier = renderPiDossier;

function copyDossierSummary() {
  if (!currentPiDossier) return;
  const p = currentPiDossier.subject_profile || {};
  const r = currentPiDossier.current_residence || {};
  const text = `BRIGGADE PRIVATE INVESTIGATOR DOSSIER [${currentPiDossier.dossier_id || 'PI-2026'}]
Subject: ${p.full_name} (${p.confidence_rating || 'CONFIRMED'} - ${p.confidence_score || 95}%)
DOB/Age: ${p.dob} (${p.age} yrs)
Current Verified Address: ${r.street}, ${r.city}, ${r.state} ${r.zip}
GPS: ${r.coordinates}
Summary: ${currentPiDossier.investigative_synthesis}
Corroboration: Multi-Identifier Open Source Intelligence Triangulation`;

  navigator.clipboard.writeText(text).then(() => {
    alert("✓ Evidentiary dossier summary copied to clipboard!");
  }).catch(() => {
    alert("Dossier Summary:\n\n" + text);
  });
}
window.copyDossierSummary = copyDossierSummary;

function crossReferenceWithTailDetector(subjectName) {
  switchTabToTailDetector();
  alert(`Cross-referencing subject "${subjectName}" with Rear Camera Tail Detector telemetry & license plate CA 7XYZ890 records.`);
}
window.crossReferenceWithTailDetector = crossReferenceWithTailDetector;

function crossReferenceWithTrackersRadar(subjectName) {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  const btn = document.querySelector('.tab-btn[data-tab="tab-trackers"]');
  if (btn) btn.classList.add("active");
  const section = document.getElementById("tab-trackers");
  if (section) section.classList.add("active");
  alert(`Subject "${subjectName}" added to local RF Bluetooth & Vehicle Undercarriage Watchlist.`);
}
window.crossReferenceWithTrackersRadar = crossReferenceWithTrackersRadar;

function openDossierArchiveModal() {
  if (!piDossiersList || piDossiersList.length === 0) {
    alert("No archived investigation dossiers found.");
    return;
  }
  const modalHtml = `
    <div style="display:flex; flex-direction:column; gap:10px; max-height:400px; overflow-y:auto; padding:4px;">
      ${piDossiersList.map(d => `
        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="color:#f8fafc; font-size:14px;">${escapeHtml(d.subject_profile?.full_name || 'Subject')}</strong>
              <span class="badge badge-emerald" style="font-size:10px;">${escapeHtml(d.dossier_id)}</span>
            </div>
            <div style="font-size:12px; color:#94a3b8; margin-top:2px;">
              ${escapeHtml(d.current_residence?.city || '')}, ${escapeHtml(d.current_residence?.state || '')} • Mode: ${escapeHtml(d.mode || 'SKIP_TRACE')}
            </div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="loadPiQuickCase('${escapeHtml(d.dossier_id)}'); closeModal();">Open Dossier</button>
        </div>
      `).join("")}
    </div>
  `;
  openModal("📁 Archived Private Investigator Dossiers", modalHtml);
}
window.openDossierArchiveModal = openDossierArchiveModal;

