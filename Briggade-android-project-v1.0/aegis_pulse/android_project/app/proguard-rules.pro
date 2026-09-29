# AegisPulse Proguard / R8 Configuration

# Preserve Android components
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# Keep all AegisPulse Security & Hardware Engine classes
-keep class com.aegispulse.security.** { *; }

# Keep native methods & reflection
-keepclasseswithmembernames class * {
    native <methods>;
}

# AndroidX & Material
-keep class androidx.** { *; }
-dontwarn androidx.**
-keep class com.google.android.material.** { *; }
-dontwarn com.google.android.material.**

# Kotlin Coroutines & Attributes
-keepattributes *Annotation*,InnerClasses,Signature,EnclosingMethod,SourceFile,LineNumberTable
-dontwarn kotlin.**

# WebView Javascript Interface (if any)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
