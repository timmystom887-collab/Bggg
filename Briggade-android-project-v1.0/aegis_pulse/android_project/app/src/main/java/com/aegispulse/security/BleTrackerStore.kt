package com.aegispulse.security

import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.pow

object BleTrackerStore {
    data class Snapshot(
        val deviceId: String,
        val macAddress: String,
        val deviceType: String,
        var rssi: Int,
        var separated: Boolean,
        val firstSeen: Long,
        var lastSeen: Long,
        var sightings: Int
    )

    private val trackers = ConcurrentHashMap<String, Snapshot>()
    @Volatile var isRunning: Boolean = false

    fun update(deviceId: String, macAddress: String, deviceType: String, rssi: Int, separated: Boolean, firstSeen: Long, lastSeen: Long, sightings: Int) {
        trackers[deviceId] = Snapshot(deviceId, macAddress, deviceType, rssi, separated, firstSeen, lastSeen, sightings)
    }

    fun clear() = trackers.clear()

    fun asJson(): JSONArray = JSONArray().apply {
        trackers.values.sortedByDescending { it.lastSeen }.forEach { t ->
            val distance = (10.0.pow(((-59 - t.rssi) / (10.0 * 2.2))) * 10).coerceAtLeast(0.1).let { kotlin.math.round(it) / 10.0 }
            put(JSONObject()
                .put("device_id", t.deviceId)
                .put("mac_address", t.macAddress)
                .put("device_type", t.deviceType)
                .put("current_rssi", t.rssi)
                .put("estimated_distance_m", distance)
                .put("signal_percent", ((t.rssi + 100) * 2).coerceIn(0, 100))
                .put("is_separated", t.separated)
                .put("is_alert_triggered", t.separated && t.sightings >= 30)
                .put("distinct_locations_count", 1)
                .put("sighting_count", t.sightings)
                .put("battery_status", "Unknown")
                .put("transport_mode", "BLE proximity")
                .put("waypoints", JSONArray()))
        }
    }
}
