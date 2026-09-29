package com.aegispulse.security

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.*
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlin.concurrent.thread
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin

class BluetoothAudioMagnifierService : Service() {

    companion object {
        const val TAG = "BtAudioMagnifier"
        const val CHANNEL_ID = "aegis_magnifier_channel"
        const val NOTIFICATION_ID = 2002

        const val SAMPLE_RATE = 44100
        const val ACTION_START = "com.aegispulse.security.START_MAGNIFIER"
        const val ACTION_STOP = "com.aegispulse.security.STOP_MAGNIFIER"
    }

    private lateinit var audioManager: AudioManager
    private var isMagnifying = false
    private var dspThread: Thread? = null

    // User settings
    private var masterGainDb = 12.0f
    private var peakLimiterThreshold = 0.90f // -1 dBFS limit

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        createNotificationChannel()
    }

    /**
     * Checks if a paired Bluetooth headphone or headset is actively connected.
     * Enforces the safety requirement to eliminate acoustic feedback howling.
     */
    fun isBluetoothHeadphoneConnected(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            return devices.any {
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                it.type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
                it.type == AudioDeviceInfo.TYPE_HEARING_AID ||
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
            }
        } else {
            @Suppress("DEPRECATION")
            return audioManager.isBluetoothA2dpOn || audioManager.isBluetoothScoOn
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                if (!isBluetoothHeadphoneConnected()) {
                    Log.e(TAG, "BLOCKED: Bluetooth headphone is strictly required for Audio Magnification.")
                    stopSelf()
                    return START_NOT_STICKY
                }
                masterGainDb = intent.getFloatExtra("gain_db", 12.0f)
                startAudioMagnifier()
            }
            ACTION_STOP -> {
                stopAudioMagnifier()
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    @SuppressLint("MissingPermission")
    private fun startAudioMagnifier() {
        if (isMagnifying) return
        isMagnifying = true

        startForeground(
            NOTIFICATION_ID,
            buildNotification("🎧 Audio Magnifier Active", "Magnifying ambient speech to connected Bluetooth headphones (+${masterGainDb.toInt()} dB)")
        )

        dspThread = thread(start = true, name = "AudioMagnifierDSP") {
            val bufferSize = AudioRecord.getMinBufferSize(
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            ).coerceAtLeast(2048)

            val audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize
            )

            val audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            // Route audio strictly to Bluetooth output
            routeToBluetoothHeadphones(audioTrack)

            // Linear multiplier
            val linearGain = 10.0.pow((masterGainDb / 20.0)).toFloat()

            // 1st order High-pass filter state to remove handling rumble (< 140 Hz)
            var hpPrevIn = 0f
            var hpPrevOut = 0f
            val rc = 1.0f / (2.0f * Math.PI.toFloat() * 140.0f)
            val dt = 1.0f / SAMPLE_RATE.toFloat()
            val alpha = rc / (rc + dt)

            try {
                audioRecord.startRecording()
                audioTrack.play()

                val buffer = ShortArray(bufferSize / 2)

                while (isMagnifying) {
                    val read = audioRecord.read(buffer, 0, buffer.size)
                    if (read > 0) {
                        for (i in 0 until read) {
                            val rawSample = buffer[i].toFloat() / 32768.0f

                            // 1. High-pass filter to eliminate sub-audible rumble
                            val hpOut = alpha * (hpPrevOut + rawSample - hpPrevIn)
                            hpPrevIn = rawSample
                            hpPrevOut = hpOut

                            // 2. Magnification Gain
                            var amplified = hpOut * linearGain

                            // 3. Peak Limiter / Hearing Protection (Hard clip at -1 dBFS threshold)
                            if (amplified > peakLimiterThreshold) {
                                amplified = peakLimiterThreshold
                            } else if (amplified < -peakLimiterThreshold) {
                                amplified = -peakLimiterThreshold
                            }

                            buffer[i] = (amplified * 32767.0f).toInt().toShort()
                        }
                        audioTrack.write(buffer, 0, read)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Audio magnification loop error", e)
            } finally {
                try {
                    audioRecord.stop()
                    audioRecord.release()
                    audioTrack.stop()
                    audioTrack.release()
                } catch (e: Exception) {
                    Log.e(TAG, "Cleanup exception", e)
                }
            }
        }
    }

    private fun routeToBluetoothHeadphones(audioTrack: AudioTrack) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            val bt = devices.firstOrNull {
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                it.type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
                it.type == AudioDeviceInfo.TYPE_HEARING_AID
            }
            if (bt != null) {
                audioTrack.preferredDevice = bt
                Log.i(TAG, "Audio Magnifier routed to Bluetooth: ${bt.productName}")
            }
        }
    }

    private fun stopAudioMagnifier() {
        isMagnifying = false
        dspThread?.interrupt()
        dspThread = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(CHANNEL_ID, "AegisPulse Audio Magnifier", NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(chan)
        }
    }

    private fun buildNotification(title: String, text: String): android.app.Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_silent_mode_off)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        stopAudioMagnifier()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
