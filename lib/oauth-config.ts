// Public OAuth client identifiers. These are designed to ship in the frontend/app (they're not
// secrets — the client secret stays out of the repo entirely). Shared by the server-side verifier
// (lib/oauth.ts) and the client-side sign-in helper (lib/social.ts) so they never drift apart.

export const GOOGLE_WEB_CLIENT_ID =
  "484395830717-kdj8v53ji9vsc7hu2cp1k4jdpgd6bp9u.apps.googleusercontent.com";
export const GOOGLE_IOS_CLIENT_ID =
  "484395830717-j305jfi1m5h7e9ufu8fs8m7qs00ttsfe.apps.googleusercontent.com";
// The reversed iOS client id is the custom URL scheme iOS opens the Google sign-in callback on
// (goes in the app's Info.plist CFBundleURLSchemes).
export const GOOGLE_IOS_REVERSED_CLIENT_ID =
  "com.googleusercontent.apps.484395830717-j305jfi1m5h7e9ufu8fs8m7qs00ttsfe";

// Apple: the app bundle id is the audience for native Sign in with Apple; the Services ID (web flow)
// is filled once Apple is configured in Paul's Apple Developer console.
export const APPLE_NATIVE_CLIENT_ID = "com.weasel.atable";
export const APPLE_WEB_CLIENT_ID =
  process.env.APPLE_WEB_CLIENT_ID ?? process.env.NEXT_PUBLIC_APPLE_WEB_CLIENT_ID ?? "";
