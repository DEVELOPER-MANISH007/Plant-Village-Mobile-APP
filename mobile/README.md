# PlantCare AI mobile

Expo + React Native application for Android. All predictions use the deployed FastAPI CNN at `https://dl-projet.onrender.com`. The app includes Home, Scan, History, and Settings tabs. History metadata is kept in AsyncStorage and compressed thumbnails are saved in app-private document storage; neither is sent to a history service.

## Run on Android

1. Install Node.js LTS and the Expo Go app on your Android phone.
2. From this folder run `npm install` and `npx expo install --fix`.
3. Start Expo with `npx expo start` (or `npm run start`). Scan the QR code from Expo Go. The computer and phone should be on the same network; use `npx expo start --tunnel` if the network blocks local connections.
4. To launch an Android emulator from Windows, start the emulator first and run `npm run android`.

To override the API URL for development, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to a base URL without an endpoint suffix. The deployed backend remains the default. Do not put secrets in this public mobile configuration.

## Android APK with EAS Build

Install EAS CLI with `npm install --global eas-cli`, sign in using `eas login`, then run `eas build:configure` if prompted. The repository already includes a `preview` profile for an installable APK; run `eas build --platform android --profile preview`. EAS may ask to create or link an Expo account/project. Follow its Android signing prompts; no local Android Studio setup is required for the cloud build.

## Checks

`npm run typecheck` checks TypeScript and `npm run export` performs an Android Expo export. `npx expo start` starts the development server.

The app asks for camera or photo-library access only when its corresponding action is selected. Images are uploaded to the API for prediction. The three returned model classes are Healthy, Early Blight, and Late Blight; any other backend class is shown without being rewritten.

## Device walkthrough

1. Start the app with `npx expo start`, open the project in Expo Go, and tap **Scan** to open the camera. Grant camera access when Android asks; take a potato-leaf photo, review the preview, then tap **Analyze Plant**.
2. Return to **Home** and tap **Choose from gallery**. Grant photo access if prompted, select a JPG, PNG, or WebP image, and analyze it. Also check replace and remove controls on the preview.
3. Wait for the real server response. Confirm the result image, exact returned class, confidence percent, explanation, and AI-estimate notice. To check errors, enable airplane mode before Analyze and confirm the retry message appears; disable it and retry.
4. Open **History** to see the saved scan. Tap it for details, use the row trash button to delete one scan, or the top trash button to clear all (both ask for confirmation). Close and reopen the app to confirm remaining records persist.
5. Open **Settings** and press **Check connection** to query `/ping`. The status starts as unchecked and is not inferred from the app loading.

Camera, gallery, persistent file storage, and Expo Go behavior still need a hands-on check on the target Android device. The real backend multipart prediction was verified separately from this environment using an existing PlantVillage sample.
