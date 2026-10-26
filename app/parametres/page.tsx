"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { useFamily } from "@/components/ProfileProvider";
import { apiFetch } from "@/lib/api";
import { haptic } from "@/lib/native";
import { AVATAR_PALETTE } from "@/lib/initials";
import { ShoppingEditor } from "@/components/ShoppingEditor";
import { AppliancesEditor } from "@/components/AppliancesEditor";
import { Icon } from "@/components/Icon";
import { HoldButton } from "@/components/HoldButton";
import { ReferralCard } from "@/components/ReferralCard";
import { marketsOf } from "@/lib/shopping";
import { Spinner } from "@/components/Spinner";

// Center-crop the chosen image to a small square JPEG data URL (kept tiny so it can
// live in the member row and render instantly as the avatar).
function fileToSquareDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no_ctx"));
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("img_error"));
    };
    img.src = url;
  });
}

export default function ParametresPage() {
  const { me, family, families, members, switchFamily, refresh, logout } = useFamily();




  // avatar colour + photo
  const [colorErr, setColorErr] = useState("");
  const [savingColor, setSavingColor] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  // editable pseudo (social sign-in pre-fills the name from the Google/Apple account)
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameErr, setNameErr] = useState("");

  // Account deletion (App Store Guideline 5.1.1(v)): two-step so a stray tap can't wipe an account.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  async function setColor(hex: string) {
    setColorErr("");
    setSavingColor(true);
    try {
      const res = await apiFetch("/api/me", { method: "PATCH", body: JSON.stringify({ color: hex }) });
      if (!res.ok) throw new Error("color_failed");
      await refresh();
    } catch {
      setColorErr("Impossible de changer la couleur.");
    } finally {
      setSavingColor(false);
    }
  }

  async function onPickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setPhotoErr("");
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToSquareDataUrl(file, 256);
      const res = await apiFetch("/api/me", { method: "PATCH", body: JSON.stringify({ photo: dataUrl }) });
      if (!res.ok) throw new Error("photo_failed");
      await refresh();
    } catch {
      setPhotoErr("Photo impossible à enregistrer.");
    } finally {
      setPhotoBusy(false);
    }
  }

  // Remove the custom photo -> the avatar falls back to the initials + colour.
  async function removePhoto() {
    setPhotoErr("");
    setPhotoBusy(true);
    try {
      const res = await apiFetch("/api/me", { method: "PATCH", body: JSON.stringify({ photo: null }) });
      if (!res.ok) throw new Error("photo_failed");
      await refresh();
    } catch {
      setPhotoErr("Impossible de retirer la photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function startEditName() {
    setNameErr("");
    setNameVal(me.name);
    setEditingName(true);
  }
  async function saveName() {
    const v = nameVal.trim();
    if (!v || v === me.name) {
      setEditingName(false);
      return;
    }
    setNameErr("");
    setNameBusy(true);
    try {
      const res = await apiFetch("/api/me", { method: "PATCH", body: JSON.stringify({ name: v }) });
      if (!res.ok) throw new Error("name_failed");
      await refresh();
      setEditingName(false);
    } catch {
      setNameErr("Impossible de changer le pseudo.");
    } finally {
      setNameBusy(false);
    }
  }

  async function deleteMyAccount() {
    setDeleting(true);
    setDeleteErr("");
    try {
      const res = await apiFetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      // Data is gone: drop the token and bounce to the fresh-start screen.
      logout();
    } catch {
      setDeleting(false);
      setDeleteErr("La suppression a échoué. Réessaie dans un instant.");
    }
  }







  return (
    <div className="flex flex-col gap-5">
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Mon Profil</h1>
        <p className="mt-1 text-stone-700">Ton compte et ta famille/groupe.</p>
      </section>

      <section className="clay-card border-2 border-stone-100 p-4">
        <div className="flex items-center gap-3">
          {/* Tap the avatar to set a custom photo (opens the OS photo picker, which is
              where iOS asks for photo permission). A subtle layer + camera hints it. */}
          <label className="relative shrink-0 cursor-pointer transition active:scale-95" title="Changer ma photo de profil">
            <Avatar person={me} size={52} />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
              {photoBusy ? (
                <Spinner className="h-4 w-4 text-white" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white" aria-hidden>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={onPickPhoto} disabled={photoBusy} />
          </label>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveName();
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  autoFocus
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  maxLength={40}
                  placeholder="Ton pseudo"
                  className="min-w-0 flex-1 rounded-lg border-2 border-stone-200 px-2 py-1 text-lg font-extrabold text-stone-900 focus:border-[var(--primary)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={nameBusy || !nameVal.trim()}
                  aria-label="Enregistrer le pseudo"
                  className="shrink-0 rounded-full bg-[var(--primary)] p-1.5 text-white transition active:scale-90 disabled:opacity-50"
                >
                  {nameBusy ? (
                    <Spinner className="h-4 w-4 text-white" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  aria-label="Annuler"
                  className="shrink-0 rounded-full bg-stone-100 p-1.5 text-stone-500 transition active:scale-90"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={startEditName}
                title="Modifier mon pseudo"
                className="group flex max-w-full items-center gap-1.5"
              >
                <span className="truncate text-lg font-extrabold text-stone-900">{me.name}</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-stone-400 transition group-active:scale-90" aria-hidden>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            )}
            <div className="truncate text-sm font-semibold text-stone-500">
              {family.name} · {members.length} membre{members.length > 1 ? "s" : ""}
            </div>
          </div>
          {me.photo && (
            <button
              type="button"
              onClick={removePhoto}
              disabled={photoBusy}
              className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-red-600 transition active:scale-95 disabled:opacity-50"
            >
              Retirer la photo
            </button>
          )}
        </div>
        {/* Avatar colour, inline on one row (replaces the old standalone "Ma couleur" card): the
            custom picker first, then the 10 palette swatches. 24px each, spread edge-to-edge with
            justify-between so the "+" and the last swatch sit the same distance from the card's
            left/right padding. */}
        <div className="mt-3 flex items-center justify-between">
          <label
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-stone-300 text-sm font-bold leading-none text-stone-400 transition active:scale-90"
            aria-label="Couleur personnalisée"
            title="Couleur personnalisée"
          >
            +
            <input
              type="color"
              className="sr-only"
              defaultValue={me.color ?? "#FB8C00"}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          {AVATAR_PALETTE.map((c) => {
            const on = (me.color ?? "").toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                disabled={savingColor}
                aria-label={`Couleur ${c}`}
                aria-pressed={on}
                className={`h-6 w-6 shrink-0 rounded-full shadow-sm transition active:scale-90 disabled:opacity-50 ${
                  on ? "ring-2 ring-stone-900 ring-offset-1" : "ring-1 ring-black/10"
                }`}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
        {nameErr && <p className="mt-1 text-sm font-semibold text-red-600">{nameErr}</p>}
        {photoErr && <p className="mt-1 text-sm font-semibold text-red-600">{photoErr}</p>}
        {colorErr && <p className="mt-1 text-sm font-semibold text-red-600">{colorErr}</p>}
      </section>

      {/* Everything family/group now lives in its own hub — this is the single entry point. */}
      <Link
        href="/famille"
        className="clay-card flex items-center gap-3 border-2 border-[var(--primary)]/25 bg-[var(--primary-soft)] p-4 font-bold text-stone-800 transition active:scale-[0.99]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--primary)]">
          <Icon name="users" size={20} />
        </span>
        <span className="flex-1">Mes familles / Groupes</span>
        <Icon name="chevron-right" size={20} className="text-stone-400" />
      </Link>

      {/* Shopping: change the location and the Drive/market at any time. */}
      <section className="clay-card border-2 border-stone-100 p-4">
        <h2 className="text-lg font-extrabold">Mes courses</h2>
        <p className="mb-3 text-sm text-stone-500">
          Ta localisation et ton Drive/livraison, modifiables à tout moment.
        </p>
        <ShoppingEditor
          initial={{
            postalCode: me.shopping?.postalCode ?? undefined,
            city: me.shopping?.city ?? undefined,
            markets: marketsOf(me.shopping),
            lat: me.shopping?.lat ?? undefined,
            lon: me.shopping?.lon ?? undefined,
          }}
          onSaved={refresh}
        />
      </section>

      {/* Edit the brand/model of appliances that need it — only shows once one is selected. */}
      <AppliancesEditor />

      {/* Access + referral. The ONLY way back to the share link once the signup screen is gone —
          without it the loop dies for anyone who tapped "Plus tard". */}
      <ReferralCard />

      <section className="flex flex-col gap-2.5">
        <Link
          href="/preferences"
          className="clay-card flex items-center gap-3 border-2 border-stone-100 p-4 font-bold text-stone-800 transition active:scale-[0.99]"
        >
          <Icon name="heart" size={20} />
          Revoir mes goûts
        </Link>
        <Link
          href="/regimes"
          className="clay-card flex items-center gap-3 border-2 border-stone-100 p-4 font-bold text-stone-800 transition active:scale-[0.99]"
        >
          <Icon name="saladbowl" size={20} />
          Revoir mes régimes
        </Link>
        <button
          type="button"
          onClick={logout}
          className="clay-card flex items-center gap-3 border-2 border-stone-100 p-4 text-left font-bold text-red-600 transition active:scale-[0.99]"
        >
          <Icon name="log-out" size={20} />
          Se déconnecter
        </button>

        {/* Danger zone: permanent account deletion (App Store Guideline 5.1.1(v)). Two-step confirm. */}
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => {
              void haptic("medium");
              setConfirmDelete(true);
            }}
            className="clay-card flex items-center gap-3 border-2 border-stone-100 p-4 text-left font-bold text-red-600 transition active:scale-[0.99]"
          >
            <Icon name="trash" size={20} />
            Supprimer mon compte
          </button>
        ) : (
          <div className="step-in flex flex-col gap-3 rounded-2xl border-2 border-red-200 bg-red-50/60 p-4">
            <p className="text-sm font-bold text-red-700">Supprimer définitivement ton compte ?</p>
            <p className="text-sm text-stone-600">
              Ton identifiant, ton profil et tes goûts seront effacés pour de bon. Cette action est
              irréversible.
            </p>
            {/* Hold, don't tap: the sweep has to finish before anything is deleted. */}
            <div className="flex flex-col gap-2">
              <HoldButton
                fullWidth
                icon="trash"
                label="Maintiens pour supprimer"
                holdingLabel="Ne lâche pas…"
                busy={deleting}
                busyLabel="Suppression…"
                onComplete={deleteMyAccount}
              />
              <p className="text-center text-xs font-semibold text-stone-500">
                Appuie et garde le doigt appuyé jusqu&apos;au bout
              </p>
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); setDeleteErr(""); }}
                disabled={deleting}
                className="rounded-full border-2 border-stone-200 px-4 py-2 text-sm font-bold text-stone-600"
              >
                Annuler
              </button>
            </div>
            {deleteErr && <p className="text-sm font-semibold text-red-700">{deleteErr}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
