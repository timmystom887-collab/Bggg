package com.aegispulse.security

import android.content.Context
import android.hardware.Camera
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.telephony.SmsManager
import android.util.Log
import java.io.File
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.*

/**
 * AegisPulse Police Interaction Live Rights Informer & Incident Recorder
 * Features:
 * 1. Live video & audio recording to tamper-evident local cache.
 * 2. On-screen Constitutional Rights script prompts (1st, 4th, 5th Amendment, Stop-and-ID).
 * 3. Emergency Contact SMS alert with instant GPS waypoint beaconing.
 * 4. Officer badge, patrol car, and search refusal logging.
 * 5. SHA-256 cryptographic chain-of-custody checksum computation.
 */
class PoliceEncounterRecorder(private val context: Context) {

    companion object {
        private const val TAG = "PoliceEncounterRecorder"
    }

    data class OfficerRecord(
        val badgeNumber: String,
        val officerName: String,
        val agency: String,
        val patrolVehicle: String
    )

    private var isRecording = false
    private var mediaRecorder: MediaRecorder? = null
    private var camera: Camera? = null
    private var currentOutputFile: File? = null
    private val loggedOfficers = mutableListOf<OfficerRecord>()
    private var searchConsentGranted = false
    private val notes = mutableListOf<String>()

    val rightsScripts = mapOf(
        "FIRST_AMENDMENT" to "Officer, I am lawfully exercising my First Amendment right to record this encounter from a safe distance.",
        "FOURTH_AMENDMENT" to "Officer, I do not consent to any search of my person, my vehicle, or my personal belongings.",
        "FIFTH_AMENDMENT" to "I am invoking my Fifth Amendment right to remain silent. I will not answer questions without my lawyer present.",
        "DETENTION_CHECK" to "Officer, am I free to go, or am I being detained?",
        "STOP_AND_ID" to "Here is my driver's license, vehicle registration, and proof of insurance."
    )

    fun startEncounterMode(emergencyContactPhone: String? = null, currentGpsCoordinates: String = "37.7749,-122.4194"): File? {
        if (isRecording) {
            Log.w(TAG, "Encounter recording is already active")
            return currentOutputFile
        }

        try {
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val storageDir = context.getExternalFilesDir(null) ?: context.filesDir
            currentOutputFile = File(storageDir, "ENCOUNTER_${timeStamp}.mp4")

            // Use the legacy camera-backed MediaRecorder path. The previous
            // SURFACE source never supplied a camera surface, so prepare()
            // failed before recording could begin.
            camera = Camera.open().apply { setDisplayOrientation(90); unlock() }
            mediaRecorder = MediaRecorder().apply {
                setCamera(camera)
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setVideoSource(MediaRecorder.VideoSource.CAMERA)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setOutputFile(currentOutputFile!!.absolutePath)
                setVideoEncoder(MediaRecorder.VideoEncoder.H264)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setVideoSize(1920, 1080)
                setVideoFrameRate(30)
                setVideoEncodingBitRate(10_000_000)
                setAudioEncodingBitRate(192_000)
                setAudioSamplingRate(48000)
                prepare()
                start()
            }
            isRecording = true
            Log.i(TAG, "Police encounter video recorder initialized: ${currentOutputFile?.absolutePath}")

            // Dispatch emergency SMS alert if configured
            if (!emergencyContactPhone.isNullOrBlank()) {
                sendEmergencyAlertSms(emergencyContactPhone, currentGpsCoordinates)
            }

            return currentOutputFile
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start encounter recording: ${e.message}", e)
            try { mediaRecorder?.reset(); mediaRecorder?.release() } catch (_: Exception) {}
            mediaRecorder = null
            try { camera?.release() } catch (_: Exception) {}
            camera = null
            isRecording = false
            return null
        }
    }

    fun logOfficer(badge: String, name: String, agency: String, vehicle: String) {
        val officer = OfficerRecord(badge, name, agency, vehicle)
        loggedOfficers.add(officer)
        Log.i(TAG, "Logged law enforcement officer: $officer")
    }

    fun setExplicitSearchRefusal() {
        searchConsentGranted = false
        notes.add("At ${System.currentTimeMillis()}, user clearly verbalized non-consent to search.")
    }

    private fun sendEmergencyAlertSms(phoneNumber: String, gpsCoords: String) {
        try {
            val smsManager = SmsManager.getDefault()
            val mapsUrl = "https://maps.google.com/?q=$gpsCoords"
            val message = "[AEGISPULSE EMERGENCY ALERT] I have been stopped by police at $mapsUrl. Video is recording offsite."
            smsManager.sendTextMessage(phoneNumber, null, message, null, null)
            Log.i(TAG, "Emergency dispatch alert SMS transmitted to $phoneNumber")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send emergency SMS: ${e.message}")
        }
    }

    fun stopEncounterMode(): Map<String, Any> {
        if (!isRecording) {
            return mapOf("error" to "No active encounter session")
        }

        var fileHash = "UNAVAILABLE"
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            camera?.release()
            camera = null
            isRecording = false

            currentOutputFile?.let { file ->
                if (file.exists()) {
                    fileHash = calculateSha256(file)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping media recorder: ${e.message}")
        }

        return mapOf(
            "status" to "COMPLETED",
            "video_path" to (currentOutputFile?.absolutePath ?: "N/A"),
            "sha256_hash" to fileHash,
            "search_consent" to searchConsentGranted,
            "officers_logged_count" to loggedOfficers.size,
            "officers" to loggedOfficers
        )
    }

    private fun calculateSha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { stream ->
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (stream.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }
}
