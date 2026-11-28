# Repbook for iPhone

The iPhone project bundles the current ravnsouth web client with Capacitor. It opens to the Repbook feed after sign-in and uses the same Supabase project as the website. Confirmation and reset links continue to open on ravnsouth.com. Members can sign in to Repbook after finishing those steps in their browser.

## Build on a Mac

Use Node.js 22 or later and Xcode 26 or later with the iOS SDK installed. Run the following from `mobile/`.

```sh
npm ci
npm run ios:sync
npm run ios:open
```

Choose the **App** scheme and an iPhone simulator in Xcode. For device testing and TestFlight, select the organisation's Apple Developer team under **Signing & Capabilities** and register `com.ravnsouth.repbook` before uploading. Run `npm run ios:sync` again whenever the web source changes.

## TestFlight checks

- Sign in with an existing member account and check that Repbook, the Journal and Arena show the expected account data.
- Check email confirmation and recovery, reel recording and upload, video playback and sound, plus sign-out and account deletion on an iPhone.
- Prepare the privacy disclosures and confirm that the reporting, blocking and moderation required for member posts are in place before public App Store submission.

The existing in-app challenge alerts are part of this build. iOS push notifications and links that open a specific challenge in the app require a separate integration.
