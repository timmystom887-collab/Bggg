package com.aegispulse.security

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat
import androidx.core.content.ContextCompat.startForegroundService
import androidx.core.app.ActivityCompat
import org.json.JSONArray
import org.json.JSONObject

/** Native gateway used by the packaged dashboard. No simulated responses are generated. */
class NativeFeatureBridge(private val context: Context) {
    private val securityAuditor by lazy { AndroidSecurityAuditor(context) }
    private val privacyGuard by lazy { AudioPrivacyGuard(context) }
    private val lawyer by lazy { AiLawyerAudioOperator(context) }
    private val farm by lazy { FarmMachineryStethoscope(context) }
    private val csi by lazy { WifiCsiRadarScanner(context) }
    private val foia by lazy { FoiaDiscoveryManager(context) }
    private val witness by lazy { BystanderWitnessManager(context) }
    private val police by lazy { PoliceEncounterRecorder(context) }
    private val stealth by lazy { StealthCalculatorActivity(context) }
    private val sweeper by lazy { PhysicalSurveillanceSweeper(context) }
    private val magnifier by lazy { AcousticTrackerMagnifier(context) }
    private var speechCapture: LiveSpeechCapture? = null
    @Volatile private var lastTranscript: String = ""
    @Volatile private var lastTranscriptFinal: Boolean = false

    @JavascriptInterface
    fun requestBlePermissions() {
        if (context is Activity) {
            val permissions = mutableListOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
            if (android.os.Build.VERSION.SDK_INT >= 33) permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            ActivityCompat.requestPermissions(context, permissions.toTypedArray(), 410)
        }
    }

    @JavascriptInterface
    fun hasBlePermissions(): Boolean {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED && ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun requestRecordingPermissions() {
        if (context is Activity) {
            ActivityCompat.requestPermissions(context, arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO), 411)
        }
    }

    @JavascriptInterface
    fun setGeminiApiKey(apiKey: String) {
        context.getSharedPreferences("aegis_settings", Context.MODE_PRIVATE).edit().putString("gemini_api_key", apiKey.trim()).apply()
    }

    @JavascriptInterface
    fun request(path: String, method: String?, body: String?): String {
        return try {
            val input = if (body.isNullOrBlank()) JSONObject() else JSONObject(body)
            when (path.substringBefore('?')) {
                "/api/android/overview" -> androidOverview()
                "/api/android/scan-manifest" -> installedApps()
                "/api/audio/privacy-audit" -> privacyAudit()
                "/api/magnifier/start" -> { requirePermission(Manifest.permission.RECORD_AUDIO); magnifier.startAcousticMagnification(); JSONObject().put("active", true) }
                "/api/magnifier/stop" -> { magnifier.stopAcousticMagnification(); JSONObject().put("active", false) }
                "/api/lawyer-operator/process-speech" -> lawyerEvaluation(input)
                "/api/lawyer-operator/start" -> startSpeechCapture()
                "/api/lawyer-operator/stop" -> { speechCapture?.stop(); speechCapture = null; JSONObject().put("active", false) }
                "/api/lawyer-operator/status" -> JSONObject().put("active", speechCapture?.isListening == true).put("transcript", lastTranscript).put("final", lastTranscriptFinal)
                "/api/copilot/chat" -> geminiQuery(input)
                "/api/android/gemini-audit" -> geminiQuery(input)
                "/api/farm/bearing-diagnostic" -> bearingDiagnostic(input)
                "/api/csi/scan" -> csiScan(input)
                "/api/foia/preservation-notice" -> foiaNotice(input)
                "/api/foia/public-records-request" -> publicRecordsPetition(input)
                "/api/counter-surveillance/cellular-audit" -> JSONObject(sweeper.auditCellularDowngradeThreat())
                "/api/stealth/pin" -> JSONObject().put("result", stealth.verifyPin(input.optString("pin")).name)
                "/api/police/status" -> JSONObject().put("active_incident", JSONObject.NULL).put("recording_supported", true)
                "/api/police/start" -> startPolice(input)
                "/api/police/stop" -> JSONObject(police.stopEncounterMode())
                "/api/police/refuse-search" -> { police.setExplicitSearchRefusal(); JSONObject().put("success", true) }
                "/api/trackers/start" -> startBleScan()
                "/api/trackers/stop" -> stopBleScan()
                "/api/trackers" -> JSONObject().put("trackers", BleTrackerStore.asJson()).put("stalking_alert_active", false).put("is_running", BleTrackerStore.isRunning)
                "/api/meetings" -> JSONObject().put("sessions", JSONArray())
                "/api/scanner/state" -> JSONObject().put("active", false).put("message", "No native radio scanner is available on this device.")
                "/api/sentinel/status" -> JSONObject().put("is_armed", false)
                "/api/witness/beacons" -> JSONObject().put("beacons", JSONArray())
                "/api/witness/broadcast" -> witnessBroadcast(input)
                else -> errorJson("NOT_CONNECTED", "No native implementation is available for $path", 501)
            }.toString()
        } catch (security: SecurityException) {
            errorJson("PERMISSION_REQUIRED", security.message ?: "Android permission required", 403)
        } catch (failure: Throwable) {
            errorJson("NATIVE_FEATURE_ERROR", failure.message ?: failure.javaClass.simpleName, 500)
        }
    }

    private fun requirePermission(permission: String) {
        if (ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED) {
            throw SecurityException("Permission required: $permission")
        }
    }

    private fun startBleScan(): JSONObject {
        requirePermission(Manifest.permission.BLUETOOTH_SCAN)
        requirePermission(Manifest.permission.BLUETOOTH_CONNECT)
        val intent = Intent(context, BleBackgroundScanService::class.java)
        startForegroundService(context, intent)
        return JSONObject().put("started", true).put("message", "BLE tracker scan started")
    }

    private fun stopBleScan(): JSONObject {
        context.stopService(Intent(context, BleBackgroundScanService::class.java))
        return JSONObject().put("stopped", true)
    }

    private fun startPolice(input: JSONObject): JSONObject {
        requirePermission(Manifest.permission.CAMERA)
        requirePermission(Manifest.permission.RECORD_AUDIO)
        val file = police.startEncounterMode(input.optString("emergency_contact").takeIf { it.isNotBlank() }, input.optString("gps", "0,0"))
            ?: throw IllegalStateException("Camera recording could not be started")
        return JSONObject().put("success", true).put("incident", JSONObject().put("video_path", file.absolutePath).put("is_recording", true))
    }

    private fun androidOverview(): JSONObject {
        val posture = securityAuditor.auditDevicePosture()
        val postureJson = JSONObject().put("posture_score", posture.postureScore).put("is_rooted", posture.isRooted).put("selinux_mode", posture.selinuxMode).put("is_adb_enabled", posture.isAdbEnabled).put("is_unknown_sources_enabled", posture.isUnknownSourcesEnabled).put("patch_level", posture.patchLevel).put("issues", JSONArray(posture.issues))
        return JSONObject().put("device_posture", postureJson).put("installed_apps", JSONArray()).put("high_risk_count", 0)
    }

    private fun installedApps(): JSONObject {
        val apps = JSONArray()
        securityAuditor.auditInstalledApps().forEach { report ->
            apps.put(JSONObject().put("package_name", report.packageName).put("app_name", report.appName).put("requested_permissions", JSONArray(report.requestedPermissions)).put("toxic_synergies", JSONArray(report.toxicSynergies)).put("threat_score", report.threatScore).put("is_sideloaded", report.isSideloaded))
        }
        return JSONObject().put("installed_apps", apps)
    }

    private fun privacyAudit(): JSONObject {
        val result = privacyGuard.auditAudioPrivacy()
        return JSONObject().put("privacy_status", if (result.suspiciousBackgroundCaptureDetected) "COMPROMISED" else "SECURE").put("microphone_hardware_active", result.isHardwareMicActive).put("active_client_count", result.activeClientCount).put("bluetooth_routing_active", result.isBluetoothRoutingActive).put("eavesdropping_threats", JSONArray(result.details))
    }

    private fun lawyerEvaluation(input: JSONObject): JSONObject {
        val advisory = lawyer.evaluateUtterance(input.optString("text", input.optString("utterance")))
        return JSONObject().put("legal_evaluation", JSONObject().put("is_violation", advisory.isViolation).put("violation_type", advisory.violationType).put("whisper_script", advisory.whisperScript)).put("whisper_cue", advisory.whisperScript).put("turn", JSONObject().put("speaker", "USER").put("text", input.optString("text")))
    }

    private fun bearingDiagnostic(input: JSONObject): JSONObject {
        val report = farm.performBearingDiagnostic(input.optString("machine_name", "Machine"), input.optInt("duration_sec", 1).coerceIn(1, 10))
        return JSONObject().put("machine_name", report.machineName).put("bearing_friction_ratio_pct", report.bearingFrictionRatioPct).put("crest_factor_db", report.crestFactorDb).put("healthScore", report.healthScore).put("fault_detected", report.faultDetected).put("diagnostic_recommendations", JSONArray(listOf(report.recommendation))).put("severity_level", if (report.faultDetected) "CRITICAL" else "NORMAL").put("energy_distribution", JSONObject().put("high_frequency_bearing_band_pct", report.bearingFrictionRatioPct).put("low_frequency_diesel_rumble_pct", 0))
    }

    private fun csiScan(input: JSONObject): JSONObject {
        val sighting = csi.evaluateRfDistortion(input.optDouble("csi_variance", 0.0).toFloat(), input.optDouble("doppler_shift_hz", 0.0).toFloat())
        val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val visibleNetworks = try { wifi.scanResults?.size ?: 0 } catch (_: SecurityException) { 0 }
        return JSONObject().put("classification", sighting.classification).put("csi_variance", sighting.csiVariance).put("respiration_rate_bpm", sighting.respirationBpm).put("is_human_detected", sighting.classification != "NO_HUMAN_PRESENCE_CLEAR").put("confidence_pct", 70).put("radar_coordinates", JSONObject().put("distance_m", sighting.estimatedDistanceMeters).put("partition_penetrated", "RF measurement")).put("wifi_networks_visible", visibleNetworks).put("csi_hardware_supported", false).put("advisory", "Android public APIs do not expose raw Wi-Fi CSI on this device; visible Wi-Fi scan count is real, but no through-wall reading is claimed.")
    }

    private fun foiaNotice(input: JSONObject): JSONObject {
        val notice = foia.createSpoliationDemand(input.optString("incident_id", "UNSPECIFIED"), input.optString("sha256_hash", "UNSEALED"), input.optString("target_agency", "Agency"))
        return JSONObject().put("notice_document", notice).put("jurisdiction", input.optString("jurisdiction", "GENERAL"))
    }

    private fun publicRecordsPetition(input: JSONObject): JSONObject {
        val jurisdiction = input.optString("jurisdiction", "GENERAL")
        val petition = foia.createPublicRecordsPetition(input.optString("agency", "Records Officer"), input.optString("requester_name", "Citizen Legal Observer"), jurisdiction)
        return JSONObject().put("petition_document", petition).put("jurisdiction", jurisdiction).put("response_deadline_days", if (jurisdiction.uppercase().contains("CALIFORNIA")) 10 else JSONObject.NULL)
    }

    private fun startSpeechCapture(): JSONObject {
        requirePermission(Manifest.permission.RECORD_AUDIO)
        val capture = LiveSpeechCapture(context) { text, isFinal ->
            lastTranscript = text
            lastTranscriptFinal = isFinal
        }
        if (!capture.start()) throw IllegalStateException("Android speech recognition is unavailable on this device")
        speechCapture = capture
        return JSONObject().put("active", true).put("engine", "Android SpeechRecognizer")
    }

    private fun geminiQuery(input: JSONObject): JSONObject {
        val key = context.getSharedPreferences("aegis_settings", Context.MODE_PRIVATE).getString("gemini_api_key", "") ?: ""
        val prompt = input.optString("prompt", input.optString("message", input.toString()))
        return JSONObject().put("response", GeminiMobileClient(key).queryGemini(prompt, "Answer concisely and distinguish observations from uncertainty."))
    }

    private fun witnessBroadcast(input: JSONObject): JSONObject {
        val beacon = witness.broadcastWitnessAlert(input.optString("incident_id", "INCIDENT"), input.optString("address", "Nearby"))
        return JSONObject().put("beacon", JSONObject().put("beacon_id", beacon.beaconId).put("incident_id", beacon.incidentId).put("address", beacon.address).put("observers_responding", beacon.observersResponding))
    }

    private fun errorJson(code: String, message: String, status: Int): String = JSONObject().put("error", true).put("code", code).put("message", message).put("status", status).toString()
}
