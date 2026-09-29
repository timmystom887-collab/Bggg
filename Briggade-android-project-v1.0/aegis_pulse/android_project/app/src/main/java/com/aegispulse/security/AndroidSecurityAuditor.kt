package com.aegispulse.security

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import java.io.File

class AndroidSecurityAuditor(private val context: Context) {

    data class AppSecurityReport(
        val packageName: String,
        val appName: String,
        val requestedPermissions: List<String>,
        val toxicSynergies: List<String>,
        val threatScore: Int,
        val isSideloaded: Boolean
    )

    data class DevicePostureReport(
        val postureScore: Int,
        val isRooted: Boolean,
        val selinuxMode: String,
        val isAdbEnabled: Boolean,
        val isUnknownSourcesEnabled: Boolean,
        val patchLevel: String,
        val issues: List<String>
    )

    fun auditDevicePosture(): DevicePostureReport {
        var score = 100
        val issues = mutableListOf<String>()

        val isRooted = checkRootBinaries()
        if (isRooted) {
            score -= 35
            issues.add("CRITICAL: Root binary (su) detected. Android sandbox integrity is compromised.")
        }

        val selinuxMode = getSELinuxMode()
        if (selinuxMode != "Enforcing") {
            score -= 25
            issues.add("CRITICAL: SELinux is $selinuxMode. Mandatory Access Control is bypassed.")
        }

        val isAdb = Settings.Global.getInt(context.contentResolver, Settings.Global.ADB_ENABLED, 0) == 1
        if (isAdb) {
            score -= 15
            issues.add("WARNING: USB / Wireless Debugging (ADB) is enabled.")
        }

        val isUnknown = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            Settings.Secure.getInt(context.contentResolver, Settings.Secure.INSTALL_NON_MARKET_APPS, 0) == 1
        }
        if (isUnknown) {
            score -= 15
            issues.add("WARNING: Unknown sources sideloading is allowed.")
        }

        val patch = Build.VERSION.SECURITY_PATCH ?: "Unknown"

        return DevicePostureReport(
            postureScore = score.coerceIn(10, 100),
            isRooted = isRooted,
            selinuxMode = selinuxMode,
            isAdbEnabled = isAdb,
            isUnknownSourcesEnabled = isUnknown,
            patchLevel = patch,
            issues = issues
        )
    }

    fun auditInstalledApps(): List<AppSecurityReport> {
        val pm = context.packageManager
        val packages = pm.getInstalledPackages(PackageManager.GET_PERMISSIONS)
        val reports = mutableListOf<AppSecurityReport>()

        for (pkg in packages) {
            val perms = pkg.requestedPermissions?.toList() ?: emptyList()
            val synergies = mutableListOf<String>()
            var score = 10

            val isAccessibility = "android.permission.BIND_ACCESSIBILITY_SERVICE" in perms
            val isOverlay = "android.permission.SYSTEM_ALERT_WINDOW" in perms
            val isSms = "android.permission.RECEIVE_SMS" in perms || "android.permission.READ_SMS" in perms
            val isBgLoc = "android.permission.ACCESS_BACKGROUND_LOCATION" in perms
            val isMic = "android.permission.RECORD_AUDIO" in perms

            // BankBot Profile
            if (isAccessibility && isOverlay && isSms) {
                synergies.add("🚨 Banking Trojan (BankBot) Pattern: Accessibility Keylogger + Overlay Phish + SMS 2FA theft")
                score = 95
            } else if (isAccessibility && isOverlay) {
                synergies.add("⚠️ Overlay RAT Pattern: Draw over other apps + Accessibility tap simulation")
                score = 88
            }

            // Stalkerware Profile
            if (isBgLoc && isMic) {
                synergies.add("🚨 Stalkerware Surveillance Pattern: 24/7 Background Geolocation + Ambient Audio Eavesdropping")
                score = 90
            }

            if (score > 40) {
                reports.add(
                    AppSecurityReport(
                        packageName = pkg.packageName,
                        appName = pm.getApplicationLabel(pkg.applicationInfo).toString(),
                        requestedPermissions = perms,
                        toxicSynergies = synergies,
                        threatScore = score,
                        isSideloaded = pm.getInstallerPackageName(pkg.packageName) == null
                    )
                )
            }
        }
        return reports.sortedByDescending { it.threatScore }
    }

    private fun checkRootBinaries(): Boolean {
        val paths = arrayOf(
            "/system/bin/su",
            "/system/xbin/su",
            "/sbin/su",
            "/system/su",
            "/system/bin/.ext/.su",
            "/vendor/bin/su"
        )
        return paths.any { File(it).exists() }
    }

    private fun getSELinuxMode(): String {
        return try {
            val file = File("/sys/fs/selinux/enforce")
            if (file.exists() && file.readText().trim() == "1") "Enforcing" else "Permissive"
        } catch (e: Exception) {
            "Enforcing"
        }
    }
}
