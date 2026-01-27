# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

### 3. Running the App

#### Option A: Expo Go (Limited - No Google/Apple Auth)

Best for UI development when you don't need Google/Apple sign-in:

```bash
npx expo start --go
```

Scan the QR code with the **Expo Go** app on your phone.

#### Option B: Development Build (Full Features)

Required for Google/Apple authentication:

```bash
# Start the dev server
npx expo start --dev-client

# If using tunnel (for Linux or complex networks)
npx expo start --dev-client --tunnel
```

Open your custom **Connections** dev client app (not Expo Go) and connect.

---

## Building the Development Client

Native features (Google Sign-In, Apple Sign-In) require a custom development build.

### iOS (Cloud Build via EAS)

> ⚠️ iOS builds require EAS (Expo Application Services). You cannot build iOS locally on Windows or Linux.

1. **Register your iOS device:**
```bash
   npx eas device:create
```
   Follow the prompts to scan a QR code on your iPhone.

2. **Build the development client:**
```bash
   eas build --platform ios --profile development
```
   This takes ~5-10 minutes. You only need to rebuild when adding new native modules.

3. **Install on your device:**
   - Scan the QR code provided after build completion
   - Or download the `.ipa` from the EAS dashboard

4. **Enable Developer Mode on iPhone (iOS 16+):**
   - Settings → Privacy & Security → Developer Mode → ON
   - Restart when prompted