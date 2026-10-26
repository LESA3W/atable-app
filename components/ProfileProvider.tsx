"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { FamilyGate } from "@/components/FamilyGate";
import { OAuthPopupFinisher } from "@/components/OAuthPopupFinisher";
import { signOutSocial } from "@/lib/social";
import type { Family, FamilyContext as FCtx, FamilySummary, Member } from "@/lib/types";

type FamilyCtxValue = {
  me: Member;
  members: Member[];
  family: Family; // the ACTIVE famille/groupe
  families: FamilySummary[]; // all the account's familles/groupes, for the switcher
  memberById: (id: string) => Member | undefined;
  memberLabel: (id: string) => string;
  switchFamily: (familyId: string) => Promise<void>; // change the active one, then refresh
  refresh: () => Promise<void>;
  logout: () => void;
};

const FamilyContext = createContext<FamilyCtxValue | null>(null);

// Consumed by pages/components that render inside the authenticated app (children of
// ProfileProvider). Throws if used behind the onboarding gate (no member yet).
// Same context, but tolerant: for chrome that can render on a PUBLIC page (/invite), where there is
// no account and nothing to show. Returns null instead of throwing.
export function useFamilyOptional(): FamilyCtxValue | null {
  return useContext(FamilyContext);
}

export function useFamily(): FamilyCtxValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily must be used within <ProfileProvider>");
  return ctx;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<FCtx | null>(null);
  const [ready, setReady] = useState(false);
  // True when the app is loaded inside the social-login OAuth popup (an /oauth/* route).
  const [isOAuthPopup] = useState(
    () => typeof window !== "undefined" && window.location.pathname.startsWith("/oauth/"),
  );
  // Public pages that must render for a signed-out visitor (no account, no gate):
  // - /invite         shared referral landing (a download page, not a signup form)
  // - /confidentialite privacy policy — App Store review and Google OAuth branding both require a
  //   reachable, login-free URL; the onboarding gate would otherwise show the signup screen instead.
  // - /aide           support page — the App Store "Support URL" must be reachable without an account.
  const pathname = usePathname();
  const isPublic =
    pathname.startsWith("/invite") ||
    pathname.startsWith("/confidentialite") ||
    pathname.startsWith("/aide");

  const load = useCallback(async () => {
    if (!getToken()) {
      setData(null);
      setReady(true);
      return;
    }
    try {
      const res = await apiFetch("/api/family/me");
      if (res.ok) {
        setData((await res.json()) as FCtx);
      } else {
        if (res.status === 401) clearToken();
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isOAuthPopup && !isPublic) load();
  }, [load, isOAuthPopup, isPublic]);

  // Inside the social-login popup: finish the OAuth handshake (posts the token to the opener window,
  // which advances the real onboarding, then closes this popup) and render nothing else. Otherwise the
  // onboarding gate below would render the whole app inside the popup and it would never close.
  if (isOAuthPopup) return <OAuthPopupFinisher />;

  // Public page: render it as-is, with no family context and no gate.
  if (isPublic) return <>{children}</>;

  // The SplashScreen covers the very first paint; render nothing until we know.
  if (!ready) return null;

  // The single choke point for every sign-out (settings, account deletion, ProfileButton, FamilyGate).
  // Clearing our token is not enough: the Google/Apple session lives in the OS, so it also has to go —
  // otherwise the next sign-in silently restores the account that was just left. Not awaited on purpose:
  // the UI drops to the onboarding screen instantly and a stuck plugin call can never freeze it.
  const logout = () => {
    void signOutSocial();
    clearToken();
    setData(null);
  };

  // No token -> Duolingo-style onboarding; token but no family -> family gate; else app.
  if (!data) return <OnboardingFlow onDone={load} />;
  if (!data.family) return <FamilyGate me={data.me} onDone={load} onLogout={logout} />;

  const family = data.family;
  const memberById = (id: string) => data.members.find((m) => m.id === id);
  const switchFamily = async (familyId: string) => {
    if (familyId === family.id) return;
    const res = await apiFetch("/api/family/switch", { method: "POST", body: JSON.stringify({ familyId }) });
    if (res.ok) await load();
  };
  const value: FamilyCtxValue = {
    me: data.me,
    members: data.members,
    family,
    families: data.families ?? [family],
    memberById,
    memberLabel: (id) => memberById(id)?.name ?? id,
    switchFamily,
    refresh: load,
    logout,
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}
