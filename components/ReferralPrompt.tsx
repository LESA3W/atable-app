"use client";

import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { haptic } from "@/lib/native";
import { markReferralPromptDone, setReferral } from "@/lib/referral";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * First launch: "do you have a code?".
 *
 * This screen is the ONLY thing that carries a referral across an App Store install. The link banks
 * the code in Safari; the app runs in a webview with its own storage, so nothing carries over. Asking
 * once, here, is what keeps the sharer's counter honest.
 *
 * Shown once and only once — answering it either way marks it done, and it is skipped outright when
 * a code was already banked by the link.
 */
export function ReferralPrompt({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  function finish() {
    markReferralPromptDone();
    onDone();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!setReferral(value)) {
      setError(true);
      void haptic("error");
      return;
    }
    void haptic("success");
    finish();
  }

  return (
    <div className="page-in fixed inset-0 z-[92] overflow-y-auto overscroll-contain bg-[var(--primary)] text-center text-white">
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 40 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          transition={reduce ? { duration: 0.3 } : { type: "spring", stiffness: 240, damping: 16 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascotte.png" alt="" className="h-28 w-28 object-contain" aria-hidden />
        </motion.div>

        <motion.h1
          className="mt-3 text-2xl font-extrabold tracking-tight"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.08 }}
        >
          Tu as un code d&apos;invitation&nbsp;?
        </motion.h1>
        <motion.p
          className="mt-1.5 font-semibold text-white/85"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.14 }}
        >
          Une personne qui a déjà À&nbsp;table peut te donner un code, et tu lui fais profiter d&apos;un{" "}
          <u className="underline decoration-2 underline-offset-4">accès premium illimité gratuit à vie</u>.
        </motion.p>

        <motion.form
          onSubmit={submit}
          className="mt-5 flex w-full flex-col gap-3"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.2 }}
        >
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toUpperCase());
              setError(false);
            }}
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Code d'invitation"
            aria-invalid={error || undefined}
            placeholder="Ex : A7X2B9"
            className={`w-full rounded-2xl border-2 bg-white px-4 py-4 text-center font-mono text-xl font-extrabold tracking-[0.25em] text-stone-800 outline-none placeholder:tracking-normal placeholder:font-sans placeholder:text-stone-400 ${
              error ? "border-red-400" : "border-white"
            }`}
          />
          {error && <p className="-mt-1 text-sm font-bold text-white">Ce code n&apos;a pas la bonne forme.</p>}
          <button
            type="submit"
            disabled={value.trim().length < 4}
            className="btn-3d btn-on-orange py-4 text-lg font-extrabold disabled:opacity-45"
          >
            Valider mon code
          </button>
          <button
            type="button"
            onClick={() => {
              void haptic("light");
              finish();
            }}
            className="rounded-full px-6 py-3 text-base font-extrabold text-white/85 underline decoration-white/40 underline-offset-4"
          >
            Non, je n&apos;ai pas de code ☹️
          </button>
        </motion.form>
      </div>
    </div>
  );
}
