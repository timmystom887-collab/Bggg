package com.aegispulse.security

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class ScamShieldReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            for (sms in messages) {
                val sender = sms.displayOriginatingAddress ?: "Unknown"
                val body = sms.displayMessageBody ?: ""
                analyzeIncomingSms(context, sender, body)
            }
        }
    }

    private fun analyzeIncomingSms(context: Context, sender: String, body: String) {
        val lower = body.lowercase()
        var scamScore = 0
        var category = "Suspicious Message"

        if ("usps" in lower || "package" in lower || "parcel" in lower && ("address" in lower || "warehouse" in lower || "redelivery" in lower)) {
            category = "USPS Package Delivery Smishing"
            scamScore = 88
        } else if ("toll" in lower || "sunpass" in lower || "ezpass" in lower && ("unpaid" in lower || "license" in lower || "penalty" in lower)) {
            category = "Unpaid Highway Toll Scam"
            scamScore = 92
        } else if ("chase" in lower || "bank" in lower || "unauthorized" in lower && ("locked" in lower || "verify" in lower)) {
            category = "Bank Impersonation Phishing"
            scamScore = 90
        }

        if (scamScore >= 75) {
            val notification = NotificationCompat.Builder(context, BleBackgroundScanService.CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("🛑 FRAUD SHIELD: $category BLOCKED")
                .setContentText("From $sender: DO NOT click links or reply.")
                .setStyle(NotificationCompat.BigTextStyle().bigText("Scam text detected from $sender:\n\"$body\"\n\nCountermeasure: Forward to 7726 (SPAM) and delete."))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()

            try {
                NotificationManagerCompat.from(context).notify(sender.hashCode(), notification)
            } catch (e: SecurityException) {
                Log.e("ScamShield", "Missing notification permission", e)
            }
        }
    }
}
