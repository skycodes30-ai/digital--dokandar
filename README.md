# ডিজিটাল দোকানদার

Bangla-first shop ledger app with an Express web API and a Capacitor Android shell.

## Web version

Install dependencies and start the local web app:

```powershell
npm install
npm start
```

Open `http://localhost:3000`.

## GitHub connection

GitHub authorization must be completed in the browser; it cannot be silently enabled by a local project file. Use this flow:

1. Open [GitHub new repository](https://github.com/new) and create an empty repository.
2. In VS Code, open **Source Control**, choose **Publish to GitHub**, sign in when prompted, and authorize the GitHub extension.
3. Publish this project as a private or public repository.
4. The included [GitHub Actions workflow](.github/workflows/ci.yml) will validate every push and pull request.

Do not commit `.env` files, Android signing keys, or the live `data/ledger.json`; these are covered by `.gitignore`.

## PWA installation

The web app now includes `public/manifest.json`, `public/sw.js`, PWA registration, theme metadata, and install icons. Deploy it over HTTPS for Chrome installation; service workers and install prompts are not available on ordinary remote HTTP. After deployment, visitors can open the site in Chrome and use the browser's **Install app** option.

The service worker caches the app shell for faster repeat loads and deliberately does not cache `/api/` responses, so customer data remains live.

## Android project

The Android Studio project is in `android/`. To refresh the packaged web assets after changing files in `public/`:

```powershell
npm run cap:sync
```

Open the project in Android Studio:

```powershell
npm run cap:open:android
```

Build a debug APK from the command line:

```powershell
npm run android:build:debug
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

For a release APK:

```powershell
npm run android:build:release
```

A release APK must be signed before distribution.

## Android prerequisites

- Android Studio with Android SDK and SDK Platform installed
- JDK compatible with the generated Capacitor/Gradle project
- Android SDK tools available to Android Studio or `ANDROID_HOME`

## Deploy the API to Render

This repository includes `render.yaml` for a free Render web service. In Render:

1. Open [Render Blueprints](https://dashboard.render.com/blueprints) and sign in with GitHub.
2. Choose **New Blueprint Instance**, connect the GitHub repository, and select `render.yaml`.
3. Deploy `digital-dokandar-api` and wait for the health check to pass.
4. Copy the real service URL Render gives you.
5. Replace `apiBaseUrl` in `public/app-config.js` with that HTTPS URL.
6. Run `npm run cap:sync` before building the APK.

The browser version continues to use same-origin `/api` requests. The Android build uses `public/app-config.js` because `localhost:3000` inside an APK points to the phone, not the development computer.

## AdMob demo

`public/admob.js` contains a Capacitor AdMob demo wrapper with Google test IDs for a banner and an interstitial. The banner is initialized on the native Android build, and the interstitial is available as:

```js
window.DigitalDokandarAds.showInterstitial();
```

Replace the test IDs with your own AdMob IDs only after creating an AdMob app. Do not publish with test IDs or without following Google Play and AdMob policies.
