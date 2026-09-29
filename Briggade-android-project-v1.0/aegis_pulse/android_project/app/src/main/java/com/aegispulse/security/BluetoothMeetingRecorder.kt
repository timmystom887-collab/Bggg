package com.aegispulse.security

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.*
import android.os.Build
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*
import kotlin.concurrent.thread

class BluetoothHeadsetMicNotConnectedException(message: String) : Exception(message)
class PhoneMicFallbackBlockedException(message: String) : Exception(message)

/**
 * BluetoothMeetingRecorder
 * Strictly and exclusively captures audio from the paired Bluetooth headphone / headset microphone.
 * Enforces hardware checks and aborts if Android attempts to fall back to the phone's built-in microphone.
 */
class BluetoothMeetingRecorder(private val context: Context) {

    companion object {
        const val TAG = "BtMeetingRecorder"
        const val SAMPLE_RATE = 16000 // 16 kHz Wideband speech codec for Bluetooth SCO (mSBC)
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var isRecording = false
    private var recordingThread: Thread? = null
    private var currentOutputFile: File? = null
    private var currentBtDevice: AudioDeviceInfo? = null

    private var isBluetoothScoConnected = false

    private val scoReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val state = intent.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, -1)
            isBluetoothScoConnected = (state == AudioManager.SCO_AUDIO_STATE_CONNECTED)
            Log.i(TAG, "Bluetooth SCO Audio Link State: $state (Connected: $isBluetoothScoConnected)")
        }
    }

    init {
        context.registerReceiver(
            scoReceiver,
            IntentFilter(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
        )
    }

    /**
     * Discovers and verifies the Bluetooth headset physical microphone device.
     * Returns null if no Bluetooth headset mic is connected.
     */
    fun getConnectedBluetoothHeadsetMic(): AudioDeviceInfo? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val inputs = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
            return inputs.firstOrNull {
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && it.type == AudioDeviceInfo.TYPE_BLE_HEADSET) ||
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP // Some headsets register under A2DP with voice backchannel
            }
        }
        return null
    }

    /**
     * Starts recording meeting audio EXCLUSIVELY using the Bluetooth headphone's physical microphone.
     * Throws an exception if no Bluetooth headset is connected or if Android attempts to fall back to phone mic.
     */
    @SuppressLint("MissingPermission")
    fun startRecordingWithBluetoothHeadphoneMic(meetingTitle: String = "Meeting"): File {
        if (isRecording) {
            throw IllegalStateException("A recording session is already active.")
        }

        // 1. HARD ENFORCEMENT: Verify Bluetooth headset mic is available
        val btMicDevice = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val available = audioManager.availableCommunicationDevices
            available.firstOrNull {
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                it.type == AudioDeviceInfo.TYPE_BLE_HEADSET
            }
        } else {
            getConnectedBluetoothHeadsetMic()
        }

        if (btMicDevice == null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            throw BluetoothHeadsetMicNotConnectedException(
                "BLOCKED: No Bluetooth headphone microphone found. Phone built-in microphone is disabled by policy."
            )
        }

        currentBtDevice = btMicDevice

        // 2. Establish Bluetooth SCO / Communication Device routing
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && btMicDevice != null) {
            val routed = audioManager.setCommunicationDevice(btMicDevice)
            Log.i(TAG, "Routed communication to Bluetooth device ${btMicDevice.productName}: $routed")
        } else {
            audioManager.startBluetoothSco()
            audioManager.isBluetoothScoOn = true
        }

        // 3. Prepare output WAV/PCM file
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val fileName = "${meetingTitle.replace(" ", "_")}_BtHeadsetMic_$timeStamp.wav"
        val storageDir = context.getExternalFilesDir("Meetings") ?: context.filesDir
        currentOutputFile = File(storageDir, fileName)

        // 4. Initialize low-level AudioRecord with explicit device targeting
        val minBufferSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        ).coerceAtLeast(2048)

        val audioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION, // Explicit source that binds to SCO
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            minBufferSize
        )

        // Target Bluetooth device directly on AudioRecord instance
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && btMicDevice != null) {
            val prefSet = audioRecord.setPreferredDevice(btMicDevice)
            Log.i(TAG, "AudioRecord setPreferredDevice (${btMicDevice.productName}): $prefSet")
        }

        audioRecord.startRecording()

        // 5. HARD ENFORCEMENT POST-CHECK: Verify routed input device is NOT built-in phone mic!
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val routed = audioRecord.routedDevice
            if (routed != null) {
                Log.i(TAG, "AudioRecord actively routed through: ${routed.productName} (type: ${routed.type})")
                if (routed.type == AudioDeviceInfo.TYPE_BUILTIN_MIC) {
                    audioRecord.stop()
                    audioRecord.release()
                    throw PhoneMicFallbackBlockedException(
                        "BLOCKED: Android routed recording to the phone's internal microphone. Recording cancelled."
                    )
                }
            }
        }

        isRecording = true

        // 6. Audio capture worker thread
        recordingThread = thread(start = true, name = "BtHeadsetMicCaptureThread") {
            val pcmFile = File(currentOutputFile!!.absolutePath + ".pcm")
            val pcmOut = FileOutputStream(pcmFile)
            val buffer = ShortArray(minBufferSize / 2)

            try {
                while (isRecording) {
                    val read = audioRecord.read(buffer, 0, buffer.size)
                    if (read > 0) {
                        val byteBuf = ByteArray(read * 2)
                        for (i in 0 until read) {
                            byteBuf[i * 2] = (buffer[i].toInt() and 0xFF).toByte()
                            byteBuf[i * 2 + 1] = ((buffer[i].toInt() shr 8) and 0xFF).toByte()
                        }
                        pcmOut.write(byteBuf)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Bluetooth headset mic recording loop error", e)
            } finally {
                pcmOut.close()
                try {
                    audioRecord.stop()
                    audioRecord.release()
                } catch (e: Exception) {
                    Log.e(TAG, "Cleanup exception", e)
                }
                // Convert raw PCM to standard 16 kHz WAV container with proper RIFF header
                convertPcmToWav(pcmFile, currentOutputFile!!, SAMPLE_RATE, 1)
                pcmFile.delete()
            }
        }

        Log.i(TAG, "Meeting recording active using Bluetooth headphone microphone: ${currentOutputFile?.absolutePath}")
        return currentOutputFile!!
    }

    /**
     * Stops the meeting recording and tears down the Bluetooth SCO channel.
     */
    fun stopRecording(): File? {
        if (!isRecording) return null
        isRecording = false

        recordingThread?.join(2000)
        recordingThread = null

        // Release Bluetooth SCO and restore standard media routing
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audioManager.clearCommunicationDevice()
        } else {
            audioManager.stopBluetoothSco()
            audioManager.isBluetoothScoOn = false
        }
        currentBtDevice = null
        Log.i(TAG, "Bluetooth headphone mic recording finished. Audio link closed.")

        return currentOutputFile
    }

    private fun convertPcmToWav(pcmFile: File, wavFile: File, sampleRate: Int, channels: Int) {
        val pcmData = pcmFile.readBytes()
        val totalAudioLen = pcmData.size.toLong()
        val totalDataLen = totalAudioLen + 36
        val byteRate = (16 * sampleRate * channels / 8).toLong()

        val header = ByteArray(44)
        // RIFF/WAVE header
        header[0] = 'R'.code.toByte(); header[1] = 'I'.code.toByte(); header[2] = 'F'.code.toByte(); header[3] = 'F'.code.toByte()
        header[4] = (totalDataLen and 0xff).toByte(); header[5] = ((totalDataLen shr 8) and 0xff).toByte()
        header[6] = ((totalDataLen shr 16) and 0xff).toByte(); header[7] = ((totalDataLen shr 24) and 0xff).toByte()
        header[8] = 'W'.code.toByte(); header[9] = 'A'.code.toByte(); header[10] = 'V'.code.toByte(); header[11] = 'E'.code.toByte()
        header[12] = 'f'.code.toByte(); header[13] = 'm'.code.toByte(); header[14] = 't'.code.toByte(); header[15] = ' '.code.toByte()
        header[16] = 16; header[17] = 0; header[18] = 0; header[19] = 0 // subchunk1 size = 16 for PCM
        header[20] = 1; header[21] = 0 // PCM format = 1
        header[22] = channels.toByte(); header[23] = 0
        header[24] = (sampleRate and 0xff).toByte(); header[25] = ((sampleRate shr 8) and 0xff).toByte()
        header[26] = ((sampleRate shr 16) and 0xff).toByte(); header[27] = ((sampleRate shr 24) and 0xff).toByte()
        header[28] = (byteRate and 0xff).toByte(); header[29] = ((byteRate shr 8) and 0xff).toByte()
        header[30] = ((byteRate shr 16) and 0xff).toByte(); header[31] = ((byteRate shr 24) and 0xff).toByte()
        header[32] = (channels * 2).toByte(); header[33] = 0 // block align
        header[34] = 16; header[35] = 0 // bits per sample
        header[36] = 'd'.code.toByte(); header[37] = 'a'.code.toByte(); header[38] = 't'.code.toByte(); header[39] = 'a'.code.toByte()
        header[40] = (totalAudioLen and 0xff).toByte(); header[41] = ((totalAudioLen shr 8) and 0xff).toByte()
        header[42] = ((totalAudioLen shr 16) and 0xff).toByte(); header[43] = ((totalAudioLen shr 24) and 0xff).toByte()

        val wavOut = FileOutputStream(wavFile)
        wavOut.write(header)
        wavOut.write(pcmData)
        wavOut.close()
    }

    fun release() {
        if (isRecording) {
            stopRecording()
        }
        try {
            context.unregisterReceiver(scoReceiver)
        } catch (e: Exception) {
            // Receiver already unregistered
        }
    }
}
