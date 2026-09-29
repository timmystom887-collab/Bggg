package com.aegispulse.security

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.AudioRecordingConfiguration
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat

class AudioPrivacyGuard(private val context: Context) {

    companion object {
        const val TAG = "AudioPrivacyGuard"
        const val ALERT_CHANNEL_ID = "aegis_audio_privacy_alerts"
    }

    data class RecordingAuditResult(
        val isHardwareMicActive: Boolean,
        val activeClientCount: Int,
        val isBluetoothRoutingActive: Boolean,
        val suspiciousBackgroundCaptureDetected: Boolean,
        val details: List<String>
    )

    fun auditAudioPrivacy(): RecordingAuditResult {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val details = mutableListOf<String>()
        var isMicActive = false
        var clientCount = 0
        var isSuspicious = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val configs = audioManager.activeRecordingConfigurations
            clientCount = configs.size
            isMicActive = configs.isNotEmpty()

            for (config in configs) {
                val clientUid = config.clientAudioSessionId
                val audioSource = config.audioSource
                details.add("Active Recording Session #$clientUid (Source: $audioSource)")
                
                // If recording from an unknown client while user is not actively running the app
                if (config.isClientSilenced) {
                    details.add("Notice: Android has silenced this client due to background privacy restrictions.")
                }
            }
        }

        // Check Bluetooth Audio Output status
        val outputs = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
        val isBluetoothConnected = outputs.any {
            it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
        }

        if (isMicActive && isBluetoothConnected) {
            details.add("Bluetooth audio peripheral is actively receiving/transmitting host audio streams.")
        }

        return RecordingAuditResult(
            isHardwareMicActive = isMicActive,
            activeClientCount = clientCount,
            isBluetoothRoutingActive = isBluetoothConnected,
            suspiciousBackgroundCaptureDetected = isSuspicious,
            details = details
        )
    }

    fun triggerEavesdroppingAlert(threatDetails: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(ALERT_CHANNEL_ID, "Microphone Privacy Alerts", NotificationManager.IMPORTANCE_HIGH)
            manager.createNotificationChannel(chan)
        }

        val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentTitle("🛡️ MICROPHONE PRIVACY GUARD")
            .setContentText("Unauthorized audio recording detected.")
            .setStyle(NotificationCompat.BigTextStyle().bigText(threatDetails))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        manager.notify(7788, notification)
    }
}
