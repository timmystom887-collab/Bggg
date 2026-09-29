# Android APK Build & GitHub Actions CI/CD Guide

This repository includes a production-grade, failure-proof GitHub Actions workflow (`.github/workflows/build-apk.yml`) to automatically compile, verify, and package the **Briggade (Street & Constitutional Shield)** Android application into installable APKs (`.apk`).

---

## 🚀 How to Run the Build

### Option 1: Automatic Trigger via Git Tag (Releases)
Push a semantic version tag (e.g. `v1.0.5`):
```bash
git tag v1.0.5
git push origin v1.0.5
```
GitHub Actions will automatically:
1. Build the modern web application.
2. Synchronize all assets into the Android project.
3. Build both **Release** and **Debug** APKs.
4. Generate cryptographic SHA-256 checksums.
5. Create a **GitHub Release** with the APKs attached for one-click download.

### Option 2: Manual Trigger via GitHub Actions UI
1. Go to your repository on GitHub.
2. Click on the **Actions** tab.
3. Select **Build Android APK (Release & Debug)** in the left sidebar.
4. Click **Run workflow**:
   - Choose target: `both`, `release`, or `debug`.
   - Optionally check `Publish GitHub Release`.
5. When complete, download the APKs directly from the **Artifacts** section at the bottom of the run page.

---

## 🛡️ Top 10 Predicted Issues & How They Are Preemptively Fixed

| # | Known Issue | Root Cause | Preemptive Fix Implemented |
|---|---|---|---|
| **1** | **Nested Path Error** | Android project is nested in `Briggade-android-project-v1.0/aegis_pulse/android_project`, not at repo root. Running `./gradlew` from root fails. | Workflow sets `ANDROID_PROJECT_DIR` and explicitly executes commands in the correct working directory. Root-level `build_apk.sh` also handles path resolution. |
| **2** | **Permission Denied on `gradlew`** | Git repositories committed on Windows or non-POSIX file systems lose the executable bit (`-rw-r--r--`). Linux runners fail with `bash: ./gradlew: Permission denied`. | Fixed permission in repository via `chmod +x` AND added explicit `chmod +x "$ANDROID_PROJECT_DIR/gradlew"` step in the CI workflow. |
| **3** | **Java Version Incompatibility** | Android Gradle Plugin (AGP) 8.4 requires **Java 17**. Runners defaulting to Java 11 or 21 throw build errors. | Configured `actions/setup-java@v4` with `distribution: 'temurin'` and `java-version: '17'`. |
| **4** | **Stale or Missing Web Assets** | Android app is a hybrid WebView app (`app/src/main/assets/www`). Building the APK without building web code packages an empty or outdated screen. | Automated CI step builds Vite production bundle (`npm run build`) and copies `index.html`, `app.js`, `style.css`, and mascot artwork to `assets/www` before Gradle runs. |
| **5** | **Android SDK License Rejection** | Headless CI environments fail on SDK updates with `License not accepted`. | Workflow includes `android-actions/setup-android@v3` and executes `yes \| sdkmanager --licenses` automatically. |
| **6** | **Gradle Out-Of-Memory (OOM / Exit 137)** | GitHub free runners have 7GB RAM. Multi-worker Gradle daemons can crash the runner with Linux OOM killer. | Configured `gradle.properties` with `-Xmx2048m -XX:MaxMetaspaceSize=512m` and passed `--no-daemon --max-workers=2`. |
| **7** | **Broken Release Signing** | `assembleRelease` crashes on CI if release keystore secrets are missing. | `app/build.gradle.kts` implements a **fail-safe fallback**: if no keystore file is provided, it automatically signs with the debug key so `assembleRelease` ALWAYS outputs a working, installable APK. |
| **8** | **Artifact Upload Glob Failures** | Hardcoded file paths fail when Gradle outputs files with different names (`app-release-unsigned.apk`, etc.). | Workflow discovers all generated `.apk` files, copies them to `build-artifacts/Briggade-v1.0.5-*.apk`, and validates presence before upload. |
| **9** | **Tamper Verification** | End users need cryptographic verification that APKs have not been corrupted during download. | Automatically computes SHA-256 hashes (`sha256sum *.apk > checksums.sha256.txt`) and packages them alongside the APKs. |
| **10** | **Release Publishing Overhead** | Developers must manually create GitHub releases and drag-and-drop APK files. | Integrated `softprops/action-gh-release@v2` to publish tagged releases and attach APKs with automated changelogs. |

---

## 🔑 Optional: Custom Release Keystore Setup

If you want your release APK signed with your personal keystore (rather than the automated debug fallback):

1. Encode your `.jks` or `.keystore` file to Base64:
   ```bash
   base64 -w 0 my-release-key.jks > keystore_base64.txt
   ```
2. In GitHub, go to **Settings > Secrets and variables > Actions > New repository secret**.
3. Add the following secrets:
   - `SIGNING_KEYSTORE_BASE64`: Paste the content of `keystore_base64.txt`
   - `KEYSTORE_PASSWORD`: Keystore password
   - `KEY_ALIAS`: Key alias name
   - `KEY_PASSWORD`: Key password

If these secrets are not set, the build **will still succeed** and output installable APKs using the built-in fallback.
