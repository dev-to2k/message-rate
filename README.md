# Message Rate

Vite web app, packaged with Capacitor for Android and iOS. The UI and `src/score.ts` are unchanged. `vite` uses `base: "./"` so the WebView can load the built files.

Capacitor CLI 8 needs Node.js 22 or newer.

## Android on Windows

Install Android Studio (with an Android SDK), then from this folder:

```
npm install
npm run build
npx cap sync android
npx cap open android
```

`npx cap open android` opens the `android` project in Android Studio. The app id is `app.messagerate`.

## iOS

`ios/` is a real Xcode project created by `npx cap add ios` (app id `app.messagerate`). Opening, building, signing, and running it still requires a Mac with Xcode. `npx cap open ios` does not work on Windows or Linux, and this repo cannot produce an IPA from those machines.

On a Mac:

```
npm install
npm run build
npx cap sync ios
npx cap open ios
```
