# Ravnsouth for iPhone and Android

The Ravnsouth app bundles the current ravnsouth web client with Capacitor. It opens to the Repbook feed after sign-in, with Repbook, Arena and Journal in the bottom navigation. Both platforms use the same Supabase project as the website. Confirmation and reset links open on ravnsouth.com, and members can sign in to Ravnsouth after finishing those steps in their browser.

## Build on a Mac

Use Node.js 22 or later and Xcode 26 or later with the iOS SDK installed. Run the following from `mobile/`.

```sh
npm ci
npm run ios:sync
npm run ios:open
```

Choose the **App** scheme and an iPhone simulator in Xcode. For device testing and TestFlight, select the organisation's Apple Developer team under **Signing & Capabilities** and register `com.ravnsouth.repbook` before uploading. Use **Ravnsouth** as the app name in App Store Connect. Run `npm run ios:sync` again whenever the web source changes.

## Build for Android

Use Node.js 22 or later, JDK 21, and Android SDK Platform 36. Run the following from `mobile/`.

```sh
npm ci
npm run android:sync
npm run android:open
```

From `android/`, run `./gradlew assembleDebug bundleRelease` to build the installable debug APK and the unsigned release bundle. Use the Play Console upload key to sign the release bundle before uploading it. The app name in Play Console is **Ravnsouth**, and the application ID is `com.ravnsouth.repbook`.

## Store testing

- Sign in with an existing member account and check that Repbook, the Journal and Arena show the expected account data.
- Check email confirmation and recovery, reel recording and upload, video playback and sound, plus sign-out and account deletion on iPhone and Android devices.
- Prepare the privacy disclosures and confirm that the reporting, blocking and moderation required for member posts are in place before public App Store submission.

The existing in-app challenge alerts are part of this build. iOS push notifications and links that open a specific challenge in the app require a separate integration.
