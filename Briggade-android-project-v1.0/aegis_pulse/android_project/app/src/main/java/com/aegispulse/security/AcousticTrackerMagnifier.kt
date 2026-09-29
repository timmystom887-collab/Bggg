package com.aegispulse.security

import android.annotation.SuppressLint
import android.content.Context
import android.media.*
import android.os.Build
import android.util.Log
import kotlin.concurrent.thread
import kotlin.math.cos
import kotlin.math.sin

class AcousticTrackerMagnifier(private val context: Context) {

    companion object {
        const val TAG = "AcousticMagnifier"
        const val SAMPLE_RATE = 44100
        const val CENTER_FREQ = 3800.0  // Center of AirTag acoustic chime band (3.2 - 4.4 kHz)
        const val BANDWIDTH = 800.0     // Passband width
        const val GAIN_BOOST = 6.0f      // +15.5 dB linear multiplier
    }

    private var isMagnifying = false
    private var workerThread: Thread? = null

    // Biquad filter state variables
    private var x1 = 0f
    private var x2 = 0f
    private var y1 = 0f
    private var y2 = 0f

    // Coefficients
    private var b0 = 0f
    private var b1 = 0f
    private var b2 = 0f
    private var a1 = 0f
    private var a2 = 0f

    init {
        calculateBiquadCoefficients()
    }

    private fun calculateBiquadCoefficients() {
        val w0 = 2.0 * Math.PI * CENTER_FREQ / SAMPLE_RATE
        val q = CENTER_FREQ / BANDWIDTH
        val alpha = sin(w0) / (2.0 * q)

        val b0Raw = alpha
        val b1Raw = 0.0
        val b2Raw = -alpha
        val a0Raw = 1.0 + alpha
        val a1Raw = -2.0 * cos(w0)
        val a2Raw = 1.0 - alpha

        b0 = (b0Raw / a0Raw).toFloat()
        b1 = (b1Raw / a0Raw).toFloat()
        b2 = (b2Raw / a0Raw).toFloat()
        a1 = (a1Raw / a0Raw).toFloat()
        a2 = (a2Raw / a0Raw).toFloat()
    }

    @SuppressLint("MissingPermission")
    fun startAcousticMagnification() {
        if (isMagnifying) return
        isMagnifying = true

        workerThread = thread(start = true, name = "AcousticMagnifierThread") {
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

            // Route preferentially to Bluetooth Headphones if available
            routeToBluetoothHeadphones(audioTrack)

            try {
                audioRecord.startRecording()
                audioTrack.play()

                val audioBuffer = ShortArray(bufferSize / 2)

                while (isMagnifying) {
                    val readSamples = audioRecord.read(audioBuffer, 0, audioBuffer.size)
                    if (readSamples > 0) {
                        for (i in 0 until readSamples) {
                            val inSample = audioBuffer[i].toFloat() / 32768f

                            // Apply 2nd order biquad bandpass filter
                            val outSample = b0 * inSample + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
                            x2 = x1
                            x1 = inSample
                            y2 = y1
                            y1 = outSample

                            // Dynamic Range Amplification with soft clipping
                            val amplified = (outSample * GAIN_BOOST).coerceIn(-0.95f, 0.95f)
                            audioBuffer[i] = (amplified * 32767f).toInt().toShort()
                        }
                        audioTrack.write(audioBuffer, 0, readSamples)
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
                    Log.e(TAG, "Audio cleanup error", e)
                }
            }
        }
    }

    private fun routeToBluetoothHeadphones(audioTrack: AudioTrack) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            val btDevice = devices.firstOrNull {
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
            }
            if (btDevice != null) {
                audioTrack.preferredDevice = btDevice
                Log.i(TAG, "Routed acoustic magnification to Bluetooth: ${btDevice.productName}")
            }
        }
    }

    fun stopAcousticMagnification() {
        isMagnifying = false
        workerThread?.interrupt()
        workerThread = null
    }
}
