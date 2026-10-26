// Client-side social sign-in. One plugin (@capgo/capacitor-social-login) drives BOTH platforms:
//   - native iOS app  -> the OS account sheet (Google blocks OAuth in webviews, so this is required)
//   - web / PWA        -> Google Identity Services popup
// Either way we get a provider ID token, which the backend verifies (see lib/oauth.ts). The plugin's
// registerPlugin() is inert at import time (lazy web impl), so this module is SSR-safe as long as the
// methods below are only called from user event handlers.
import { SocialLogin } from "@capgo/capacitor-social-login";
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  APPLE_NATIVE_CLIENT_ID,
  APPLE_WEB_CLIENT_ID,
} from "@/lib/oauth-config";
import { isNative } from "@/lib/native";

let initPromise: Promise<void> | null = null;

// Initialize once (idempotent). Called before every sign-in; the plugin ignores repeat inits. The
// plugin's initialize() is cumulative + per-provider, so Google and Apple are initialized in SEPARATE
// calls: this guarantees Google is set up first and can never be taken down by an Apple failure (an
// unconfigured Apple provider once rejected the whole init on native iOS and broke Google with it).
function ensureInit(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // Web Google uses an OAuth popup that redirects to a FIXED, Google-registered URL (a
    // redirect_uri_mismatch otherwise). We send it to /oauth/google, a tiny page that finishes the
    // popup. Native iOS uses the reversed-client-id URL scheme instead, so no redirectUrl.
    const webRedirect =
      !isNative() && typeof window !== "undefined" ? `${window.location.origin}/oauth/google` : undefined;
    await SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID, // Web (GIS) audience
        iOSClientId: GOOGLE_IOS_CLIENT_ID, // native iOS
        iOSServerClientId: GOOGLE_WEB_CLIENT_ID, // so the native id token is verifiable server-side
        redirectUrl: webRedirect,
      },
    });
    // Apple, isolated so a failure here never affects the Google init above. Native uses the OS Sign in
    // with Apple (the clientId is just a non-empty provider marker; the real gate is the app entitlement
    // + the App ID capability). Web needs a real Services ID, only wired once Apple web is set up.
    try {
      if (isNative()) {
        await SocialLogin.initialize({ apple: { clientId: APPLE_NATIVE_CLIENT_ID, redirectUrl: "" } });
      } else if (APPLE_WEB_CLIENT_ID && typeof window !== "undefined") {
        await SocialLogin.initialize({
          apple: { clientId: APPLE_WEB_CLIENT_ID, redirectUrl: `${window.location.origin}/oauth/apple` },
        });
      }
    } catch {
      // Apple not ready (capability/entitlement/Services ID) — Google is initialized and works.
    }
  })().catch((e) => {
    initPromise = null; // let a later attempt retry (e.g. a transient GIS load failure)
    throw e;
  });
  return initPromise;
}

// Whether the Apple button should be offered. Native iOS always (OS Sign in with Apple). On web, only
// if a Services ID is configured (APPLE_WEB_CLIENT_ID) — otherwise the button would be a dead control
// that throws on tap, so we hide it and web users sign in with Google or email.
export function isAppleAvailable(): boolean {
  return isNative() || !!APPLE_WEB_CLIENT_ID;
}

export type SocialResult = { idToken: string; name: string | null };

export async function signInWithGoogle(): Promise<SocialResult> {
  await ensureInit();
  // forcePrompt (iOS) + prompt (web) are what keep the account chooser visible. Without them the
  // sign-in is SILENT once a session exists: on iOS the plugin takes restorePreviousSignIn() and
  // shows no UI at all, and on web Google auto-approves — either way the user is dropped straight
  // back into the account they just signed out of, with no way to pick another one.
  const { result } = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["email", "profile"], forcePrompt: true, prompt: "select_account" },
  });
  if (result.responseType !== "online" || !result.idToken) throw new Error("no_id_token");
  return { idToken: result.idToken, name: result.profile.name ?? null };
}

export async function signInWithApple(): Promise<SocialResult> {
  await ensureInit();
  const { result } = await SocialLogin.login({ provider: "apple", options: { scopes: ["name", "email"] } });
  if (!result.idToken) throw new Error("no_id_token");
  // Apple only reveals the name on the very first sign-in (never in the token).
  const name = [result.profile.givenName, result.profile.familyName].filter(Boolean).join(" ").trim() || null;
  return { idToken: result.idToken, name };
}

// Sign the OS / browser OUT of the social providers. Our own logout only drops the app token, so
// without this the provider session survives and keeps handing back the account the user just left.
// Each provider is isolated: Apple's logout rejects when there is no live session, and that must
// never stop Google's. Safe to call for email-only accounts (nothing to sign out of).
export async function signOutSocial(): Promise<void> {
  try {
    await ensureInit();
  } catch {
    return; // the plugin never came up — there is no provider session to clear
  }
  for (const provider of ["google", "apple"] as const) {
    try {
      await SocialLogin.logout({ provider });
    } catch {
      // not signed in with this provider, or it isn't configured on this platform
    }
  }
}

// A dismissed popup / cancelled sheet rejects with code USER_CANCELLED — not a real error, so callers
// can stay silent instead of flashing an error toast.
export function isUserCancelled(e: unknown): boolean {
  return !!e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "USER_CANCELLED";
}

// Called from the /oauth/* popup landing. Touching the plugin runs its web module, whose constructor
// detects the popup + reads the token from the URL fragment, posts it back to the opener window (which
// resolves signInWithGoogle()), and closes this popup. Idempotent + safe if it's somehow not a popup.
export async function finishOAuthPopup(): Promise<void> {
  try {
    await SocialLogin.initialize({});
  } catch {
    // The auto-finish runs in the plugin constructor regardless; nothing else to do here.
  }
}
