"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { SwipeDeck } from "@/components/SwipeDeck";
import { Spinner } from "@/components/Spinner";
import { Icon } from "@/components/Icon";
import { VoteButton } from "@/components/VoteButton";
import { GateButton, GateField, gateError } from "@/components/GateUI";
import { CATEGORIES, FOODS, categoryRank, popularityRank, variantsFor } from "@/data/foods";
import { restrictionsToExcludes } from "@/lib/diets";
import type { AppNotification, Food, Member, Status } from "@/lib/types";
import { dirToPref, type SwipeCardData, type SwipeDir } from "@/lib/swipe";

const CAT_EMOJI: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.emoji]));
const CAT_ICON: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.icon]));

// Same vote-status pills as "Mes goûts", so an onboarding card shows what you voted.
type Pill = { icon: string; label: string; className: string };
const STATUS_PILL: Record<Status, Pill> = {
  O: { icon: "thumbs-up", label: "Aime", className: "border-green-200 bg-green-50 text-green-700" },
  M: { icon: "meh", label: "Moyen", className: "border-amber-200 bg-amber-50 text-amber-700" },
  N: { icon: "thumbs-down", label: "Aime pas", className: "border-red-200 bg-red-50 text-red-700" },
};
const COUP_PILL: Pill = { icon: "heart", label: "Coup de cœur", className: "border-pink-200 bg-pink-50 text-pink-700" };

type Step = "choose" | "create" | "join" | "intro" | "onboard";

// Second gate: the signed-in account (no family yet) creates or joins a family/group,
// then does the onboarding swipe. onDone() reloads the provider into the app.
export function FamilyGate({
  me,
  onDone,
  onLogout,
}: {
  me: Member;
  onDone: () => void | Promise<void>;
  onLogout: () => void;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [familyName, setFamilyName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinSent, setJoinSent] = useState(false); // a join request is out — show a note, keep polling in the background

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await apiFetch("/api/family", {
        method: "POST",
        body: JSON.stringify({ familyName: familyName.trim() || "Ma famille" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return setError(gateError(res.status, data.error));
      }
      setStep("intro");
    } catch {
      setError("Impossible de créer");
    } finally {
      setBusy(false);
    }
  }

  // "Faire plus tard": get into the app now by creating a solo family/group with a
  // default name. The user can rename, invite, or share the code later; skips the
  // onboarding swipe (tastes can be set anytime in "Mes goûts").
  async function skipForNow() {
    setError("");
    setBusy(true);
    try {
      const res = await apiFetch("/api/family", {
        method: "POST",
        body: JSON.stringify({ familyName: "Ma famille" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return setError(gateError(res.status, data.error));
      }
      setStep("onboard");
    } catch {
      setError("Impossible de continuer");
    } finally {
      setBusy(false);
    }
  }

  async function submitJoin(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (code.trim().length < 4) return setError("Code ?");
    setBusy(true);
    try {
      const res = await apiFetch("/api/family/join", {
        method: "POST",
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return setError(gateError(res.status, data.error));
      }
      // No blocking wait screen: just note it was sent and drop back to the choose screen so the user
      // can create their own family or do something else. A background poll (below) lets them in the
      // moment an admin accepts.
      setError("");
      setCode("");
      setJoinSent(true);
      setStep("choose");
    } catch {
      setError("Impossible d'envoyer la demande");
    } finally {
      setBusy(false);
    }
  }

  // While pending: poll for acceptance (family appears) or refusal (notification).
  useEffect(() => {
    if (!joinSent) return;
    let alive = true;
    async function poll() {
      try {
        const meRes = await apiFetch("/api/family/me");
        if (meRes.ok) {
          const data = (await meRes.json()) as { family: unknown };
          if (alive && data.family) {
            setJoinSent(false);
            setStep("intro");
            return;
          }
        }
        const nRes = await apiFetch("/api/notifications");
        if (nRes.ok) {
          const notifs = (await nRes.json()) as AppNotification[];
          if (alive && notifs.some((n) => n.type === "join_refused")) {
            setError("Ta demande a été refusée.");
            setJoinSent(false);
            setStep("choose");
          }
        }
      } catch {
        // best effort
      }
    }
    poll();
    const t = setInterval(poll, 4000);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [joinSent]);

  // Onboarding swipe over the food catalogue, minus the categories the chosen diet rules out (e.g. a
  // vegan does not swipe through 40 meats). Same card as "Mes goûts": no description, a status pill
  // once voted, a "préciser la forme" flip. What's been voted this session lives here (funnel — no
  // per-card server read).
  const [prefs, setPrefs] = useState<Record<string, { status: Status | null; favorite: boolean }>>({});
  // Memoised on the restrictions' CONTENT: a fresh Set on every render would defeat the memo below
  // (and with it the fix for the deck restarting after each vote).
  const restrictionsKey = (me.restrictions ?? []).join(",");
  const excluded = useMemo(
    () => new Set(restrictionsToExcludes(me.restrictions)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restrictionsKey],
  );
  // First run: ask about the highest-signal things first (whole dishes, then starters/desserts, then
  // raw ingredients) so a partial pass still feeds the meal generator well, and inside each of those,
  // what French households eat most. Stable sort, so the catalogue order breaks any remaining tie.
  // See CATEGORY_ORDER / POPULAR_ORDER in data/foods.
  //
  // MEMOISED, and that matters: this component re-renders on every vote (it holds the answers), so
  // rebuilding the array here handed the deck a new identity each time — which tripped its "the list
  // changed, start over" reset and bounced the user back to the first card after every single vote.
  const onboardFoods = useMemo(
    () =>
      FOODS.filter((f) => !excluded.has(f.category)).sort(
        (a, b) =>
          categoryRank(a.category) - categoryRank(b.category) ||
          popularityRank(a.id) - popularityRank(b.id),
      ),
    [excluded],
  );
  function foodCard(f: Food): SwipeCardData {
    return { id: f.id, title: f.label, emoji: CAT_EMOJI[f.category] ?? "🍽️", iconName: CAT_ICON[f.category] };
  }
  function savePref(body: Record<string, unknown>) {
    // Best-effort during onboarding; anything missed can be set later in "Mes goûts".
    apiFetch("/api/preferences", { method: "POST", body: JSON.stringify(body) }).catch(() => {});
  }
  function onboardDecide(f: Food, dir: SwipeDir) {
    const { status, favorite } = dirToPref(dir, false);
    setPrefs((p) => ({ ...p, [f.id]: { status, favorite } }));
    void savePref({ person: me.id, foodId: f.id, status, favorite });
  }
  function onboardReverse(f: Food) {
    setPrefs((p) => {
      const n = { ...p };
      delete n[f.id];
      return n;
    });
    void savePref({ person: me.id, foodId: f.id, status: null });
  }
  // A per-form vote on the flipped card (e.g. "steak haché" vs "steak"): toggles like Mes goûts.
  function setVariant(vid: string, status: Status) {
    const cur = prefs[vid]?.status;
    const next = cur === status ? null : status;
    setPrefs((p) => ({ ...p, [vid]: { status: next, favorite: false } }));
    void savePref({ person: me.id, foodId: vid, status: next, favorite: false });
  }
  function toggleFav(f: Food) {
    const cur = prefs[f.id];
    const favorite = !cur?.favorite;
    const status = favorite ? "O" : cur?.status ?? null;
    setPrefs((p) => ({ ...p, [f.id]: { status, favorite } }));
    void savePref({ person: me.id, foodId: f.id, status, favorite });
  }

  // A single full-screen between the family step and the taste swipe: the plate mascot + one short
  // line, so the deck doesn't drop the user in cold. "C'est parti" launches the actual swipe.
  if (step === "intro") {
    return (
      <div className="page-in fixed inset-0 z-[90] flex flex-col bg-[var(--primary)] px-6 py-[max(2rem,env(safe-area-inset-top))] text-white">
        <style>{`
          @keyframes qm-hop { 0%,100% { transform: translateY(0); } 28% { transform: translateY(-26px); } 52% { transform: translateY(0); } }
          .qm-hop { animation: qm-hop 0.85s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .qm-hop { animation: none; } }
        `}</style>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="qm-hop h-32 w-32 object-contain" />
          <div className="text-3xl font-extrabold tracking-tight">Choisis tes goûts 😋&nbsp;!</div>
        </div>
        <button
          type="button"
          onClick={() => setStep("onboard")}
          className="btn-3d btn-on-orange absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 flex w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 items-center justify-center py-4 text-lg font-extrabold"
        >
          C&apos;est parti
        </button>
      </div>
    );
  }

  if (step === "onboard") {
    return (
      <SwipeDeck
        items={onboardFoods}
        getCard={foodCard}
        onDecision={onboardDecide}
        onReverse={onboardReverse}
        onClose={() => onDone()}
        title={`Choisis tes goûts, ${me.name}`}
        filmstripFoods={onboardFoods}
        filmstripEmoji={(f) => CAT_EMOJI[f.category] ?? "🍽️"}
        titleOnTop
        cardTopRight={(f) => {
          const fav = !!prefs[f.id]?.favorite;
          return (
            <button
              type="button"
              onClick={() => toggleFav(f)}
              aria-pressed={fav}
              aria-label={fav ? `Retirer ${f.label} des coups de cœur` : `${f.label} en coup de cœur`}
              className="flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={fav ? "#ec4899" : "none"} stroke={fav ? "#ec4899" : "#d6d3d1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          );
        }}
        cardFooter={(f, { toggleFlip }) => {
          const p = prefs[f.id];
          const pill = p?.favorite ? COUP_PILL : p?.status ? STATUS_PILL[p.status] : null;
          const hasVariants = variantsFor(f.category).length > 0;
          return (
            <div className="flex flex-col items-center gap-1.5 pb-1">
              {pill && (
                <span className={`flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-xs font-extrabold ${pill.className}`}>
                  <Icon name={pill.icon} size={14} strokeWidth={2.4} />
                  {pill.label}
                </span>
              )}
              {hasVariants && (
                <button
                  type="button"
                  onClick={toggleFlip}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-1.5 text-sm font-bold text-[var(--primary)] transition active:scale-95"
                >
                  Préciser la forme
                </button>
              )}
            </div>
          );
        }}
        cardBack={(f, { closeFlip }) => {
          const variants = variantsFor(f.category);
          if (variants.length === 0) return undefined;
          return (
            <div className="flex h-full w-full flex-col gap-2 p-4">
              <div className="flex shrink-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xl font-extrabold text-stone-900">{f.label}</div>
                  <div className="text-[14px] font-semibold text-stone-400">Sous quelle forme&nbsp;?</div>
                </div>
                <button
                  type="button"
                  onClick={closeFlip}
                  aria-label="Fermer les précisions"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition active:scale-90"
                >
                  <Icon name="x" size={16} strokeWidth={2.6} />
                </button>
              </div>
              <div className="-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1" style={{ touchAction: "pan-y" }}>
                {variants.map((v) => {
                  const vid = `${f.id}#${v.key}`;
                  const vst = prefs[vid]?.status ?? undefined;
                  return (
                    <div key={v.key} className="flex items-center justify-between gap-2">
                      <span className="line-clamp-2 min-w-0 flex-1 text-[16px] font-semibold leading-[1.15] text-stone-600">{v.label}</span>
                      <div className="flex shrink-0 gap-2.5">
                        <VoteButton size="sm" tone="red" icon="thumbs-down" active={vst === "N"} onClick={() => setVariant(vid, "N")} label={`${v.label} : aime pas`} />
                        <VoteButton size="sm" tone="amber" icon="meh" active={vst === "M"} onClick={() => setVariant(vid, "M")} label={`${v.label} : moyen`} />
                        <VoteButton size="sm" tone="green" icon="thumbs-up" active={vst === "O"} onClick={() => setVariant(vid, "O")} label={`${v.label} : aime`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }}
      />
    );
  }

  return (
    <div className="page-in fixed inset-0 z-[90] flex flex-col items-center overflow-y-auto bg-[var(--primary)] px-6 py-[max(2rem,env(safe-area-inset-top))] text-white">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="mx-auto h-20 w-20 object-contain" />
        <div className="text-center">
          <div className="text-2xl font-extrabold tracking-tight">Salut {me.name}&nbsp;!</div>
          <p className="mt-1 font-semibold text-white/80">Rejoins ou crée ta famille/groupe.</p>
        </div>

        {error && (
          <p className="rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-bold">{error}</p>
        )}

        <div key={step} className="step-in flex flex-col gap-3">
        {step === "choose" && (
          <div className="flex flex-col gap-3">
            {joinSent && (
              <p className="rounded-xl bg-white/20 px-3 py-2.5 text-center text-sm font-bold">
                ✓ Demande envoyée&nbsp;! Un admin doit t&apos;accepter — tu entreras tout seul dès que c&apos;est bon. En attendant, tu peux créer ta propre famille/groupe.
              </p>
            )}
            <GateButton onClick={() => { setError(""); setStep("create"); }}>➕ Créer une famille/groupe</GateButton>
            <GateButton onClick={() => { setError(""); setStep("join"); }}>👋 Rejoindre une famille/groupe</GateButton>
            <button type="button" onClick={onLogout} className="mt-1 text-center text-sm font-semibold text-white/80 underline">
              Se déconnecter
            </button>
          </div>
        )}

        {step === "create" && (
          <form onSubmit={submitCreate} className="flex flex-col gap-3">
            <GateField label="Nom de la famille/groupe" value={familyName} onChange={setFamilyName} placeholder="" autoFocus />
            <button type="submit" disabled={busy} className="btn-3d btn-on-orange flex items-center justify-center py-3.5 text-base disabled:opacity-60">
              {busy ? <Spinner className="h-5 w-5" /> : "Créer"}
            </button>
            <button type="button" onClick={() => { setError(""); setStep("choose"); }} className="text-center text-sm font-semibold text-white/75 underline">
              Retour
            </button>
          </form>
        )}

        {step === "join" && (
          <form onSubmit={submitJoin} className="flex flex-col gap-3">
            <GateField label="Code de la famille/groupe" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="A7X2B9" mono autoFocus />
            <button type="submit" disabled={busy} className="btn-3d btn-on-orange flex items-center justify-center py-3.5 text-base disabled:opacity-60">
              {busy ? <Spinner className="h-5 w-5" /> : "Envoyer ma demande"}
            </button>
            <button type="button" onClick={() => { setError(""); setStep("choose"); }} className="text-center text-sm font-semibold text-white/75 underline">
              Retour
            </button>
          </form>
        )}

        </div>
      </div>

      {step === "choose" && (
        <button
          type="button"
          onClick={skipForNow}
          disabled={busy}
          className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 flex w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/15 py-4 text-lg font-extrabold text-white backdrop-blur transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Spinner className="h-5 w-5" /> : "Faire plus tard"}
        </button>
      )}
    </div>
  );
}
