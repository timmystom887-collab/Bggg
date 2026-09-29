package com.aegispulse.security

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import kotlin.math.sqrt

/**
 * Haven Physical Room & Asset Intrusion Sentinel
 * Monitors ambient light (lux) and 3-axis accelerometer vibration
 * to detect unauthorized hotel room entry and laptop/bag tampering.
 */
class HavenIntrusionSentinel(private val context: Context) : SensorEventListener {

    companion object {
        private const val TAG = "HavenSentinel"
    }

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
    private val accelSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    var isArmed = false
        private set

    private var baselineLux = 10f
    private var lightThresholdDelta = 15f
    private var vibrationThresholdG = 1.25f

    interface IntrusionCallback {
        fun onIntrusionDetected(severity: String, triggers: List<String>, lux: Float, accelG: Float)
    }

    private var callback: IntrusionCallback? = null

    fun armSentinel(listener: IntrusionCallback) {
        callback = listener
        isArmed = true
        lightSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
        accelSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }
        Log.i(TAG, "Haven Physical Room Sentinel ARMED")
    }

    fun disarmSentinel() {
        if (isArmed) {
            sensorManager.unregisterListener(this)
            isArmed = false
            Log.i(TAG, "Haven Physical Room Sentinel DISARMED")
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (!isArmed || event == null) return

        when (event.sensor.type) {
            Sensor.TYPE_LIGHT -> {
                val currentLux = event.values[0]
                if (currentLux - baselineLux > lightThresholdDelta) {
                    callback?.onIntrusionDetected("CRITICAL_INTRUSION", listOf("LIGHT_SPIKE (+${currentLux - baselineLux} lux)"), currentLux, 0f)
                }
            }
            Sensor.TYPE_ACCELEROMETER -> {
                val ax = event.values[0]
                val ay = event.values[1]
                val az = event.values[2]
                val gMag = sqrt((ax * ax + ay * ay + az * az).toDouble()).toFloat() / SensorManager.GRAVITY_EARTH
                if (gMag > vibrationThresholdG) {
                    callback?.onIntrusionDetected("ELEVATED_VIBRATION", listOf("ACCELEROMETER_VIBRATION (${gMag}g)"), baselineLux, gMag)
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
}
