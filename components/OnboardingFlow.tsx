"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { apiFetch, setToken } from "@/lib/api";
import { signInWithGoogle, signInWithApple, isUserCancelled, isAppleAvailable } from "@/lib/social";
import { GateField, gateError } from "@/components/GateUI";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Spinner } from "@/components/Spinner";
import { MarketCard } from "@/components/MarketCard";
import { Icon } from "@/components/Icon";
import { WheelDatePicker } from "@/components/WheelDatePicker";
import { SignupCelebration } from "@/components/SignupCelebration";
import { pendingReferral, clearReferral, referralPromptDone } from "@/lib/referral";
import { ReferralPrompt } from "@/components/ReferralPrompt";
import { RESTRICTIONS } from "@/lib/diets";
import { isAcceptablePassword, isValidEmail } from "@/lib/password";
import {
  fetchCitiesByPostcode,
  fetchDriveMarkets,
  marketsOf,
  reverseGeocode,
  type CitySuggestion,
  type Market,
  type ShoppingValue,
} from "@/lib/shopping";

// One profiling question per screen (Duolingo-style). `key` is where the answer
// lands in the collected profile; `multi` allows several picks.
type Choice = { id: string; label: string; emoji: string };
type Question = { kind: "single" | "multi"; key: string; q: string; options: Choice[] };

const QUESTIONS: Question[] = [
  {
    kind: "multi",
    key: "goals",
    q: "Qu'est-ce que tu cherches ?",
    options: [
      { id: "tete", label: "Arrêter de me prendre la tête", emoji: "😮‍💨" },
      { id: "budget", label: "Dépenser moins en courses", emoji: "💸" },
      { id: "proteine", label: "Manger plus protéiné", emoji: "💪" },
      { id: "equilibre", label: "Manger plus équilibré", emoji: "🥗" },
      { id: "recettes", label: "Cuisiner et découvrir des recettes", emoji: "👩‍🍳" },
      { id: "moins-viande", label: "Manger moins de viande", emoji: "🌱" },
      { id: "mental", label: "Alléger la charge mentale", emoji: "🧠" },
    ],
  },
  {
    kind: "single",
    key: "heard",
    q: "Comment tu as connu À table ?",
    options: [
      { id: "famille", label: "Un ami / la famille", emoji: "👋" },
      { id: "reseaux", label: "Les réseaux (Insta, TikTok…)", emoji: "📱" },
      { id: "store", label: "L'App Store", emoji: "📲" },
      { id: "autre", label: "Autre", emoji: "✨" },
    ],
  },
];

// The full linear flow. Progress bar spans everything after the two intro screens.
type Step =
  | { kind: "say"; text: string; intro?: boolean }
  | { kind: "question"; index: number }
  | { kind: "household" }
  | { kind: "restrictions" }
  | { kind: "shopping" }
  | { kind: "dob" }
  | { kind: "name" }
  | { kind: "email" }
  | { kind: "password" };

const STEPS: Step[] = [
  { kind: "say", text: "Bienvenue dans Atable ! 👋", intro: true },
  { kind: "say", text: "Juste quelques questions rapides et c'est parti !", intro: true },
  { kind: "household" },
  { kind: "question", index: 0 }, // goals
  { kind: "restrictions" },
  { kind: "question", index: 1 }, // heard
  { kind: "shopping" },
  { kind: "say", text: "Parfait. On te crée un compte, ça prend 30 secondes." },
  { kind: "dob" },
  { kind: "name" },
  { kind: "email" },
  { kind: "password" },
];

type Phase = "welcome" | "login" | "flow" | "generating" | "celebration";

export function OnboardingFlow({ onDone }: { onDone: () => void | Promise<void> }) {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // account fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // profiling answers that aren't in the QUESTIONS array
  const [household, setHousehold] = useState({ adults: 1, children: 0 });
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [noneChosen, setNoneChosen] = useState(false); // "Aucune restriction" explicitly picked
  const [shopping, setShopping] = useState<ShoppingValue>({});

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [signupRank, setSignupRank] = useState(221);
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  // `true` on the server and until the effect runs, so the prompt can never flash for a returning user.
  const [askedReferral, setAskedReferral] = useState(true);
  useEffect(() => setAskedReferral(referralPromptDone()), []);
  // Whether to show the Apple button — resolved AFTER mount (isNative() differs server vs native client,
  // so computing it at render would risk a hydration mismatch). Starts false (matches SSR) then settles.
  const [appleOk, setAppleOk] = useState(false);
  useEffect(() => {
    setAppleOk(isAppleAvailable());
  }, []);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const current = STEPS[step];
  const progressSteps = STEPS.filter((s) => !(s.kind === "say" && s.intro)).length;
  const doneSteps = STEPS.slice(0, step + 1).filter((s) => !(s.kind === "say" && s.intro)).length;
  const showProgress = !(current.kind === "say" && current.intro);
  const progress = Math.round((doneSteps / progressSteps) * 100);

  function next() {
    setError("");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function back() {
    setError("");
    if (step === 0) {
      setPhase("welcome");
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  }

  function pickSingle(key: string, id: string) {
    // Just select; the user advances with the "Continuer" button (no auto-advance).
    setAnswers((a) => ({ ...a, [key]: id }));
  }
  function toggleMulti(key: string, id: string) {
    setAnswers((a) => {
      const cur = new Set((a[key] as string[]) ?? []);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      return { ...a, [key]: [...cur] };
    });
  }
  function toggleRestriction(id: string) {
    // Choosing a restriction cancels the explicit "no restriction" choice.
    setNoneChosen(false);
    setRestrictions((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function chooseNone() {
    setRestrictions([]);
    setNoneChosen(true);
  }

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Mot de passe trop court (6 min).");
    setBusy(true);
    try {
      const res = await apiFetch("/api/account", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          name: firstName.trim(),
          lastName: lastName.trim(),
          birthdate: birthdate || null,
          restrictions,
          meta: {
            household,
            goals: answers.goals,
            heard: answers.heard,
            shopping,
          },
          referralCode: pendingReferral(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "email_taken") {
          setError("Cet email a déjà un compte. Connecte-toi plutôt.");
        } else {
          setError(gateError(res.status, data.error));
        }
        setBusy(false);
        return;
      }
      const data = (await res.json()) as { token: string; rank?: number; referralCode?: string | null };
      setToken(data.token);
      clearReferral(); // consumed by this signup
      if (typeof data.rank === "number") setSignupRank(data.rank);
      setMyReferralCode(data.referralCode ?? null);
      setPhase("celebration"); // rank + the 7-day trial and the share offer
    } catch {
      setError("Impossible de créer le compte");
      setBusy(false);
    }
  }

  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Email et mot de passe ?");
    setBusy(true);
    try {
      const res = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return setError(gateError(res.status));
      const data = (await res.json()) as { token: string };
      setToken(data.token);
      await onDone();
    } catch {
      setError("Connexion impossible");
    } finally {
      setBusy(false);
    }
  }

  async function onSocial(provider: "google" | "apple") {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const cred = provider === "google" ? await signInWithGoogle() : await signInWithApple();
      const res = await apiFetch(`/api/auth/${provider}`, {
        method: "POST",
        body: JSON.stringify({ idToken: cred.idToken, name: cred.name, referralCode: pendingReferral() }),
      });
      if (!res.ok) {
        setError("La connexion a échoué, réessaie.");
        return;
      }
      const data = (await res.json()) as { token: string; created?: boolean; rank?: number; referralCode?: string | null };
      setToken(data.token);
      if (data.created) {
        // Brand-new account -> same "you're user #N" reward as an email signup.
        clearReferral(); // consumed by this signup
        if (typeof data.rank === "number") setSignupRank(data.rank);
        setMyReferralCode(data.referralCode ?? null);
        setPhase("celebration");
      } else {
        // The user asked to SIGN UP but this identity already owns an account. Say it out loud before
        // handing over, otherwise landing in the old account looks like the app ignored the request.
        if (phase !== "login") {
          setInfo(
            provider === "google"
              ? "Tu as déjà un compte À table avec ce compte Google — on te reconnecte dessus."
              : "Tu as déjà un compte À table avec cet identifiant Apple — on te reconnecte dessus.",
          );
          await new Promise((r) => setTimeout(r, 1900));
        }
        await onDone();
      }
    } catch (e) {
      // A cancelled popup / sheet isn't an error — stay quiet.
      if (!isUserCancelled(e)) setError("La connexion a échoué, réessaie.");
    } finally {
      setBusy(false);
    }
  }

  // Check the email is free right after it's entered (not only at account creation).
  async function checkEmailThenNext(e: FormEvent) {
    e.preventDefault();
    setError("");
    const em = email.trim();
    if (!isValidEmail(em)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/check-email?email=${encodeURIComponent(em)}`);
      const data = (await res.json()) as { taken?: boolean };
      if (data.taken) {
        setError("Cet email a déjà un compte. Connecte-toi plutôt.");
        return;
      }
      next();
    } catch {
      next(); // best effort; createAccount still guards uniqueness
    } finally {
      setBusy(false);
    }
  }

  // ---------- first launch: the referral question ----------
  // Asked BEFORE anything else and only once, because it is the only way a referral survives an App
  // Store install (Safari's storage and the app's webview do not share anything).
  if (!askedReferral) return <ReferralPrompt onDone={() => setAskedReferral(true)} />;

  // ---------- welcome ----------
  if (phase === "welcome") {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="splash-bob h-28 w-28 object-contain" />
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight">À table&nbsp;!</h1>
          <p className="mt-2 font-semibold text-white/85">Les goûts de la famille, sans prise de tête.</p>
        </div>
        <div className="flex flex-col gap-3 pb-2">
          <button
            type="button"
            onClick={() => { setError(""); setPhase("flow"); setStep(0); }}
            className="btn-3d btn-on-orange py-4 text-lg font-extrabold"
          >
            C&apos;est parti
          </button>
          <button
            type="button"
            onClick={() => { setError(""); setPhase("login"); }}
            className="rounded-2xl border-2 border-white/50 py-3.5 text-base font-extrabold text-white transition active:scale-[0.98]"
          >
            J&apos;ai déjà un compte
          </button>
        </div>
      </Shell>
    );
  }

  // ---------- login ----------
  if (phase === "login") {
    return (
      <Shell>
        <TopBar onBack={() => { setError(""); setPhase("welcome"); }} />
        <div className="flex flex-1 flex-col justify-center gap-5">
          <h1 className="text-3xl font-extrabold tracking-tight">Content de te revoir&nbsp;!</h1>
          {error && <Banner>{error}</Banner>}
          <form onSubmit={submitLogin} className="flex flex-col gap-3">
            <GateField label="Email" value={email} onChange={setEmail} placeholder="toi@email.com" type="email" autoFocus />
            <GateField label="Mot de passe" value={password} onChange={setPassword} placeholder="Ton mot de passe" type="password" />
            <button type="submit" disabled={busy} className="btn-3d btn-on-orange mt-1 py-3.5 text-base disabled:opacity-60">
              {busy ? <Spinner className="h-5 w-5" /> : "Me connecter"}
            </button>
            <SocialButtons onSocial={onSocial} verb="Se connecter" busy={busy} appleOk={appleOk} />
            {info && !error && <Banner>{info}</Banner>}
          </form>
        </div>
      </Shell>
    );
  }

  // ---------- celebration (post-signup reward) ----------
  if (phase === "celebration") {
    return <SignupCelebration rank={signupRank} referralCode={myReferralCode} onDone={onDone} />;
  }

  // ---------- generating ----------
  if (phase === "generating") {
    return <Generating onDone={onDone} />;
  }

  // ---------- flow ----------
  return (
    <Shell>
      <TopBar onBack={back} progress={showProgress ? progress : undefined} />
      {error && <Banner>{error}</Banner>}

      <div key={step} className="step-in flex min-h-0 flex-1 flex-col">
        {current.kind === "say" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <SpeechBubble>{current.text}</SpeechBubble>
            <Mascot size={132} />
          </div>
        )}

        {current.kind === "question" && (
          <QuestionScreen
            question={QUESTIONS[current.index]}
            answers={answers}
            onSingle={pickSingle}
            onToggle={toggleMulti}
          />
        )}

        {current.kind === "household" && (
          <HouseholdStep value={household} onChange={setHousehold} />
        )}

        {current.kind === "restrictions" && (
          <RestrictionsStep
            selected={restrictions}
            none={noneChosen}
            onToggle={toggleRestriction}
            onNone={chooseNone}
          />
        )}

        {current.kind === "shopping" && <ShoppingStep value={shopping} onChange={setShopping} />}

        {current.kind === "dob" && (
          <div className="flex flex-1 flex-col gap-4 pt-2">
            <h2 className="text-2xl font-extrabold">Ta date de naissance&nbsp;?</h2>
            <WheelDatePicker value={birthdate} onChange={setBirthdate} max={todayISO} alwaysOpen />
          </div>
        )}

        {current.kind === "name" && (
          <div className="flex flex-1 flex-col gap-4 pt-2">
            <h2 className="text-2xl font-extrabold">Comment tu t&apos;appelles&nbsp;?</h2>
            <GateField label="Prénom" value={firstName} onChange={setFirstName} placeholder="Boris" autoFocus />
            <GateField label="Nom" value={lastName} onChange={setLastName} placeholder="Cherny" />
            <SocialButtons onSocial={onSocial} verb="S'inscrire" busy={busy} appleOk={appleOk} />
            {info && !error && <Banner>{info}</Banner>}
          </div>
        )}

        {current.kind === "email" && (
          <div className="flex flex-1 flex-col gap-4 pt-2">
            <h2 className="text-2xl font-extrabold">
              Ton email{firstName ? `, ${firstName}` : ""}&nbsp;?
            </h2>
            <GateField label="Email" value={email} onChange={setEmail} placeholder="toi@email.com" type="email" autoFocus />
          </div>
        )}

        {current.kind === "password" && (
          <div className="flex flex-1 flex-col gap-4 pt-2">
            <h2 className="text-2xl font-extrabold">Crée un mot de passe</h2>
            <div>
              <GateField label="Mot de passe" value={password} onChange={setPassword} placeholder="8 caractères min. (évite azerty, 123456…)" type="password" autoComplete="new-password" autoFocus />
              <PasswordStrength password={password} />
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer CTA (not shown on single-select questions which auto-advance) */}
      <FooterCta
        current={current}
        answers={answers}
        state={{ firstName, birthdate, email, password }}
        busy={busy}
        onNext={next}
        onCreate={createAccount}
        onEmailNext={checkEmailThenNext}
        restrictionsChosen={restrictions.length > 0 || noneChosen}
      />
    </Shell>
  );
}

// ---------- primitives ----------

function Shell({ children }: { children: React.ReactNode }) {
  // The Shell stays a full-screen fixed panel and does NOT shift up with the keyboard: the footer
  // CTA is anchored at the bottom and the keyboard simply overlays it, so "Continuer" never jumps
  // when you focus a field (Paul's ask). The focused input is scrolled into view by the browser.
  return (
    <div
      className="page-in fixed inset-0 z-[90] flex flex-col overflow-hidden overscroll-none bg-[var(--primary)] px-6 pt-[max(1rem,env(safe-area-inset-top))] text-white"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

function TopBar({ onBack, progress }: { onBack: () => void; progress?: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Retour"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/90 transition active:scale-90"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      {progress !== undefined && (
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(6, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-bold">{children}</p>;
}

function Mascot({ size = 120 }: { size?: number }) {
  // Placeholder plate mascot: the app logo. Swap for the dedicated visual later.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="" style={{ height: size, width: size }} className="object-contain" />;
}

function SpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative max-w-[19rem] rounded-2xl bg-white px-4 py-3 text-lg font-bold text-stone-800 shadow-[0_8px_28px_rgba(43,42,40,0.2)]">
      {children}
      <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" aria-hidden />
    </div>
  );
}

function SocialButtons({
  onSocial,
  verb,
  busy,
  appleOk,
}: {
  onSocial: (provider: "google" | "apple") => void;
  verb: string;
  busy?: boolean;
  appleOk?: boolean;
}) {
  const base =
    "flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-base font-bold transition active:scale-95 disabled:opacity-60";
  return (
    <div className="mt-1 flex flex-col gap-2.5">
      <div className="my-1 flex items-center gap-3 text-xs font-bold text-white/60">
        <span className="h-px flex-1 bg-white/25" />
        OU
        <span className="h-px flex-1 bg-white/25" />
      </div>
      {/* Sign in with Apple goes FIRST / above Google. Apple's HIG asks for it to be at least as
          prominent as other providers, and reviewers have rejected apps that placed it below Google
          (Guideline 4.8). Shown only when it actually works (native, or web with a Services ID) so it
          is never a dead button. */}
      {appleOk && (
        <button type="button" disabled={busy} onClick={() => onSocial("apple")} className={`${base} bg-black text-white`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/apple.webp" alt="" className="h-5 w-5 object-contain" /> {verb} avec Apple
        </button>
      )}
      <button type="button" disabled={busy} onClick={() => onSocial("google")} className={`${base} bg-white text-stone-800`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/google.png" alt="" className="h-5 w-5 object-contain" /> {verb} avec Google
      </button>
    </div>
  );
}

function QuestionScreen({
  question,
  answers,
  onSingle,
  onToggle,
}: {
  question: Question;
  answers: Record<string, string | string[]>;
  onSingle: (key: string, id: string) => void;
  onToggle: (key: string, id: string) => void;
}) {
  const selected = answers[question.key];
  const isSel = (id: string) =>
    question.kind === "single" ? selected === id : Array.isArray(selected) && selected.includes(id);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-start gap-3 pt-1">
        <Mascot size={64} />
        <div className="relative mt-1 rounded-2xl bg-white px-3.5 py-2.5 text-base font-bold text-stone-800 shadow-[0_6px_20px_rgba(43,42,40,0.18)]">
          {question.q}
          <span className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 bg-white" aria-hidden />
        </div>
      </div>
      {question.kind === "multi" && (
        <p className="-mb-1 text-center text-[1.2rem] font-bold text-white/85">Plusieurs choix possibles</p>
      )}
      {/* Scrollable so every option is reachable when the list is taller than the screen (the Shell
          is overflow-hidden, so without this the last choices are simply cut off). The negative
          margin + matching padding give the buttons room to breathe inside the scroller: an
          overflow container would otherwise clip the selected border and the 3D shadow. */}
      <div className="-mx-1.5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-1.5 pb-1.5">
        {question.options.map((o) => {
          const on = isSel(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => (question.kind === "single" ? onSingle(question.key, o.id) : onToggle(question.key, o.id))}
              aria-pressed={on}
              className={`btn-3d w-full shrink-0 justify-start gap-3 px-4 py-4 text-left text-base ${
                on
                  ? "border-2 border-[var(--primary)] bg-white text-[var(--primary-dark)] [--btn-shadow:var(--primary)]"
                  : "btn-neutral"
              }`}
            >
              <span className="text-2xl" aria-hidden>{o.emoji}</span>
              <span className="flex-1">{o.label}</span>
              {question.kind === "multi" && (
                <span
                  aria-hidden
                  className={`flex h-6 w-6 items-center justify-center rounded-md border-2 text-sm font-black ${
                    on ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-stone-300 text-transparent"
                  }`}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// +/- count selector in the app's tactile clay style.
function Stepper({
  label,
  emoji,
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="clay-card flex items-center justify-between gap-3 border-2 border-stone-100 bg-white px-4 py-3 text-stone-800">
      <span className="flex items-center gap-2 text-base font-extrabold">
        <span className="text-2xl" aria-hidden>{emoji}</span> {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Moins de ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="btn-3d btn-neutral h-10 w-10 rounded-full text-2xl leading-none disabled:opacity-40"
        >
          −
        </button>
        <span className="w-7 text-center text-2xl font-extrabold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Plus de ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="btn-3d btn-primary h-10 w-10 rounded-full text-2xl leading-none disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

function HouseholdStep({
  value,
  onChange,
}: {
  value: { adults: number; children: number };
  onChange: (v: { adults: number; children: number }) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 pt-2">
      <div>
        <h2 className="text-2xl font-extrabold">Vous êtes combien à la maison&nbsp;?</h2>
        <p className="mt-1 font-semibold text-white/80">Pour proposer les bonnes quantités.</p>
      </div>
      <Stepper label="Adultes" emoji="🧑" value={value.adults} min={1} onChange={(adults) => onChange({ ...value, adults })} />
      <Stepper label="Enfants" emoji="🧒" value={value.children} min={0} onChange={(children) => onChange({ ...value, children })} />
    </div>
  );
}

function RestrictionsStep({
  selected,
  none,
  onToggle,
  onNone,
}: {
  selected: string[];
  none: boolean;
  onToggle: (id: string) => void;
  onNone: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 pt-2">
      <div>
        <h2 className="text-2xl font-extrabold">Des restrictions&nbsp;?</h2>
        <p className="mt-1 font-semibold text-white/80">Choisis ce qui te concerne (ou aucune).</p>
      </div>
      {/* When "Aucune restriction" is active, the six choices grey out (but a tap still
          re-activates them and cancels the "none" choice). */}
      <div className={`grid grid-cols-3 gap-2.5 transition ${none ? "opacity-40" : ""}`}>
        {RESTRICTIONS.map((r) => {
          const on = selected.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onToggle(r.id)}
              aria-pressed={on}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 bg-white px-1.5 py-4 text-center text-[13px] font-bold leading-tight transition active:scale-95 ${
                on
                  ? "border-[var(--primary)] text-[var(--primary-dark)] shadow-[0_4px_0_var(--primary)]"
                  : "border-stone-200 text-stone-700 shadow-[0_4px_0_var(--neutral-shadow)]"
              }`}
            >
              <span className="text-3xl" aria-hidden>{r.emoji}</span>
              {r.label}
            </button>
          );
        })}
      </div>
      {/* Explicit "no restriction" choice: transparent by default, filled when active. */}
      <button
        type="button"
        onClick={onNone}
        aria-pressed={none}
        className={`mx-auto rounded-full border-2 px-6 py-2.5 text-sm font-extrabold transition active:scale-95 ${
          none
            ? "border-white bg-white text-[var(--primary-dark)]"
            : "border-white/60 bg-transparent text-white"
        }`}
      >
        Aucune restriction
      </button>
    </div>
  );
}

function ShoppingStep({
  value,
  onChange,
}: {
  value: ShoppingValue;
  onChange: (v: ShoppingValue) => void;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "loading" | "done" | "error" | "markets_error">(
    value.city ? "done" : "idle",
  );
  const [cp, setCp] = useState(value.postalCode ?? "");
  const [cities, setCities] = useState<CitySuggestion[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const chosen = marketsOf(value); // keys of the stores already picked (multi-select)

  // Supermarkets with Drive or home delivery within 10 km. Auto-retries a few times
  // (Overpass is flaky) before ever surfacing an error, so the "impossible de charger"
  // message becomes very rare. Distinguishes a down service from a genuinely empty area.
  async function loadMarkets(lat: number, lon: number, attempt = 0) {
    if (attempt === 0) {
      setStatus("loading");
      setMarkets([]);
    }
    try {
      setMarkets(await fetchDriveMarkets(lat, lon));
      setStatus("done");
    } catch {
      if (attempt < 3) {
        await new Promise((res) => setTimeout(res, 1200));
        return loadMarkets(lat, lon, attempt + 1);
      }
      setStatus("markets_error");
    }
  }

  function useLocation() {
    if (!navigator.geolocation) return setStatus("error");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const { postcode, city } = await reverseGeocode(lat, lon);
          setCp(postcode ?? "");
          onChange({ ...value, postalCode: postcode, city, markets: [], lat, lon });
        } catch {
          onChange({ ...value, lat, lon, markets: [] });
        }
        setCities([]);
        await loadMarkets(lat, lon);
      },
      () => setStatus("error"),
      { timeout: 10000, enableHighAccuracy: false },
    );
  }

  // As a full 5-digit postal code is typed, suggest the matching communes right below.
  async function onCpChange(v: string) {
    const digits = v.replace(/[^0-9]/g, "").slice(0, 5);
    setCp(digits);
    if (digits.length !== 5) return setCities([]);
    try {
      setCities(await fetchCitiesByPostcode(digits));
    } catch {
      setCities([]);
    }
  }

  function pickCity(c: CitySuggestion) {
    onChange({ ...value, postalCode: c.postcode, city: c.name, markets: [], lat: c.lat, lon: c.lon });
    setCities([]);
    void loadMarkets(c.lat, c.lon);
  }

  // Toggle a store in/out of the multi-select (no partner flow here — that happens later,
  // on the shopping-list screen when the user chooses to order online).
  function toggleMarket(key: string) {
    const set = new Set(chosen);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    onChange({ ...value, markets: [...set] });
  }

  function retryMarkets() {
    if (value.lat != null && value.lon != null) void loadMarkets(value.lat, value.lon);
  }

  function reset() {
    onChange({});
    setCp("");
    setCities([]);
    setMarkets([]);
    setStatus("idle");
  }

  return (
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-3 pt-2">
      <div>
        <h2 className="text-2xl font-extrabold">Où fais-tu tes courses&nbsp;?</h2>
        <p className="mt-1 font-semibold text-white/80">On te montre les Drive et livraisons juste à côté.</p>
      </div>

      {/* Value prop, in the app's soft-card style */}
      <div className="flex items-start gap-3 rounded-2xl bg-white/15 p-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white" aria-hidden>
          <Icon name="shopping-cart" size={20} />
        </span>
        <p className="text-sm font-semibold leading-snug text-white/90">
          En choisissant tes repas, À&nbsp;table remplit tout seul ta liste de courses avec les
          ingrédients qu&apos;il te faut.
        </p>
      </div>

      {!(value.city || value.lat != null) ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={useLocation}
            disabled={status === "locating"}
            className="btn-3d btn-on-orange py-4 text-base disabled:opacity-60"
          >
            {status === "locating" ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Localisation…
              </span>
            ) : (
              "Utiliser ma position"
            )}
          </button>

          <div className="flex items-center gap-3 text-xs font-bold text-white/60">
            <span className="h-px flex-1 bg-white/25" /> OU <span className="h-px flex-1 bg-white/25" />
          </div>

          {/* Postal code, with the associated cities glued right below as you type. */}
          <div>
            <input
              value={cp}
              onChange={(e) => onCpChange(e.target.value)}
              inputMode="numeric"
              placeholder="Entre ton code postal"
              className="w-full rounded-2xl border-2 border-white/30 bg-white px-4 py-3.5 text-base font-semibold text-stone-900 outline-none transition focus:border-white"
            />
            {cities.length > 0 && (
              <div className="step-in mt-1 overflow-hidden rounded-xl border-2 border-white/30 bg-white">
                {cities.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => pickCity(c)}
                    className="flex w-full items-center gap-2 border-b border-stone-100 px-3 py-2.5 text-left text-sm font-bold text-stone-800 transition last:border-0 active:bg-orange-50"
                  >
                    <span className="text-stone-400">{c.postcode}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {status === "error" && (
            <p className="text-sm font-semibold text-white/85">
              Localisation indisponible. Entre ton code postal ci-dessus.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/15 px-4 py-3">
          <span className="truncate font-extrabold">
            {value.city ? `${value.postalCode ?? ""} ${value.city}` : "Autour de ta position"}
          </span>
          <button type="button" onClick={reset} className="shrink-0 text-sm font-bold text-white/85 underline">
            Modifier
          </button>
        </div>
      )}

      {status === "loading" && (
        <p className="flex items-center gap-2 text-sm font-semibold text-white/80">
          <Spinner /> Recherche des magasins autour…
        </p>
      )}

      {status === "markets_error" && (
        <div className="step-in flex flex-col gap-2 rounded-xl bg-white/15 px-3 py-2.5">
          <p className="text-sm font-semibold text-white/90">
            Impossible de charger les magasins pour l&apos;instant (service momentanément indisponible).
          </p>
          <button type="button" onClick={retryMarkets} className="btn-3d btn-on-orange self-start px-4 py-2 text-sm">
            Réessayer
          </button>
        </div>
      )}

      {status === "done" &&
        (markets.length > 0 ? (
          <div className="step-in flex flex-col gap-2.5">
            <p className="text-center text-[1.2rem] font-bold text-white/85">Plusieurs choix possibles</p>
            {markets.map((m) => (
              <MarketCard
                key={m.key}
                market={m}
                selected={chosen.includes(m.key)}
                onClick={() => toggleMarket(m.key)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-white/80">
            Aucun Drive ni livraison trouvé dans un rayon de 10&nbsp;km. Tu pourras choisir plus tard.
          </p>
        ))}
    </div>
  );
}

function FooterCta({
  current,
  answers,
  state,
  busy,
  onNext,
  onCreate,
  onEmailNext,
  restrictionsChosen,
}: {
  current: Step;
  answers: Record<string, string | string[]>;
  state: { firstName: string; birthdate: string; email: string; password: string };
  busy: boolean;
  onNext: () => void;
  onCreate: (e: FormEvent) => void;
  onEmailNext: (e: FormEvent) => void;
  restrictionsChosen: boolean;
}) {
  let disabled = false;
  let label = "Continuer";
  let action: (e: FormEvent) => void = (e) => { e.preventDefault(); onNext(); };

  // The shopping step just advances (store choice is optional, no partner flow here).
  if (current.kind === "restrictions") {
    disabled = !restrictionsChosen; // must pick a restriction OR "Aucune restriction"
  } else if (current.kind === "question") {
    const q = QUESTIONS[current.index];
    const sel = answers[q.key];
    disabled = q.kind === "single" ? !sel : !Array.isArray(sel) || sel.length === 0;
  } else if (current.kind === "dob") {
    disabled = !/^\d{4}-\d{2}-\d{2}$/.test(state.birthdate);
  } else if (current.kind === "name") {
    disabled = state.firstName.trim().length < 1;
  } else if (current.kind === "email") {
    label = "Continuer";
    disabled = !isValidEmail(state.email) || busy;
    action = onEmailNext;
  } else if (current.kind === "password") {
    label = "Créer mon compte";
    disabled = !isAcceptablePassword(state.password) || busy;
    action = onCreate;
  }

  const loading = busy && (current.kind === "email" || current.kind === "password");

  return (
    <form onSubmit={action} className="pt-3">
      <button
        type="submit"
        disabled={disabled}
        className="btn-3d btn-on-orange w-full py-4 text-lg font-extrabold disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center justify-center">
            <Spinner className="h-5 w-5" />
          </span>
        ) : (
          label
        )}
      </button>
    </form>
  );
}

// Duolingo-style "preparing your experience" screen: checklist reveals over ~2s,
// then hands off via onDone(). If the hand-off does not advance (e.g. the post-signup
// reload fails and we stay mounted), a retry appears so the user is never stuck.
function Generating({ onDone }: { onDone: () => void | Promise<void> }) {
  const [n, setN] = useState(0);
  const [retry, setRetry] = useState(false);
  const lines = ["On analyse tes réponses", "On prépare ton espace", "C'est prêt !"];
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const timers = [
      setTimeout(() => setN(1), 650),
      setTimeout(() => setN(2), 1300),
      setTimeout(() => setN(3), 1950),
      setTimeout(() => { void doneRef.current(); }, 2500),
      // Still mounted well after the hand-off call -> it did not advance; offer a retry.
      setTimeout(() => setRetry(true), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="page-in fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-[var(--primary)] px-8 text-white">
      <img src="/logo.png" alt="" className="splash-bob h-24 w-24 object-contain" />
      <div className="flex w-full max-w-xs flex-col gap-3">
        {lines.map((l, i) => (
          <div key={i} className={`flex items-center gap-3 text-lg font-bold transition-opacity duration-300 ${n > i ? "opacity-100" : "opacity-30"}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${n > i ? "bg-white text-[var(--primary)]" : "bg-white/25"}`} aria-hidden>
              {n > i ? "✓" : ""}
            </span>
            {l}
          </div>
        ))}
      </div>
      {retry && (
        <button
          type="button"
          onClick={() => { setRetry(false); void doneRef.current(); }}
          className="btn-3d btn-on-orange px-6 py-3 text-base font-extrabold"
        >
          Ça bloque ? Réessayer
        </button>
      )}
    </div>
  );
}
