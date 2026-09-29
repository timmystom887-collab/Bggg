package com.aegispulse.security

import android.content.Context
import android.util.Log
import java.security.MessageDigest

/**
 * Stealth Calculator Disguise HUD & Duress Manager
 * Protects user under coercion with Master & Duress PINs.
 */
class StealthCalculatorActivity(private val context: Context) {

    companion object {
        private const val MASTER_PIN_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918" // "admin" / 1337
        private const val DURESS_PIN_HASH = "4602f23b6b15efb5853b0e35f52ea2bf03d6d634d9a5b6f3cf0249c5e3152d5b" // 9999
    }

    enum class PinResult {
        UNVEIL_AEGIS,
        TRIGGER_DURESS_SILENT_SOS,
        STANDARD_MATH
    }

    fun verifyPin(pin: String): PinResult {
        val hash = sha256(pin)
        return when {
            pin == "1337" || hash == MASTER_PIN_HASH -> PinResult.UNVEIL_AEGIS
            pin == "9999" || hash == DURESS_PIN_HASH -> {
                Log.w("StealthCalc", "DURESS PIN ENTERED: Dispatching silent emergency SOS")
                PinResult.TRIGGER_DURESS_SILENT_SOS
            }
            else -> PinResult.STANDARD_MATH
        }
    }

    private fun sha256(input: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        return md.digest(input.toByteArray()).joinToString("") { "%02x".format(it) }
    }
}
