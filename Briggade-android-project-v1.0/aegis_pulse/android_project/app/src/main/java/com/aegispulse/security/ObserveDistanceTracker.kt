package com.aegispulse.security

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import kotlin.concurrent.thread
import kotlin.math.pow
import kotlin.math.roundToInt

class KalmanRssiFilter(
    private val processVariance: Double = 0.05,
    private val measurementVariance: Double = 1.5
) {
    private var x: Double? = null
    private var p: Double = 1.0

    fun update(rawRssi: Double): Double {
        if (x == null) {
            x = rawRssi
            return rawRssi
        }
        p += processVariance
        val k = p / (p + measurementVariance)
        x = x!! + k * (rawRssi - x!!)
        p = (1.0 - k) * p
        return x!!
    }
}

class ObserveDistanceTracker(
    private val targetMacAddress: String,
    private val txPower: Int = -59
) {
    private val kalman = KalmanRssiFilter()
    var currentFilteredRssi: Double = -75.0
        private set
    var estimatedDistanceM: Double = 5.0
        private set
    var currentZone: ProximityZone = ProximityZone.COLD
        private set

    private var geigerActive = false
    private var geigerThread: Thread? = null

    enum class ProximityZone(val label: String, val colorHex: String, val clickRateHz: Double, val advice: String) {
        BURNING_HOT("BURNING HOT (Immediate Contact)", "#ef4444", 16.0, "Within arm's reach! Check under seat, inside pocket, or wheel well."),
        HOT("HOT (Very Close)", "#f97316", 8.0, "1-3 meters away. Search immediate surrounding compartments or vehicle bumper."),
        WARM("WARM (Approaching)", "#f59e0b", 3.0, "Signal intensifying. Keep walking in this direction."),
        COLD("COLD (In Range)", "#38bdf8", 1.0, "Weak beacon. Walk around the perimeter to find signal gradient."),
        FREEZING("FREEZING (Faint Signal)", "#818cf8", 0.3, "Edge of Bluetooth range (>15m).")
    }

    fun onNewRssiMeasurement(rawRssi: Int) {
        currentFilteredRssi = kalman.update(rawRssi.toDouble())
        
        // Log-distance path loss formula: d = 10 ^ ((TxPower - RSSI) / (10 * n))
        val exponent = (txPower - currentFilteredRssi) / (10.0 * 2.2)
        val rawDist = 10.0.pow(exponent)
        estimatedDistanceM = (rawDist.coerceIn(0.2, 45.0) * 10).roundToInt() / 10.0

        currentZone = when {
            estimatedDistanceM < 1.0 -> ProximityZone.BURNING_HOT
            estimatedDistanceM < 3.0 -> ProximityZone.HOT
            estimatedDistanceM < 8.0 -> ProximityZone.WARM
            estimatedDistanceM < 15.0 -> ProximityZone.COLD
            else -> ProximityZone.FREEZING
        }
    }

    fun startGeigerAudioFeedback() {
        if (geigerActive) return
        geigerActive = true

        geigerThread = thread(start = true) {
            val sampleRate = 8000
            val clickDurationMs = 15
            val numSamples = (sampleRate * (clickDurationMs / 1000.0)).toInt()
            val clickPcm = ShortArray(numSamples) { i ->
                // 1.8 kHz sine burst
                (Short.MAX_VALUE * 0.4 * kotlin.math.sin(2.0 * Math.PI * 1800.0 * i / sampleRate)).toInt().toShort()
            }

            val audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(clickPcm.size * 2)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            audioTrack.play()

            while (geigerActive) {
                audioTrack.write(clickPcm, 0, clickPcm.size)
                val delayMs = (1000.0 / currentZone.clickRateHz).toLong().coerceIn(40L, 3000L)
                try {
                    Thread.sleep(delayMs)
                } catch (e: InterruptedException) {
                    break
                }
            }

            audioTrack.stop()
            audioTrack.release()
        }
    }

    fun stopGeigerAudioFeedback() {
        geigerActive = false
        geigerThread?.interrupt()
        geigerThread = null
    }
}
