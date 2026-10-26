// Social sign-in token verification (Google + Apple).
//
// The client (native plugin on iOS, or Google Identity Services on the web) hands us an *ID token*:
// a JWT signed by Google/Apple. We NEVER trust it blindly — we verify its signature against the
// provider's public keys (JWKS) and check that it was minted for OUR app (the `aud` claim). Only then
// do we read the user's stable id (`sub`) and email. No client secret is needed for this: signature
// verification is enough, which is why Paul's `client_secret_*.json` stays untouched.
import { jwtVerify, createRemoteJWKSet } from "jose";
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  APPLE_NATIVE_CLIENT_ID,
  APPLE_WEB_CLIENT_ID,
} from "@/lib/oauth-config";

// createRemoteJWKSet caches the provider's signing keys and transparently refetches on rotation.
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

// Both providers sign ID tokens with RS256; pin it so a token can't be forced through with a weaker
// or unexpected algorithm (defense in depth on top of the JWKS signature check).
const ALGS = ["RS256"];

export type SocialIdentity = { sub: string; email: string | null; name: string | null };

// Return the token's email ONLY when the provider attests it is verified. Both Google and Apple ship
// an `email_verified` claim (boolean, or the string "true" for Apple). We must NOT trust an
// unverified email for account linking: linking by an unverified address is an account-takeover
// vector (a token asserting someone else's unverified email would graft onto their account).
function verifiedEmail(payload: Record<string, unknown>): string | null {
  const email = payload.email;
  const ev = payload.email_verified;
  const verified = ev === true || ev === "true";
  return verified && typeof email === "string" ? email.toLowerCase() : null;
}

// Verify a Google ID token. Throws (jose) if the signature, issuer, audience or expiry is wrong.
export async function verifyGoogleIdToken(idToken: string): Promise<SocialIdentity> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: [GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID],
    algorithms: ALGS,
  });
  if (!payload.sub) throw new Error("no_sub");
  return {
    sub: String(payload.sub),
    email: verifiedEmail(payload),
    name: typeof payload.name === "string" ? payload.name : null,
  };
}

// Verify an Apple identity token. Apple only puts the user's name in the *authorization response*
// on the very first sign-in (never in the token), so `name` here is always null — the client passes
// the name separately when it has it.
export async function verifyAppleIdToken(idToken: string): Promise<SocialIdentity> {
  const audience = [APPLE_NATIVE_CLIENT_ID, APPLE_WEB_CLIENT_ID].filter(Boolean);
  const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
    issuer: "https://appleid.apple.com",
    audience,
    algorithms: ALGS,
  });
  if (!payload.sub) throw new Error("no_sub");
  return {
    sub: String(payload.sub),
    email: verifiedEmail(payload),
    name: null,
  };
}
