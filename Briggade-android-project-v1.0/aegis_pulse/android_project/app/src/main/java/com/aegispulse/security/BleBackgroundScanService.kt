package com.aegispulse.security

import android.app.*
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.pow
import kotlin.math.roundToInt

class BleBackgroundScanService : Service() {

    companion object {
        const val TAG = "BleBgScanService"
        const val CHANNEL_ID = "aegis_tracker_alerts"
        const val NOTIFICATION_ID = 1001

        const val COMPANY_APPLE = 0x004C
        const val COMPANY_SAMSUNG = 0x0075
        const val COMPANY_TILE = 0xFEED
        const val COMPANY_GOOGLE = 0x00E0
    }

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bleScanner: BluetoothLeScanner? = null
    private val activeTrackers = ConcurrentHashMap<String, TrackedBLEDevice>()

    data class TrackedBLEDevice(
        val macAddress: String,
        val deviceType: String,
        var lastRssi: Int,
        var isSeparated: Boolean,
        var firstSeenTime: Long,
        var lastSeenTime: Long,
        var sightingCount: Int = 1,
        val waypoints: MutableList<Waypoint> = mutableListOf(),
        var isWhitelisted: Boolean = false
    )

    data class Waypoint(
        val timestamp: Long,
        val rssi: Int,
        val lat: Double,
        val lon: Double,
        val speedMph: Double = 0.0
    )

    override fun onCreate() {
        super.onCreate()
        BleTrackerStore.isRunning = true
        createNotificationChannel()
        try {
            startForeground(NOTIFICATION_ID, buildForegroundNotification("AegisPulse Background Scan Active", "Monitoring for unknown location trackers..."))
        } catch (failure: Throwable) {
            Log.e(TAG, "Foreground BLE service could not start", failure)
            BleTrackerStore.isRunning = false
            stopSelf()
            return
        }

        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
        bleScanner = bluetoothAdapter?.bluetoothLeScanner

        startPassiveScan()
    }

    private fun startPassiveScan() {
        if (bluetoothAdapter?.isEnabled != true || bleScanner == null) {
            Log.w(TAG, "Bluetooth not ready for background scan")
            return
        }

        val filters = listOf(
            ScanFilter.Builder().setManufacturerData(COMPANY_APPLE, byteArrayOf()).build(),
            ScanFilter.Builder().setManufacturerData(COMPANY_SAMSUNG, byteArrayOf()).build(),
            ScanFilter.Builder().setManufacturerData(COMPANY_TILE, byteArrayOf()).build(),
            ScanFilter.Builder().setManufacturerData(COMPANY_GOOGLE, byteArrayOf()).build()
        )

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_POWER)
            .setReportDelay(0)
            .build()

        try {
            bleScanner?.startScan(filters, settings, scanCallback)
            Log.i(TAG, "BLE passive anti-tracking scan initiated successfully")
        } catch (e: SecurityException) {
            Log.e(TAG, "Missing BLUETOOTH_SCAN permission", e)
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result?.let { processScanResult(it) }
        }

        override fun onBatchScanResults(results: MutableList<ScanResult>?) {
            results?.forEach { processScanResult(it) }
        }

        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "BLE Scan failed with code: $errorCode")
        }
    }

    private fun processScanResult(result: ScanResult) {
        val record = result.scanRecord ?: return
        val mac = result.device.address
        val rssi = result.rssi
        val now = System.currentTimeMillis()

        var isSeparated = false
        var deviceType = "Generic BLE Tracker"

        // 1. Apple AirTag / Find My (Company ID 0x004c)
        val appleBytes = record.getManufacturerSpecificData(COMPANY_APPLE)
        if (appleBytes != null && appleBytes.size >= 3) {
            if (appleBytes[0] == 0x12.toByte() && appleBytes[1] == 0x19.toByte()) {
                deviceType = "Apple AirTag"
                val statusByte = appleBytes[2].toInt()
                isSeparated = (statusByte and 0x04) != 0 // Bit 2 = Separated from Owner
            } else if (appleBytes[0] == 0x07.toByte()) {
                deviceType = "Apple AirPods"
                isSeparated = true
            }
        }

        // 2. Samsung SmartTag (0x0075)
        val samsungBytes = record.getManufacturerSpecificData(COMPANY_SAMSUNG)
        if (samsungBytes != null) {
            deviceType = "Samsung Galaxy SmartTag"
            if (samsungBytes.size > 2) {
                isSeparated = (samsungBytes[2].toInt() and 0x01) != 0
            }
        }

        // 3. Tile Tracker (0xFEED)
        val tileBytes = record.getManufacturerSpecificData(COMPANY_TILE)
        if (tileBytes != null) {
            deviceType = "Tile Tracker"
            isSeparated = true
        }

        // Update tracking history
        val tracker = activeTrackers.getOrPut(mac) {
            TrackedBLEDevice(
                macAddress = mac,
                deviceType = deviceType,
                lastRssi = rssi,
                isSeparated = isSeparated,
                firstSeenTime = now,
                lastSeenTime = now
            )
        }

        tracker.lastRssi = rssi
        tracker.lastSeenTime = now
        tracker.sightingCount++
        tracker.isSeparated = isSeparated
        BleTrackerStore.update(
            deviceId = mac,
            macAddress = mac,
            deviceType = tracker.deviceType,
            rssi = tracker.lastRssi,
            separated = tracker.isSeparated,
            firstSeen = tracker.firstSeenTime,
            lastSeen = tracker.lastSeenTime,
            sightings = tracker.sightingCount
        )

        // Check DULT Stalking Trigger Criteria
        val trackingDurationMins = (now - tracker.firstSeenTime) / 60000
        val isStalkingAlert = !tracker.isWhitelisted && tracker.isSeparated && (trackingDurationMins >= 15 || tracker.waypoints.size >= 2)

        if (isStalkingAlert) {
            triggerStalkingNotification(tracker)
        }
    }

    private fun triggerStalkingNotification(tracker: TrackedBLEDevice) {
        val distanceM = estimateDistance(tracker.lastRssi, -59)
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("🚨 UNWANTED TRACKER DETECTED!")
            .setContentText("${tracker.deviceType} (${tracker.macAddress}) moving with you (~${distanceM}m away).")
            .setStyle(NotificationCompat.BigTextStyle().bigText(
                "An unregistered ${tracker.deviceType} separated from its owner has traveled with you for over 15 minutes. " +
                "Tap to launch AegisPulse Acoustic Locator and view physical hiding spot inspection guidance."
            ))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(tracker.macAddress.hashCode(), notification)
    }

    private fun estimateDistance(rssi: Int, txPower: Int): Double {
        val ratio = (txPower - rssi) / (10.0 * 2.2)
        return (10.0.pow(ratio) * 10).roundToInt() / 10.0
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(CHANNEL_ID, "AegisPulse Anti-Tracking Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Critical alerts when an unregistered tracker is detected following the user"
                enableVibration(true)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(chan)
        }
    }

    private fun buildForegroundNotification(title: String, text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_secure)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        BleTrackerStore.isRunning = false
        try {
            bleScanner?.stopScan(scanCallback)
        } catch (e: SecurityException) {
            Log.e(TAG, "Failed to stop BLE scan", e)
        }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
