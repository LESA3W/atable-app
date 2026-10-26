"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";
import { useFamily } from "@/components/ProfileProvider";
import { apiFetch } from "@/lib/api";

// One place for everything family/group: who's in it, the invite code, adding a child without an
// account, joining/creating another family, switching and leaving. Replaces the scattered sections
// that used to live in Settings — reached from the "Ajouter un compte" card in Mes goûts and from a
// single link in Settings. Reuses the existing family APIs (create/join/members/admin/switch/leave).
export default function FamillePage() {
  const { me, family, families, members, switchFamily, refresh } = useFamily();
  const isAdmin = me.role === "admin";
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [famError, setFamError] = useState("");
  const [copied, setCopied] = useState(false);

  // personal-code invite
  const [myCode, setMyCode] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviting, setInviting] = useState(false);

  // add a child / profile without an account
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childIsKid, setChildIsKid] = useState(true);

  // admin actions
  const [promoting, setPromoting] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // join / create another
  const [panel, setPanel] = useState<null | "join" | "create">(null);
  const [joinCode, setJoinCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMsg, setGroupMsg] = useState("");

  // leave
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(family.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the code stays visible to copy by hand */
    }
  }

  useEffect(() => {
    let alive = true;
    apiFetch("/api/family/invite-code")
      .then((r) => r.json())
      .then((d) => alive && setMyCode(typeof d?.code === "string" ? d.code : null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function sendInvite(e: FormEvent) {
    e.preventDefault();
    setInviteMsg("");
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4) return setInviteMsg("Entre un code valide.");
    setInviting(true);
    try {
      const res = await apiFetch("/api/invites", { method: "POST", body: JSON.stringify({ op: "create", code }) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 404) setInviteMsg("Aucun compte avec ce code.");
      else if (res.status === 409 && d?.error === "already_member") setInviteMsg("Cette personne est déjà dans la famille/groupe.");
      else if (res.status === 409 && d?.error === "self") setInviteMsg("C'est ton propre code 🙂");
      else if (!res.ok) setInviteMsg("Invitation impossible.");
      else {
        setInviteMsg(`Invitation envoyée à ${d?.name ?? "ce compte"} ! Il doit l'accepter.`);
        setInviteCode("");
      }
    } catch {
      setInviteMsg("Invitation impossible.");
    } finally {
      setInviting(false);
    }
  }

  async function addChild(e: FormEvent) {
    e.preventDefault();
    const name = childName.trim();
    if (!name) return;
    setBusy(true);
    setFamError("");
    try {
      const res = await apiFetch("/api/family/members", { method: "POST", body: JSON.stringify({ name, isChild: childIsKid }) });
      if (!res.ok) throw new Error("add_failed");
      await refresh();
      setChildName("");
      setChildIsKid(true);
      setAddingChild(false);
    } catch {
      setFamError("Impossible d'ajouter ce profil.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(id: string) {
    setBusy(true);
    setFamError("");
    try {
      const res = await apiFetch(`/api/family/members?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("remove_failed");
      await refresh();
      setConfirmRemove(null);
    } catch {
      setFamError("Impossible de retirer ce membre.");
    } finally {
      setBusy(false);
    }
  }

  async function promote(memberId: string, transfer: boolean) {
    setBusy(true);
    setFamError("");
    try {
      const res = await apiFetch("/api/family/admin", { method: "POST", body: JSON.stringify({ memberId, transfer }) });
      if (!res.ok) throw new Error("promote_failed");
      await refresh();
      setPromoting(null);
    } catch {
      setFamError("Impossible de nommer cet admin.");
    } finally {
      setBusy(false);
    }
  }

  async function submitJoin(e: FormEvent) {
    e.preventDefault();
    setGroupMsg("");
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return setGroupMsg("Entre un code valide.");
    setBusy(true);
    try {
      const res = await apiFetch("/api/family/join", { method: "POST", body: JSON.stringify({ code }) });
      if (res.status === 409) setGroupMsg("Tu fais déjà partie de cette famille/groupe.");
      else if (res.status === 404) setGroupMsg("Ce code ne correspond à aucune famille/groupe.");
      else if (!res.ok) setGroupMsg("Impossible d'envoyer la demande.");
      else {
        setGroupMsg("Demande envoyée ! Un admin doit t'accepter.");
        setJoinCode("");
        setPanel(null);
      }
    } catch {
      setGroupMsg("Impossible d'envoyer la demande.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setGroupMsg("");
    setBusy(true);
    try {
      const res = await apiFetch("/api/family", { method: "POST", body: JSON.stringify({ familyName: groupName.trim() || "Ma famille" }) });
      if (!res.ok) setGroupMsg("Impossible de créer la famille/groupe.");
      else {
        await refresh(); // created active — switch happens automatically
        setGroupMsg("Famille/groupe créée !");
        setGroupName("");
        setPanel(null);
      }
    } catch {
      setGroupMsg("Impossible de créer la famille/groupe.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveGroup(familyId: string) {
    if (leaving) return;
    setLeaving(true);
    try {
      await apiFetch("/api/family/leave", { method: "POST", body: JSON.stringify({ familyId }) });
      setConfirmLeave(null);
      await refresh();
    } catch {
      /* ignore */
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Back chevron, then the title below it (left-aligned, ~15% smaller). AppChrome skips its own
          BackButton for /famille; the chevron is mobile-only — desktop keeps the orange header. */}
      <div className="pt-[calc(env(safe-area-inset-top)+8px)] md:pt-0">
        <button
          type="button"
          onClick={() => (typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push("/semaine"))}
          aria-label="Retour"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition active:scale-90 md:hidden"
        >
          <Icon name="chevron-left" size={26} strokeWidth={2.5} />
        </button>
        <h1 className="text-[1.6rem] font-extrabold tracking-tight">Ma famille / groupe</h1>
      </div>

      {/* One card: family name -> members -> invite an account -> add a child/profile. */}
      <section className="clay-card border-2 border-stone-100 p-4">
        <h2 className="mb-3 truncate text-lg font-extrabold">{family.name}</h2>
        <ul className="flex flex-col gap-2">
          {members.map((m) => {
            const isSelf = m.id === me.id;
            const memberIsAdmin = m.role === "admin";
            const tag = isSelf
              ? memberIsAdmin
                ? "toi · admin"
                : "toi"
              : memberIsAdmin
                ? "admin"
                : m.isChild
                  ? "enfant"
                  : m.hasAccount
                    ? "adulte"
                    : "profil sans compte";
            const canPromote = isAdmin && !isSelf && !memberIsAdmin && m.hasAccount;
            const canRemove = isAdmin && !isSelf;
            return (
              <li key={m.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Avatar person={m} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-stone-800">{m.name}</div>
                    <div className="text-xs font-semibold text-stone-400">{tag}</div>
                  </div>
                  {canPromote && (
                    <button
                      type="button"
                      onClick={() => setPromoting(promoting === m.id ? null : m.id)}
                      disabled={busy}
                      className="rounded-xl px-3 py-1.5 text-sm font-bold text-[var(--primary)] transition hover:bg-orange-50 active:scale-95 disabled:opacity-50"
                    >
                      Admin
                    </button>
                  )}
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => (confirmRemove === m.id ? removeMember(m.id) : setConfirmRemove(m.id))}
                      disabled={busy}
                      className={`rounded-xl px-3 py-1.5 text-sm font-bold transition active:scale-95 disabled:opacity-50 ${confirmRemove === m.id ? "bg-red-500 text-white" : "text-red-500 hover:bg-red-50"}`}
                    >
                      {confirmRemove === m.id ? "Sûr ?" : "Retirer"}
                    </button>
                  )}
                </div>
                {canPromote && promoting === m.id && (
                  <div className="step-in flex flex-col gap-2 rounded-xl border-2 border-orange-200 bg-orange-50/60 p-2.5">
                    <p className="text-xs font-semibold text-stone-600">Nommer {m.name} admin&nbsp;:</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => promote(m.id, false)} disabled={busy} className="btn-3d btn-neutral flex-1 rounded-full py-2 text-xs disabled:opacity-60">
                        En plus de moi
                      </button>
                      <button type="button" onClick={() => promote(m.id, true)} disabled={busy} className="btn-3d btn-primary flex-1 rounded-full py-2 text-xs disabled:opacity-60">
                        Transférer mes droits
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {famError && <p className="mt-2 text-sm font-semibold text-red-600">{famError}</p>}

        {/* Invite an existing account by its personal code — the invitee gets a notification to accept. */}
        <div className="mt-4 rounded-2xl border-2 border-[var(--primary)]/25 bg-[var(--primary-soft)] p-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--primary)]">
            <Icon name="user-plus" size={18} /> Inviter un compte
          </div>
          {/* Open to every member, not just admins: an admin still validates anyone arriving through
              the family code, and the code is visible to everyone right below. */}
          <p className="mt-1 text-sm font-semibold text-stone-600">
            Entre le code perso du compte à inviter. La personne reçoit une notif pour accepter ou refuser.
          </p>
          <form onSubmit={sendInvite} className="mt-2.5 flex gap-2">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="Code du compte (ex : A7X2B9)"
              className="min-w-0 flex-1 rounded-xl border-2 border-white bg-white px-3 py-2 font-mono text-base tracking-widest outline-none focus:border-[var(--primary)]"
            />
            <button type="submit" disabled={inviting} className="btn-3d btn-primary shrink-0 rounded-full px-4 py-2 text-sm disabled:opacity-50">
              {inviting ? <Spinner className="h-4 w-4" /> : "Inviter"}
            </button>
          </form>
          {inviteMsg && <p className="mt-1.5 text-sm font-semibold text-stone-700">{inviteMsg}</p>}
          {/* Your own code (give it so someone can invite you) + the family code (share to let someone join). */}
          <div className="mt-3 flex flex-col gap-1.5 border-t border-white/70 pt-2.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-500">Ton code&nbsp;:</span>
              <span className="font-mono text-base font-extrabold tracking-[0.15em] text-[var(--primary)]">{myCode ?? "…"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-400">Code famille/groupe&nbsp;:</span>
              <button type="button" onClick={copyCode} className="font-mono text-base font-extrabold tracking-[0.15em] text-stone-600 underline decoration-dotted">
                {copied ? "Copié !" : family.code}
              </button>
            </div>
          </div>
        </div>

        {/* Add a child / profile without an account (admin) — for kids with no phone/account. */}
        {isAdmin &&
          (addingChild ? (
            <form onSubmit={addChild} className="mt-3 flex flex-col gap-2 rounded-2xl border-2 border-orange-200 bg-orange-50/50 p-3">
              <p className="text-sm font-extrabold text-stone-800">Un enfant ou un profil sans compte</p>
              <input
                autoFocus
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                maxLength={40}
                placeholder="Prénom (ex : Louis)"
                className="w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-base outline-none focus:border-orange-300"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setChildIsKid(true)} className={`btn-3d flex-1 rounded-full py-2 text-sm ${childIsKid ? "btn-primary" : "btn-neutral"}`}>
                  <Icon name="user" size={16} /> Enfant
                </button>
                <button type="button" onClick={() => setChildIsKid(false)} className={`btn-3d flex-1 rounded-full py-2 text-sm ${!childIsKid ? "btn-primary" : "btn-neutral"}`}>
                  <Icon name="user" size={16} /> Adulte
                </button>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={busy || !childName.trim()} className="btn-3d btn-primary flex-1 rounded-full py-2 text-sm disabled:opacity-50">
                  {busy ? <Spinner className="h-4 w-4" /> : "Ajouter"}
                </button>
                <button type="button" onClick={() => { setAddingChild(false); setFamError(""); }} className="btn-3d btn-neutral rounded-full px-4 py-2 text-sm">
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingChild(true)}
              className="mt-3 w-full rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/40 py-2.5 text-sm font-bold text-orange-700 active:scale-95"
            >
              <span className="inline-flex items-center gap-2"><Icon name="user-plus" size={18} /> Ajouter un enfant / profil sans compte</span>
            </button>
          ))}
      </section>

      {/* Switch / leave — only when in more than one family/group. */}
      {families.length > 1 && (
        <section className="clay-card border-2 border-stone-100 p-4">
          <h2 className="text-lg font-extrabold">Mes familles / groupes</h2>
          <p className="mb-3 text-sm text-stone-500">Touche pour changer de famille/groupe active.</p>
          <div className="flex flex-col gap-2">
            {families.map((f) => {
              const active = f.id === family.id;
              const confirming = confirmLeave === f.id;
              return (
                <div key={f.id} className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 transition ${active ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-stone-100 bg-white"}`}>
                  <button type="button" onClick={() => { if (!active) switchFamily(f.id); }} className="flex min-w-0 flex-1 items-center gap-2.5 text-left active:opacity-70">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-stone-300 text-transparent"}`} aria-hidden>
                      <Icon name="check" size={14} strokeWidth={3} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-extrabold text-stone-800">{f.name}</span>
                      <span className="block text-xs font-semibold text-stone-400">{active ? "Active" : f.role === "admin" ? "Tu es admin" : "Membre"}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => (confirming ? leaveGroup(f.id) : setConfirmLeave(f.id))}
                    disabled={leaving}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${confirming ? "bg-red-500 text-white" : "text-red-500 hover:bg-red-50"}`}
                  >
                    {confirming ? "Confirmer" : "Quitter"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Join or create another family/group. */}
      <section className="clay-card border-2 border-stone-100 p-4">
        <h2 className="text-lg font-extrabold">Rejoindre ou créer</h2>
        <p className="mb-2.5 text-sm text-stone-500">Une autre famille ou un autre groupe.</p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => { setGroupMsg(""); setPanel(panel === "join" ? null : "join"); }} className="btn-3d btn-neutral rounded-full py-2.5 text-sm">
            <Icon name="users" size={18} /> Rejoindre avec un code
          </button>
          {panel === "join" && (
            <form onSubmit={submitJoin} className="step-in flex gap-2">
              <input
                autoFocus
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="Code (ex : A7X2B9)"
                className="min-w-0 flex-1 rounded-xl border-2 border-stone-200 bg-white px-3 py-2 font-mono text-base tracking-widest outline-none focus:border-orange-300"
              />
              <button type="submit" disabled={busy} className="btn-3d btn-primary shrink-0 rounded-full px-4 py-2 text-sm disabled:opacity-50">
                {busy ? <Spinner className="h-4 w-4" /> : "Envoyer"}
              </button>
            </form>
          )}
          <button type="button" onClick={() => { setGroupMsg(""); setPanel(panel === "create" ? null : "create"); }} className="btn-3d btn-neutral rounded-full py-2.5 text-sm">
            <Icon name="plus-circle" size={18} /> Créer une famille / groupe
          </button>
          {panel === "create" && (
            <form onSubmit={submitCreate} className="step-in flex gap-2">
              <input
                autoFocus
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={40}
                placeholder="Nom (ex : Coloc, Belle-famille…)"
                className="min-w-0 flex-1 rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-base outline-none focus:border-orange-300"
              />
              <button type="submit" disabled={busy} className="btn-3d btn-primary shrink-0 rounded-full px-4 py-2 text-sm disabled:opacity-50">
                {busy ? <Spinner className="h-4 w-4" /> : "Créer"}
              </button>
            </form>
          )}
          {groupMsg && <p className="text-sm font-semibold text-stone-600">{groupMsg}</p>}
        </div>
      </section>
    </div>
  );
}
