"use client";

import { useState } from "react";

// Shared building blocks for the onboarding gates (account + family).

export function GateButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-3d btn-on-orange w-full py-4 text-lg font-extrabold"
    >
      {children}
    </button>
  );
}

export function GateField({
  label,
  value,
  onChange,
  placeholder,
  mono,
  autoFocus,
  type = "text",
  max,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  autoFocus?: boolean;
  type?: string;
  max?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && show ? "text" : type;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-white/85">{label}</span>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          max={max}
          autoCapitalize={type === "email" ? "none" : undefined}
          autoComplete={
            autoComplete ?? (type === "password" ? "current-password" : type === "email" ? "email" : undefined)
          }
          className={`w-full rounded-xl border-2 border-white/30 bg-white/95 px-3 py-2.5 text-base text-stone-900 outline-none focus:border-white ${
            isPassword ? "pr-11" : ""
          } ${mono ? "font-mono tracking-wide" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-500 transition active:scale-90"
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 2.94M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9.1 9.1 0 0 0 3.6-.74" />
      <path d="m2 2 20 20" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function gateError(status: number, code?: string): string {
  if (code === "email_taken") return "Cet email a déjà un compte.";
  if (code === "bad_email") return "Email invalide.";
  if (code === "weak_password") return "Mot de passe trop court (6 min).";
  if (code === "no_family") return "Code inconnu.";
  if (code === "already_in_family") return "Tu es déjà dans une famille/groupe.";
  if (status === 401) return "Email ou mot de passe incorrect.";
  return "Une erreur est survenue.";
}
