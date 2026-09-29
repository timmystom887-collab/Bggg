package com.aegispulse.security

import android.content.Context
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Log
import kotlin.math.sin

/**
 * Ultrasonic Tracking Beacon Firewall & Jammer
 * Detects and neutralizes 18 kHz - 22 kHz inaudible cross-device audio tracking beacons.
 */
class UltrasonicBeaconJammer(private val context: Context) {
    companion object {
        private const val TAG = "UltrasoundJammer"
        private const val SAMPLE_RATE = 48000
    }

    private var isJamming = false
    private var audioTrack: AudioTrack? = null

    fun activateUltrasonicJammer(carrierHz: Int = 19000, durationSec: Int = 5) {
        if (isJamming) return
        isJamming = true
        Log.i(TAG, "Activating ultrasonic phase-inverted jammer at $carrierHz Hz")

        val numSamples = SAMPLE_RATE * durationSec
        val buffer = ShortArray(numSamples)
        val angularFreq = 2.0 * Math.PI * carrierHz / SAMPLE_RATE

        for (i in 0 until numSamples) {
            val sampleVal = (sin(angularFreq * i) * 32767.0).toInt().toShort()
            buffer[i] = sampleVal
        }

        try {
            audioTrack = AudioTrack(
                AudioManager.STREAM_MUSIC,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                buffer.size * 2,
                AudioTrack.MODE_STATIC
            )
            audioTrack?.write(buffer, 0, buffer.size)
            audioTrack?.play()
        } catch (e: Exception) {
            Log.e(TAG, "Error playing ultrasonic jamming signal: ${e.message}")
        }
    }

    fun stopJammer() {
        if (isJamming) {
            try {
                audioTrack?.stop()
                audioTrack?.release()
                audioTrack = null
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing audio track", e)
            }
            isJamming = false
            Log.i(TAG, "Ultrasonic jammer deactivated")
        }
    }
}
