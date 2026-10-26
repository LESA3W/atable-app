import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { computeInitials, randomColor } from "@/lib/initials";
import { REFERRALS_FOR_LIFETIME } from "@/lib/premium";
import type {
  AppNotification,
  Auth,
  CustomFood,
  Family,
  FamilyContext,
  Member,
  MemberRole,
  MealLogEntry,
  MealPlanEntry,
  PreferenceMap,
  ShoppingInfo,
  Slot,
  Status,
} from "@/lib/types";

// Lazy client: neon() throws on an empty connection string, and `next build`
// evaluates route modules, so we must not construct it at import time.
let _sql: NeonQueryFunction<false, false> | null = null;

function sqlClient(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  _sql = neon(url);
  return _sql;
}

// ---------- ids / tokens / codes ----------

function randToken(bytes = 24): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Buffer.from(a).toString("base64url");
}
function newId(prefix: string): string {
  return `${prefix}-${randToken(9)}`;
}
function randInt(max: number): number {
  return crypto.getRandomValues(new Uint8Array(1))[0] % max;
}
// 6-char human-friendly code: exactly 3 letters + 3 digits, shuffled, uppercase.
// No ambiguous chars (I/O/0/1). Lookups are case-insensitive.
function newCode(): string {
  const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const DIGITS = "23456789";
  const chars = [
    LETTERS[randInt(LETTERS.length)],
    LETTERS[randInt(LETTERS.length)],
    LETTERS[randInt(LETTERS.length)],
    DIGITS[randInt(DIGITS.length)],
    DIGITS[randInt(DIGITS.length)],
    DIGITS[randInt(DIGITS.length)],
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// ---------- password hashing (PBKDF2 via Web Crypto, no external dep) ----------

// 600k per current OWASP guidance for PBKDF2-HMAC-SHA256. Old hashes stay valid: verifyPassword reads
// the iteration count stored in each hash string, so only new hashes use the higher count.
const PBKDF2_ITERATIONS = 600000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${Buffer.from(salt).toString("base64")}$${Buffer.from(new Uint8Array(bits)).toString("base64")}`;
}

async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const [, iterStr, saltB64, hashB64] = parts;
  const salt = new Uint8Array(Buffer.from(saltB64, "base64"));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: Number(iterStr) || PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return Buffer.from(new Uint8Array(bits)).toString("base64") === hashB64;
}

// ---------- schema ----------

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  const sql = sqlClient();
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS families (
        id text PRIMARY KEY,
        name text NOT NULL,
        code text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS members (
        id text PRIMARY KEY,
        family_id text REFERENCES families(id) ON DELETE CASCADE,
        name text NOT NULL,
        initials text NOT NULL,
        color text NOT NULL,
        text_color text,
        photo text,
        role text NOT NULL DEFAULT 'member',
        token text NOT NULL UNIQUE,
        email text,
        password_hash text,
        last_name text,
        age int,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS join_requests (
        id text PRIMARY KEY,
        family_id text NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        name text NOT NULL,
        initials text,
        color text,
        photo text,
        email text,
        password_hash text,
        claim_token text NOT NULL UNIQUE,
        status text NOT NULL DEFAULT 'pending',
        member_id text,
        created_at timestamptz NOT NULL DEFAULT now(),
        decided_at timestamptz
      )`;
      await sql`CREATE TABLE IF NOT EXISTS notifications (
        id text PRIMARY KEY,
        family_id text NOT NULL,
        member_id text NOT NULL,
        type text NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}',
        read boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS preferences (
        person     text NOT NULL,
        food_id    text NOT NULL,
        status     char(1) NOT NULL,
        family_id  text NOT NULL DEFAULT 'fam-default',
        favorite   boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (person, food_id)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS custom_foods (
        id         text PRIMARY KEY,
        label      text NOT NULL,
        category   text NOT NULL,
        created_by text NOT NULL,
        family_id  text NOT NULL DEFAULT 'fam-default',
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS meal_log (
        id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        dish_id    text NOT NULL,
        dish_name  text NOT NULL,
        course     text NOT NULL,
        diners     text[] NOT NULL DEFAULT '{}',
        family_id  text NOT NULL DEFAULT 'fam-default',
        eaten_at   timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS meal_plan (
        plan_date  date NOT NULL,
        slot       text NOT NULL,
        dish_id    text NOT NULL,
        dish_name  text NOT NULL,
        course     text NOT NULL,
        family_id  text NOT NULL DEFAULT 'fam-default',
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (plan_date, slot, dish_id)
      )`;
      // Self-heal a DB created before the multi-tenant migration.
      await sql`ALTER TABLE preferences ADD COLUMN IF NOT EXISTS family_id text NOT NULL DEFAULT 'fam-default'`;
      await sql`ALTER TABLE preferences ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false`;
      await sql`ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS family_id text NOT NULL DEFAULT 'fam-default'`;
      await sql`ALTER TABLE meal_log ADD COLUMN IF NOT EXISTS family_id text NOT NULL DEFAULT 'fam-default'`;
      await sql`ALTER TABLE meal_plan ADD COLUMN IF NOT EXISTS family_id text NOT NULL DEFAULT 'fam-default'`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS email text`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash text`;
      await sql`ALTER TABLE join_requests ADD COLUMN IF NOT EXISTS email text`;
      await sql`ALTER TABLE join_requests ADD COLUMN IF NOT EXISTS password_hash text`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS members_email_unique ON members (lower(email)) WHERE email IS NOT NULL`;
      // Accounts can now exist without a family; join requests reference the account.
      await sql`ALTER TABLE members ALTER COLUMN family_id DROP NOT NULL`;
      await sql`ALTER TABLE join_requests ADD COLUMN IF NOT EXISTS member_id text`;
      await sql`ALTER TABLE join_requests ALTER COLUMN claim_token DROP NOT NULL`;
      await sql`ALTER TABLE join_requests ALTER COLUMN name DROP NOT NULL`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS last_name text`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS age int`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS birthdate date`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS diet text`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS onboarding jsonb`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS restrictions text[]`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS is_child boolean NOT NULL DEFAULT false`;
      // Vanity "you're user #N" rank shown at signup (+ a 7-day Premium welcome gift).
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS signup_rank int`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS premium_until timestamptz`;
      // Social sign-in: the provider's stable user id (Google/Apple `sub`), linked to a member.
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS google_id text`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS apple_id text`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS members_google_id_unique ON members (google_id) WHERE google_id IS NOT NULL`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS members_apple_id_unique ON members (apple_id) WHERE apple_id IS NOT NULL`;
      // Referral: a PUBLIC code, deliberately separate from `invite_code` (which is a private handle
      // for pulling an account into a famille — publishing that one would turn /api/invites into a
      // spam + name-disclosure endpoint). `referred_by` records who brought this account in, once and
      // for good; `lifetime_free` is the reward, granted when 2 of your referrals have signed up.
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS referral_code text`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS members_referral_code_unique ON members (referral_code) WHERE referral_code IS NOT NULL`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS referred_by text`;
      await sql`CREATE INDEX IF NOT EXISTS members_referred_by_idx ON members (referred_by) WHERE referred_by IS NOT NULL`;
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS lifetime_free boolean NOT NULL DEFAULT false`;
      await sql`ALTER TABLE meal_plan ADD COLUMN IF NOT EXISTS diners text[]`;
      await sql`ALTER TABLE meal_plan ADD COLUMN IF NOT EXISTS member_id text`;
      await sql`ALTER TABLE meal_plan ADD COLUMN IF NOT EXISTS guests int NOT NULL DEFAULT 0`;
      // Many-to-many membership: an account can belong to several familles/groupes at once. The row
      // carries the per-famille role. members.family_id/role stay as the "active" (currently-viewed)
      // membership — a denormalized pointer kept in sync, so requireMember/withFamily don't change.
      await sql`CREATE TABLE IF NOT EXISTS memberships (
        member_id  text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        family_id  text NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        role       text NOT NULL DEFAULT 'member',
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (member_id, family_id)
      )`;
      // Backfill once: every existing single-family member becomes a membership (idempotent).
      await sql`
        INSERT INTO memberships (member_id, family_id, role)
        SELECT id, family_id, role FROM members WHERE family_id IS NOT NULL
        ON CONFLICT (member_id, family_id) DO NOTHING
      `;
      // Marks a family's weekly shopping list as done (so it clears until re-opened).
      await sql`CREATE TABLE IF NOT EXISTS shopping_done (
        family_id  text NOT NULL,
        week_start text NOT NULL,
        done_at    timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (family_id, week_start)
      )`;
      // Products any family member manually asks to add to the shopping list, with who asked,
      // an optional brand and a quantity.
      await sql`CREATE TABLE IF NOT EXISTS shopping_requests (
        id         text PRIMARY KEY,
        family_id  text NOT NULL,
        member_id  text NOT NULL,
        label      text NOT NULL,
        brand      text,
        qty        int NOT NULL DEFAULT 1,
        checked    boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`ALTER TABLE shopping_requests ADD COLUMN IF NOT EXISTS brand text`;
      await sql`ALTER TABLE shopping_requests ADD COLUMN IF NOT EXISTS qty int NOT NULL DEFAULT 1`;
      await sql`ALTER TABLE shopping_requests ADD COLUMN IF NOT EXISTS checked boolean NOT NULL DEFAULT false`;
      // Which estimated products the family has already ticked off, per week — shared across
      // members so everyone sees the same live state while shopping.
      await sql`CREATE TABLE IF NOT EXISTS shopping_checks (
        family_id  text NOT NULL,
        week_start text NOT NULL,
        food_id    text NOT NULL,
        PRIMARY KEY (family_id, week_start, food_id)
      )`;
      // Estimated products the family has removed from a week's list — shared + persisted so a
      // deleted item does not reappear on reload (mirrors shopping_checks).
      await sql`CREATE TABLE IF NOT EXISTS shopping_removed (
        family_id  text NOT NULL,
        week_start text NOT NULL,
        food_id    text NOT NULL,
        PRIMARY KEY (family_id, week_start, food_id)
      )`;
      // Per-product overrides on a week's list: a custom pack quantity and/or a chosen brand,
      // keyed by "date|slot|dishId|foodId". Shared so a swap/quantity change shows for everyone.
      await sql`CREATE TABLE IF NOT EXISTS shopping_overrides (
        family_id  text NOT NULL,
        week_start text NOT NULL,
        item_key   text NOT NULL,
        qty        int,
        brand      text,
        PRIMARY KEY (family_id, week_start, item_key)
      )`;
      // Personal invite code per account (an admin can invite someone by their code) + the invites
      // they receive — decided by the INVITEE (unlike join_requests, which an admin decides).
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS invite_code text`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS members_invite_code_unique ON members (invite_code) WHERE invite_code IS NOT NULL`;
      await sql`CREATE TABLE IF NOT EXISTS invites (
        id         text PRIMARY KEY,
        family_id  text NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        invitee_id text NOT NULL,
        inviter_id text NOT NULL,
        status     text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        decided_at timestamptz
      )`;
    })();
  }
  return schemaReady;
}

// ---------- auth ----------

export class AuthError extends Error {}

function memberRow(r: {
  id: string;
  name: string;
  initials: string;
  color: string;
  text_color: string | null;
  photo: string | null;
  role: string;
  diet?: string | null;
  restrictions?: string[] | null;
  is_child?: boolean | null;
  has_account?: boolean | null;
  shopping?: ShoppingInfo | null;
  // Premium/referral: only selected for "me" (like `shopping`), never for the roster.
  premium_until?: string | Date | null;
  lifetime_free?: boolean | null;
  referral_code?: string | null;
  referral_count?: number | null;
}): Member {
  return {
    id: r.id,
    name: r.name,
    initials: r.initials,
    color: r.color,
    textColor: r.text_color,
    photo: r.photo,
    role: r.role as MemberRole,
    diet: r.diet ?? null,
    restrictions: r.restrictions ?? [],
    isChild: r.is_child ?? false,
    hasAccount: r.has_account ?? false,
    shopping: r.shopping ?? null,
    premiumUntil: r.premium_until ? new Date(r.premium_until).toISOString() : null,
    lifetimeFree: r.lifetime_free ?? false,
    referralCode: r.referral_code ?? null,
    referralCount: r.referral_count ?? 0,
  };
}

// Derive {familyId, memberId, role} from the Bearer token. Throws AuthError on miss.
export async function requireMember(req: Request): Promise<Auth> {
  await ensureSchema();
  const header = req.headers.get("authorization") ?? req.headers.get("x-member-token") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new AuthError("no_token");
  const sql = sqlClient();
  const rows = (await sql`SELECT id, family_id, role FROM members WHERE token = ${token}`) as {
    id: string;
    family_id: string | null;
    role: string;
  }[];
  if (rows.length === 0) throw new AuthError("bad_token");
  return { familyId: rows[0].family_id, memberId: rows[0].id, role: rows[0].role as MemberRole };
}

// ---------- families / members ----------

export async function getFamilyContext(memberId: string): Promise<FamilyContext | null> {
  await ensureSchema();
  const sql = sqlClient();
  const me = (await sql`
    SELECT id, family_id, name, initials, color, text_color, photo, role, diet, restrictions, is_child,
           (email IS NOT NULL) AS has_account, onboarding->'shopping' AS shopping,
           premium_until, lifetime_free, referral_code,
           (SELECT count(*)::int FROM members r WHERE r.referred_by = members.id) AS referral_count
    FROM members WHERE id = ${memberId}
  `) as (Parameters<typeof memberRow>[0] & { family_id: string | null })[];
  if (me.length === 0) return null;
  // Accounts created before referrals existed have no code, which would leave their share button
  // permanently disabled. Mint one on first load — idempotent, and it only ever runs once per account.
  if (!me[0].referral_code) me[0].referral_code = await mintReferralCode(memberId);
  // Every famille/groupe this account belongs to (for the switcher), in join order.
  const famRows = (await sql`
    SELECT f.id, f.name, f.code, mb.role
    FROM memberships mb JOIN families f ON f.id = mb.family_id
    WHERE mb.member_id = ${memberId} ORDER BY mb.created_at
  `) as { id: string; name: string; code: string; role: MemberRole }[];
  const families = famRows.map((f) => ({ id: f.id, name: f.name, code: f.code, role: f.role }));
  // Active = the currently-viewed famille/groupe (fall back to the first one, else none).
  const activeId = me[0].family_id ?? families[0]?.id ?? null;
  if (!activeId) return { family: null, families, members: [], me: memberRow(me[0]) };
  const fam = (await sql`SELECT id, name, code FROM families WHERE id = ${activeId}`) as Family[];
  if (fam.length === 0) return { family: null, families, members: [], me: memberRow(me[0]) };
  // Roster = everyone with a membership in the active famille/groupe (role comes from the membership,
  // so a multi-famille account shows up in each one with its per-famille role).
  const members = (await sql`
    SELECT mem.id, mem.name, mem.initials, mem.color, mem.text_color, mem.photo, mb.role, mem.diet, mem.restrictions, mem.is_child,
           (mem.email IS NOT NULL) AS has_account
    FROM memberships mb JOIN members mem ON mem.id = mb.member_id
    WHERE mb.family_id = ${activeId} ORDER BY mem.created_at
  `) as Parameters<typeof memberRow>[0][];
  return { family: fam[0], families, members: members.map(memberRow), me: memberRow(me[0]) };
}

export async function getFamilyByCode(code: string): Promise<Family | null> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`SELECT id, name, code FROM families WHERE code = ${code.toUpperCase()}`) as Family[];
  return rows[0] ?? null;
}

type NewMember = {
  name: string;
  initials: string;
  color: string;
  textColor?: string | null;
  photo?: string | null;
  role: MemberRole;
  email?: string | null;
  passwordHash?: string | null;
  lastName?: string | null;
  age?: number | null;
  birthdate?: string | null;
  diet?: string | null;
  onboarding?: Record<string, unknown> | null;
  restrictions?: string[] | null;
  isChild?: boolean;
};

async function insertMember(familyId: string | null, p: NewMember): Promise<{ member: Member; token: string }> {
  const sql = sqlClient();
  const id = newId("mem");
  const token = randToken(24); // long session token: kept in localStorage, never shown
  const onboardingJson = p.onboarding ? JSON.stringify(p.onboarding) : null;
  const restrictions = p.restrictions ?? null;
  await sql`
    INSERT INTO members (id, family_id, name, initials, color, text_color, photo, role, token, email, password_hash, last_name, age, birthdate, diet, onboarding, restrictions, is_child)
    VALUES (${id}, ${familyId}, ${p.name}, ${p.initials}, ${p.color}, ${p.textColor ?? null}, ${p.photo ?? null}, ${p.role}, ${token}, ${p.email ?? null}, ${p.passwordHash ?? null}, ${p.lastName ?? null}, ${p.age ?? null}, ${p.birthdate ?? null}, ${p.diet ?? null}, ${onboardingJson}::jsonb, ${restrictions}, ${p.isChild ?? false})
  `;
  return {
    member: { id, name: p.name, initials: p.initials, color: p.color, textColor: p.textColor ?? null, photo: p.photo ?? null, role: p.role, diet: p.diet ?? null, restrictions: restrictions ?? [], isChild: p.isChild ?? false },
    token,
  };
}

// Mint the PUBLIC referral code for an account. Retries on the (very unlikely) unique clash. Called
// at signup so the share sheet always has a code to hand out — no lazy generation, no null to guard.
async function mintReferralCode(memberId: string): Promise<string | null> {
  const sql = sqlClient();
  for (let i = 0; i < 6; i++) {
    const code = newCode();
    try {
      await sql`UPDATE members SET referral_code = ${code} WHERE id = ${memberId} AND referral_code IS NULL`;
      const rows = (await sql`SELECT referral_code FROM members WHERE id = ${memberId}`) as { referral_code: string | null }[];
      if (rows[0]?.referral_code) return rows[0].referral_code;
    } catch {
      // unique clash -> try another code
    }
  }
  return null; // never fatal: signup must succeed even if we couldn't mint a code
}

// Record who brought this account in, and reward the referrer once they hit the target. Runs after
// the new member exists. Never throws — a broken referral must not take a signup down with it.
async function creditReferral(newMemberId: string, rawCode: string | null | undefined): Promise<void> {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (code.length < 4) return;
  try {
    const sql = sqlClient();
    const rows = (await sql`SELECT id FROM members WHERE upper(referral_code) = ${code}`) as { id: string }[];
    const referrer = rows[0]?.id;
    if (!referrer || referrer === newMemberId) return; // unknown code, or your own link
    await sql`UPDATE members SET referred_by = ${referrer} WHERE id = ${newMemberId} AND referred_by IS NULL`;
    // The referral ALWAYS unlocks, deadline or not. Time-boxing the reward here left the app with no
    // way out at all once the date passed: the trial lapses after 7 days, the paywall keeps telling
    // people to "invite 2 friends and it's yours for life", and the server silently refused to honour
    // it — with no purchase path either (there is no IAP, we sell nothing). That is a dead end for the
    // user and an App Store 2.1 problem (a call to action that cannot work). The LAUNCH URGENCY is
    // untouched: the "offre limitée" copy still shows until LIFETIME_DEADLINE and hides itself after.
    const counted = (await sql`
      SELECT count(*)::int AS c FROM members WHERE referred_by = ${referrer}
    `) as { c: number }[];
    if ((counted[0]?.c ?? 0) >= REFERRALS_FOR_LIFETIME) {
      await sql`UPDATE members SET lifetime_free = true WHERE id = ${referrer}`;
    }
  } catch (err) {
    console.error("creditReferral failed", err);
  }
}

export async function emailInUse(email: string): Promise<boolean> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`SELECT 1 FROM members WHERE lower(email) = lower(${email})`) as unknown[];
  return rows.length > 0;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<{ token: string } | null> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT token, password_hash FROM members WHERE lower(email) = lower(${email})
  `) as { token: string; password_hash: string | null }[];
  if (rows.length === 0) return null;
  const ok = await verifyPassword(password, rows[0].password_hash);
  return ok ? { token: rows[0].token } : null;
}

// Sign up: a standalone account (no family yet).
export async function createAccount(p: {
  name: string;
  initials: string;
  color: string;
  textColor?: string | null;
  photo?: string | null;
  email: string;
  passwordHash: string;
  lastName?: string | null;
  age?: number | null;
  birthdate?: string | null;
  diet?: string | null;
  onboarding?: Record<string, unknown> | null;
  restrictions?: string[] | null;
  referralCode?: string | null; // the code of whoever's link brought this account in
}): Promise<{ member: Member; token: string; rank: number; referralCode: string | null }> {
  await ensureSchema();
  const sql = sqlClient();
  const res = await insertMember(null, { ...p, role: "member" });
  // Vanity signup rank: base 220, so the first real user is #221 (test @atable.fr accounts don't
  // count toward it). Plus a 7-day Premium welcome gift.
  const rows = (await sql`SELECT count(*)::int AS c FROM members WHERE signup_rank IS NOT NULL AND email NOT LIKE '%@atable.fr'`) as { c: number }[];
  const rank = 221 + (rows[0]?.c ?? 0);
  await sql`UPDATE members SET signup_rank = ${rank}, premium_until = now() + interval '7 days' WHERE id = ${res.member.id}`;
  await creditReferral(res.member.id, p.referralCode);
  const referralCode = await mintReferralCode(res.member.id);
  return { ...res, rank, referralCode };
}

// Social sign-in (Google / Apple): resolve the member behind a *verified* provider identity, or make
// a fresh standalone account (no family yet -> the app drops them into onboarding). Three cases:
//   1. we already know this provider id           -> log that member in
//   2. the verified email matches an existing acct -> LINK the provider to it (no duplicate account)
//   3. brand-new                                   -> create it, with the same vanity rank + 7-day
//                                                      Premium gift as a normal email signup
// Returns the member's session token (same token system as loginWithEmail).
export async function loginOrCreateWithSocial(p: {
  provider: "google" | "apple";
  sub: string;
  email: string | null;
  name: string | null;
  referralCode?: string | null; // only ever applied to case 3 — an existing account can't be referred
}): Promise<{ token: string; created: boolean; rank?: number; referralCode?: string | null }> {
  await ensureSchema();
  const sql = sqlClient();
  const isGoogle = p.provider === "google";

  // 1) Already linked to this exact provider account.
  const byProvider = (isGoogle
    ? await sql`SELECT token FROM members WHERE google_id = ${p.sub}`
    : await sql`SELECT token FROM members WHERE apple_id = ${p.sub}`) as { token: string }[];
  if (byProvider.length) return { token: byProvider[0].token, created: false };

  // 2) An account already exists for this email (email/password, or the other provider) -> link in.
  if (p.email) {
    const byEmail = (await sql`
      SELECT id, token FROM members WHERE lower(email) = lower(${p.email})
    `) as { id: string; token: string }[];
    if (byEmail.length) {
      const id = byEmail[0].id;
      if (isGoogle) await sql`UPDATE members SET google_id = ${p.sub} WHERE id = ${id}`;
      else await sql`UPDATE members SET apple_id = ${p.sub} WHERE id = ${id}`;
      return { token: byEmail[0].token, created: false };
    }
  }

  // 3) Brand-new account (no family -> onboarding). Name falls back to the email handle, then "Moi".
  const display = (p.name?.trim() || p.email?.split("@")[0] || "Moi").slice(0, 40);
  const res = await insertMember(null, {
    name: display,
    initials: computeInitials(display),
    color: randomColor(),
    role: "member",
    email: p.email ?? null,
  });
  const rows = (await sql`SELECT count(*)::int AS c FROM members WHERE signup_rank IS NOT NULL AND email NOT LIKE '%@atable.fr'`) as { c: number }[];
  const rank = 221 + (rows[0]?.c ?? 0);
  if (isGoogle) {
    await sql`UPDATE members SET signup_rank = ${rank}, premium_until = now() + interval '7 days', google_id = ${p.sub} WHERE id = ${res.member.id}`;
  } else {
    await sql`UPDATE members SET signup_rank = ${rank}, premium_until = now() + interval '7 days', apple_id = ${p.sub} WHERE id = ${res.member.id}`;
  }
  await creditReferral(res.member.id, p.referralCode);
  const referralCode = await mintReferralCode(res.member.id);
  return { token: res.token, created: true, rank, referralCode };
}

// Create a family/group and make the (already-existing) account its admin.
export async function assignFamilyToMember(memberId: string, familyName: string): Promise<Family> {
  await ensureSchema();
  const sql = sqlClient();
  const id = newId("fam");
  let code = newCode();
  for (let i = 0; i < 5; i++) {
    const clash = (await sql`SELECT 1 FROM families WHERE code = ${code}`) as unknown[];
    if (clash.length === 0) break;
    code = newCode();
  }
  await sql`INSERT INTO families (id, name, code) VALUES (${id}, ${familyName}, ${code})`;
  // Add the membership (admin) — do NOT overwrite the account's other familles/groupes — and make
  // the new one active.
  await sql`INSERT INTO memberships (member_id, family_id, role) VALUES (${memberId}, ${id}, 'admin') ON CONFLICT (member_id, family_id) DO UPDATE SET role = 'admin'`;
  await sql`UPDATE members SET family_id = ${id}, role = 'admin' WHERE id = ${memberId}`;
  return { id, name: familyName, code };
}

// Admin adds a "managed" member (no account/login): just a profile for tastes.
export async function addManagedMember(
  familyId: string,
  name: string,
  isChild: boolean,
): Promise<Member> {
  await ensureSchema();
  const { member } = await insertMember(familyId, {
    name,
    initials: computeInitials(name),
    color: randomColor(),
    role: "member",
    isChild,
  });
  // A managed profile belongs to exactly one famille/groupe — record its membership.
  const sql = sqlClient();
  await sql`INSERT INTO memberships (member_id, family_id, role) VALUES (${member.id}, ${familyId}, 'member') ON CONFLICT (member_id, family_id) DO NOTHING`;
  return member;
}

// Remove a member from ONE famille/groupe. A managed profile (no login) is deleted; an account just
// loses this membership (it keeps its login + other familles/groupes). Caller guards admin + not-self.
export async function removeMember(familyId: string, memberId: string): Promise<boolean> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`SELECT (email IS NOT NULL) AS has_account, family_id FROM members WHERE id = ${memberId}`) as {
    has_account: boolean;
    family_id: string | null;
  }[];
  if (rows.length === 0) return false;
  const mem = (await sql`SELECT 1 FROM memberships WHERE member_id = ${memberId} AND family_id = ${familyId}`) as unknown[];
  if (mem.length === 0) return false;
  await sql`DELETE FROM memberships WHERE member_id = ${memberId} AND family_id = ${familyId}`;
  await sql`DELETE FROM preferences WHERE person = ${memberId} AND family_id = ${familyId}`;
  await sql`DELETE FROM notifications WHERE member_id = ${memberId} AND family_id = ${familyId}`;
  await sql`DELETE FROM join_requests WHERE member_id = ${memberId} AND family_id = ${familyId}`;
  if (!rows[0].has_account) {
    // Login-less profile: it lived only here, so remove the row entirely.
    await sql`DELETE FROM notifications WHERE member_id = ${memberId}`;
    await sql`DELETE FROM members WHERE id = ${memberId}`;
  } else if (rows[0].family_id === familyId) {
    // The removed famille/groupe was the account's active one: point it at another (or none).
    const other = (await sql`SELECT family_id, role FROM memberships WHERE member_id = ${memberId} ORDER BY created_at LIMIT 1`) as {
      family_id: string;
      role: MemberRole;
    }[];
    await sql`UPDATE members SET family_id = ${other[0]?.family_id ?? null}, role = ${other[0]?.role ?? "member"} WHERE id = ${memberId}`;
  }
  return true;
}

// Permanently delete a signed-in account and all of its personal data (App Store Guideline 5.1.1(v)
// / GDPR erasure). Purges the member's tastes, notifications, join requests and memberships across
// every famille/groupe, then the login row itself. Family-shared data (meal plans, shopping lists)
// is NOT touched — it belongs to the group, not the person. Managed profiles (no email) are left to
// removeMember; this only acts on a real account. Returns false if the id is unknown or not an account.
export async function deleteAccount(memberId: string): Promise<boolean> {
  await ensureSchema();
  const sql = sqlClient();
  // A "real account" is any row that can authenticate itself: email/password OR a social id. Basing
  // this on email alone dead-ended social accounts whose provider returned no (verified) email.
  // Managed profiles (no email, no password, no social id) have none of these -> removeMember handles them.
  const rows = (await sql`
    SELECT (email IS NOT NULL OR password_hash IS NOT NULL OR google_id IS NOT NULL OR apple_id IS NOT NULL) AS has_account
    FROM members WHERE id = ${memberId}
  `) as { has_account: boolean }[];
  if (rows.length === 0 || !rows[0].has_account) return false;
  await sql`DELETE FROM preferences WHERE person = ${memberId}`;
  await sql`DELETE FROM notifications WHERE member_id = ${memberId}`;
  await sql`DELETE FROM join_requests WHERE member_id = ${memberId}`;
  await sql`DELETE FROM memberships WHERE member_id = ${memberId}`;
  await sql`DELETE FROM members WHERE id = ${memberId}`;
  return true;
}

export async function isFamilyMember(memberId: string, familyId: string): Promise<boolean> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`SELECT 1 FROM memberships WHERE member_id = ${memberId} AND family_id = ${familyId}`) as unknown[];
  return rows.length > 0;
}

// Switch which famille/groupe an account is currently viewing. Verifies the membership exists first.
export async function switchActiveFamily(memberId: string, familyId: string): Promise<boolean> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`SELECT role FROM memberships WHERE member_id = ${memberId} AND family_id = ${familyId}`) as { role: MemberRole }[];
  if (rows.length === 0) return false;
  await sql`UPDATE members SET family_id = ${familyId}, role = ${rows[0].role} WHERE id = ${memberId}`;
  return true;
}

// Update the signed-in member's avatar colour (palette pick or a custom hex).
// Rename the signed-in member (their display pseudo). Social sign-in seeds the name from the Google/
// Apple account, so they may want to change it. Keep the derived initials (avatar fallback) in sync.
export async function updateMemberName(memberId: string, name: string): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  await sql`UPDATE members SET name = ${name}, initials = ${computeInitials(name)} WHERE id = ${memberId}`;
}

export async function updateMemberColor(memberId: string, color: string): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  await sql`UPDATE members SET color = ${color} WHERE id = ${memberId}`;
}

// Set (or clear) the signed-in member's custom avatar photo (a small data URL).
export async function updateMemberPhoto(memberId: string, photo: string | null): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  await sql`UPDATE members SET photo = ${photo} WHERE id = ${memberId}`;
}

// Update the signed-in member's dietary restrictions (validated RestrictionId[] — text[] column).
// Lets them re-edit their régimes after onboarding.
export async function updateMemberRestrictions(memberId: string, restrictions: string[]): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  await sql`UPDATE members SET restrictions = ${restrictions} WHERE id = ${memberId}`;
}

// Save the signed-in member's shopping choice (location + market) into onboarding jsonb.
export async function updateMemberShopping(memberId: string, shopping: ShoppingInfo): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  await sql`
    UPDATE members
    SET onboarding = jsonb_set(COALESCE(onboarding, '{}'::jsonb), '{shopping}', ${JSON.stringify(shopping)}::jsonb, true)
    WHERE id = ${memberId}
  `;
}

// Promote a family member (who must have an account) to admin. transfer=true also
// demotes the current admin to a plain member (handing over the keys).
export async function setFamilyAdmin(
  familyId: string,
  callerId: string,
  targetId: string,
  transfer: boolean,
): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT mem.email, mem.family_id AS active FROM members mem
    JOIN memberships mb ON mb.member_id = mem.id AND mb.family_id = ${familyId}
    WHERE mem.id = ${targetId}
  `) as { email: string | null; active: string | null }[];
  if (rows.length === 0) return { ok: false, error: "not_found" };
  if (!rows[0].email) return { ok: false, error: "no_account" }; // managed profile can't log in
  // Role lives on the membership; mirror it onto members.role when that famille/groupe is active.
  await sql`UPDATE memberships SET role = 'admin' WHERE member_id = ${targetId} AND family_id = ${familyId}`;
  if (rows[0].active === familyId) await sql`UPDATE members SET role = 'admin' WHERE id = ${targetId}`;
  if (transfer) {
    await sql`UPDATE memberships SET role = 'member' WHERE member_id = ${callerId} AND family_id = ${familyId}`;
    await sql`UPDATE members SET role = 'member' WHERE id = ${callerId} AND family_id = ${familyId}`;
  }
  return { ok: true };
}

// ---------- join requests ----------

// An existing account asks to join a family/group.
export async function requestJoin(memberId: string, familyId: string): Promise<{ id: string }> {
  await ensureSchema();
  const sql = sqlClient();
  const id = newId("jr");
  await sql`
    INSERT INTO join_requests (id, family_id, member_id, status)
    VALUES (${id}, ${familyId}, ${memberId}, 'pending')
  `;
  const who = (await sql`SELECT name FROM members WHERE id = ${memberId}`) as { name: string }[];
  const name = who[0]?.name ?? "Quelqu'un";
  const admins = (await sql`SELECT member_id AS id FROM memberships WHERE family_id = ${familyId} AND role = 'admin'`) as {
    id: string;
  }[];
  for (const a of admins) {
    await addNotification(familyId, a.id, "join_request", { requestId: id, name });
  }
  return { id };
}

export async function getPendingJoinRequests(
  familyId: string,
): Promise<{ id: string; name: string; createdAt: string }[]> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT jr.id, m.name AS name, jr.created_at
    FROM join_requests jr LEFT JOIN members m ON m.id = jr.member_id
    WHERE jr.family_id = ${familyId} AND jr.status = 'pending'
    ORDER BY jr.created_at
  `) as { id: string; name: string | null; created_at: string }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name ?? "Quelqu'un",
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

// Accept: create the member, mark the request accepted (idempotent on status='pending').
export async function acceptJoinRequest(requestId: string, familyId: string): Promise<boolean> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT member_id FROM join_requests
    WHERE id = ${requestId} AND family_id = ${familyId} AND status = 'pending'
  `) as { member_id: string | null }[];
  if (rows.length === 0 || !rows[0].member_id) return false;
  const memberId = rows[0].member_id;
  // ADD the membership (don't overwrite the account's other familles/groupes).
  await sql`INSERT INTO memberships (member_id, family_id, role) VALUES (${memberId}, ${familyId}, 'member') ON CONFLICT (member_id, family_id) DO NOTHING`;
  // If it's the account's first famille/groupe, make it active so they land inside it.
  await sql`UPDATE members SET family_id = ${familyId}, role = 'member' WHERE id = ${memberId} AND family_id IS NULL`;
  await sql`
    UPDATE join_requests SET status = 'accepted', decided_at = now()
    WHERE id = ${requestId} AND status = 'pending'
  `;
  // Tell the accepted member they're in — acceptance had no in-app notification before (only refusal did).
  const fam = (await sql`SELECT name FROM families WHERE id = ${familyId}`) as { name: string }[];
  await addNotification(familyId, memberId, "join_accepted", { familyName: fam[0]?.name ?? "" });
  // let the existing members know someone joined
  const who = (await sql`SELECT name FROM members WHERE id = ${memberId}`) as { name: string }[];
  const others = (await sql`SELECT member_id AS id FROM memberships WHERE family_id = ${familyId} AND member_id <> ${memberId}`) as {
    id: string;
  }[];
  for (const o of others) {
    await addNotification(familyId, o.id, "member_joined", { name: who[0]?.name ?? "Quelqu'un" });
  }
  return true;
}

export async function refuseJoinRequest(requestId: string, familyId: string): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT member_id FROM join_requests
    WHERE id = ${requestId} AND family_id = ${familyId} AND status = 'pending'
  `) as { member_id: string | null }[];
  await sql`
    UPDATE join_requests SET status = 'refused', decided_at = now()
    WHERE id = ${requestId} AND family_id = ${familyId} AND status = 'pending'
  `;
  if (rows[0]?.member_id) {
    await addNotification(familyId, rows[0].member_id, "join_refused", {});
  }
}

// ---------- invites (an admin invites an existing account by its personal code) ----------

// The current account's personal invite code — generated + stored on first read (unique).
// ONE code per account. It used to be two — a private `invite_code` for famille invites and a public
// `referral_code` — and having to know which one to read out loud is a bug in itself. `referral_code`
// is now the single answer to "quel est mon code ?", and the legacy column is only still matched on
// the way IN, so codes handed out before this keep working.
export async function getMyInviteCode(memberId: string): Promise<string> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`SELECT referral_code FROM members WHERE id = ${memberId}`) as { referral_code: string | null }[];
  if (rows[0]?.referral_code) return rows[0].referral_code;
  const minted = await mintReferralCode(memberId);
  if (!minted) throw new Error("invite_code_gen_failed");
  return minted;
}

export async function getMemberByInviteCode(code: string): Promise<{ id: string; name: string } | null> {
  await ensureSchema();
  const sql = sqlClient();
  // Prefer the current code; fall back to the retired column so codes shared before the merge still
  // resolve. ORDER BY puts an exact referral_code match first if both somehow exist.
  const rows = (await sql`
    SELECT id, name FROM members
    WHERE upper(referral_code) = ${code.toUpperCase()} OR upper(invite_code) = ${code.toUpperCase()}
    ORDER BY (upper(referral_code) = ${code.toUpperCase()}) DESC
    LIMIT 1
  `) as { id: string; name: string }[];
  return rows[0] ?? null;
}

// Admin invites an existing account into their family by that account's code. Notifies the invitee.
export async function createInvite(
  familyId: string,
  inviterId: string,
  inviteeId: string,
): Promise<{ ok: boolean; reason?: "self" | "already_member" }> {
  await ensureSchema();
  const sql = sqlClient();
  if (inviteeId === inviterId) return { ok: false, reason: "self" };
  if (await isFamilyMember(inviteeId, familyId)) return { ok: false, reason: "already_member" };
  const id = newId("inv");
  await sql`INSERT INTO invites (id, family_id, invitee_id, inviter_id, status) VALUES (${id}, ${familyId}, ${inviteeId}, ${inviterId}, 'pending')`;
  const fam = (await sql`SELECT name FROM families WHERE id = ${familyId}`) as { name: string }[];
  const inviter = (await sql`SELECT name FROM members WHERE id = ${inviterId}`) as { name: string }[];
  await addNotification(familyId, inviteeId, "family_invite", {
    inviteId: id,
    familyName: fam[0]?.name ?? "une famille/groupe",
    inviterName: inviter[0]?.name ?? "Quelqu'un",
  });
  return { ok: true };
}

// The invitee accepts: add the membership (+ make it active if they had none), notify the inviter.
export async function acceptInvite(inviteId: string, inviteeId: string): Promise<boolean> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT family_id, inviter_id FROM invites
    WHERE id = ${inviteId} AND invitee_id = ${inviteeId} AND status = 'pending'
  `) as { family_id: string; inviter_id: string }[];
  if (rows.length === 0) return false;
  const familyId = rows[0].family_id;
  await sql`INSERT INTO memberships (member_id, family_id, role) VALUES (${inviteeId}, ${familyId}, 'member') ON CONFLICT (member_id, family_id) DO NOTHING`;
  await sql`UPDATE members SET family_id = ${familyId}, role = 'member' WHERE id = ${inviteeId} AND family_id IS NULL`;
  await sql`UPDATE invites SET status = 'accepted', decided_at = now() WHERE id = ${inviteId} AND status = 'pending'`;
  // Notify ALL existing members someone joined (consistent with acceptJoinRequest — was only the inviter).
  const who = (await sql`SELECT name FROM members WHERE id = ${inviteeId}`) as { name: string }[];
  const others = (await sql`SELECT member_id AS id FROM memberships WHERE family_id = ${familyId} AND member_id <> ${inviteeId}`) as { id: string }[];
  for (const o of others) {
    await addNotification(familyId, o.id, "member_joined", { name: who[0]?.name ?? "Quelqu'un" });
  }
  return true;
}

export async function refuseInvite(inviteId: string, inviteeId: string): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT family_id, inviter_id FROM invites
    WHERE id = ${inviteId} AND invitee_id = ${inviteeId} AND status = 'pending'
  `) as { family_id: string; inviter_id: string }[];
  if (rows.length === 0) return;
  await sql`UPDATE invites SET status = 'refused', decided_at = now() WHERE id = ${inviteId} AND status = 'pending'`;
  const who = (await sql`SELECT name FROM members WHERE id = ${inviteeId}`) as { name: string }[];
  await addNotification(rows[0].family_id, rows[0].inviter_id, "invite_refused", { name: who[0]?.name ?? "Quelqu'un" });
}

// ---------- notifications ----------

export async function addNotification(
  familyId: string,
  memberId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const sql = sqlClient();
  await sql`
    INSERT INTO notifications (id, family_id, member_id, type, payload)
    VALUES (${newId("ntf")}, ${familyId}, ${memberId}, ${type}, ${JSON.stringify(payload)}::jsonb)
  `;
}

export async function getNotifications(memberId: string): Promise<AppNotification[]> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT id, type, payload, read, created_at FROM notifications
    WHERE member_id = ${memberId} ORDER BY read ASC, created_at DESC LIMIT 50
  `) as { id: string; type: string; payload: Record<string, unknown>; read: boolean; created_at: string }[];
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    payload: r.payload ?? {},
    read: r.read,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export async function markNotificationsRead(memberId: string, id?: string): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  if (id) {
    await sql`UPDATE notifications SET read = true WHERE member_id = ${memberId} AND id = ${id}`;
  } else {
    await sql`UPDATE notifications SET read = true WHERE member_id = ${memberId} AND read = false`;
  }
}

// ---------- preferences (family-scoped) ----------

export async function getAllPreferences(familyId: string): Promise<PreferenceMap> {
  await ensureSchema();
  const sql = sqlClient();
  // Tastes are personal (keyed by person, shared across an account's familles/groupes), so scope by
  // the famille/groupe's members via memberships rather than the pref row's denormalized family_id.
  const rows = (await sql`
    SELECT person, food_id, status FROM preferences
    WHERE person IN (SELECT member_id FROM memberships WHERE family_id = ${familyId})
  `) as { person: string; food_id: string; status: Status }[];
  const out: PreferenceMap = {};
  for (const row of rows) (out[row.person] ??= {})[row.food_id] = row.status;
  return out;
}

export async function setPreference(
  familyId: string,
  person: string,
  foodId: string,
  status: Status | null,
  favorite = false,
): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  if (status === null) {
    await sql`DELETE FROM preferences WHERE family_id = ${familyId} AND person = ${person} AND food_id = ${foodId}`;
  } else {
    await sql`
      INSERT INTO preferences (person, food_id, status, family_id, favorite)
      VALUES (${person}, ${foodId}, ${status}, ${familyId}, ${favorite})
      ON CONFLICT (person, food_id)
      DO UPDATE SET status = ${status}, family_id = ${familyId}, favorite = ${favorite}, updated_at = now()
    `;
  }
}

// Favorite ("coup de cœur") food ids per person, for the family's members. Personal + additive,
// read separately so /api/preferences keeps returning the plain status map (2 consumers rely on it).
export async function getFavorites(familyId: string): Promise<Record<string, string[]>> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT person, food_id FROM preferences
    WHERE favorite = true AND person IN (SELECT member_id FROM memberships WHERE family_id = ${familyId})
  `) as { person: string; food_id: string }[];
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.person] ??= []).push(r.food_id);
  return out;
}

// ---------- custom foods (family-scoped) ----------

export async function getCustomFoods(familyId: string): Promise<CustomFood[]> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT id, label, category, created_by FROM custom_foods
    WHERE family_id = ${familyId} ORDER BY created_at
  `) as { id: string; label: string; category: string; created_by: string }[];
  return rows.map((r) => ({ id: r.id, label: r.label, category: r.category, createdBy: r.created_by }));
}

export async function addCustomFood(familyId: string, food: CustomFood): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  await sql`
    INSERT INTO custom_foods (id, label, category, created_by, family_id)
    VALUES (${food.id}, ${food.label}, ${food.category}, ${food.createdBy}, ${familyId})
    ON CONFLICT (id) DO NOTHING
  `;
}

// ---------- meal log (family-scoped) ----------

export async function getMealLog(familyId: string, limit = 100): Promise<MealLogEntry[]> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT id, dish_id, dish_name, course, diners, eaten_at
    FROM meal_log WHERE family_id = ${familyId} ORDER BY eaten_at DESC LIMIT ${limit}
  `) as {
    id: number;
    dish_id: string;
    dish_name: string;
    course: string;
    diners: string[];
    eaten_at: string;
  }[];
  return rows.map((r) => ({
    id: Number(r.id),
    dishId: r.dish_id,
    dishName: r.dish_name,
    course: r.course,
    diners: r.diners ?? [],
    eatenAt: new Date(r.eaten_at).toISOString(),
  }));
}

export async function addMealLog(
  familyId: string,
  entry: { dishId: string; dishName: string; course: string; diners: string[] },
): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  await sql`
    INSERT INTO meal_log (dish_id, dish_name, course, diners, family_id)
    VALUES (${entry.dishId}, ${entry.dishName}, ${entry.course}, ${entry.diners}, ${familyId})
  `;
}

// ---------- meal plan (family-scoped) ----------

export async function getMealPlan(familyId: string, from: string, to: string): Promise<MealPlanEntry[]> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT to_char(plan_date, 'YYYY-MM-DD') AS date, slot, dish_id, dish_name, course, diners, guests, member_id
    FROM meal_plan
    WHERE family_id = ${familyId} AND plan_date BETWEEN ${from} AND ${to}
    ORDER BY plan_date, slot
  `) as { date: string; slot: Slot; dish_id: string; dish_name: string; course: string; diners: string[] | null; guests: number | null; member_id: string | null }[];
  return rows.map((r) => ({
    date: r.date,
    slot: r.slot,
    dishId: r.dish_id,
    dishName: r.dish_name,
    course: r.course,
    diners: r.diners ?? [],
    guests: r.guests ?? 0,
    addedBy: r.member_id ?? undefined,
  }));
}

export async function addMealPlanDish(
  familyId: string,
  date: string,
  slot: Slot,
  dish: { dishId: string; dishName: string; course: string; diners?: string[]; guests?: number },
  memberId?: string,
): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  const diners = dish.diners ?? [];
  const guests = Math.max(0, Math.min(20, Math.round(dish.guests ?? 0)));
  const addedBy = memberId ?? null;
  await sql`
    INSERT INTO meal_plan (plan_date, slot, dish_id, dish_name, course, diners, guests, member_id, family_id)
    VALUES (${date}, ${slot}, ${dish.dishId}, ${dish.dishName}, ${dish.course}, ${diners}, ${guests}, ${addedBy}, ${familyId})
    ON CONFLICT (plan_date, slot, dish_id)
    DO UPDATE SET dish_name = ${dish.dishName}, course = ${dish.course}, diners = ${diners}, guests = ${guests}, member_id = COALESCE(meal_plan.member_id, ${addedBy}), family_id = ${familyId}, updated_at = now()
  `;
}

// Set the "extra adults" (guests) for a whole meal slot — updates every dish of that date/slot so the
// slot's guest count stays uniform. Additive: does not change addMealPlanDish/getMealPlan.
export async function setMealGuests(familyId: string, date: string, slot: Slot, guests: number): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  const g = Math.max(0, Math.min(20, Math.round(guests)));
  await sql`
    UPDATE meal_plan SET guests = ${g}, updated_at = now()
    WHERE family_id = ${familyId} AND plan_date = ${date} AND slot = ${slot}
  `;
}

// Weekly shopping-list "done" flag, keyed by the week's Monday (YYYY-MM-DD).
export async function isShoppingDone(familyId: string, weekStart: string): Promise<boolean> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`SELECT 1 FROM shopping_done WHERE family_id = ${familyId} AND week_start = ${weekStart} LIMIT 1`) as unknown[];
  return rows.length > 0;
}

export async function setShoppingDone(familyId: string, weekStart: string, done: boolean): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  if (done) {
    await sql`
      INSERT INTO shopping_done (family_id, week_start, done_at) VALUES (${familyId}, ${weekStart}, now())
      ON CONFLICT (family_id, week_start) DO UPDATE SET done_at = now()
    `;
    // Finishing the shopping empties the list: the manually-requested products, every tick mark
    // and every removal (next time the week is planned it starts from a clean list).
    await sql`DELETE FROM shopping_requests WHERE family_id = ${familyId}`;
    await sql`DELETE FROM shopping_checks WHERE family_id = ${familyId} AND week_start = ${weekStart}`;
    await sql`DELETE FROM shopping_removed WHERE family_id = ${familyId} AND week_start = ${weekStart}`;
    await sql`DELETE FROM shopping_overrides WHERE family_id = ${familyId} AND week_start = ${weekStart}`;
  } else {
    await sql`DELETE FROM shopping_done WHERE family_id = ${familyId} AND week_start = ${weekStart}`;
  }
}

export type ShoppingRequest = { id: string; memberId: string; label: string; brand: string | null; qty: number; checked: boolean };

export async function listShoppingRequests(familyId: string): Promise<ShoppingRequest[]> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT id, member_id, label, brand, qty, checked FROM shopping_requests WHERE family_id = ${familyId} ORDER BY created_at
  `) as { id: string; member_id: string; label: string; brand: string | null; qty: number; checked: boolean }[];
  return rows.map((r) => ({ id: r.id, memberId: r.member_id, label: r.label, brand: r.brand, qty: r.qty, checked: r.checked }));
}

export async function setRequestChecked(familyId: string, id: string, checked: boolean): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  await sql`UPDATE shopping_requests SET checked = ${checked} WHERE family_id = ${familyId} AND id = ${id}`;
}

// Estimated-product tick marks, shared per family + week.
export async function listShoppingChecks(familyId: string, weekStart: string): Promise<string[]> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`SELECT food_id FROM shopping_checks WHERE family_id = ${familyId} AND week_start = ${weekStart}`) as { food_id: string }[];
  return rows.map((r) => r.food_id);
}

export async function setShoppingCheck(familyId: string, weekStart: string, foodId: string, checked: boolean): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  if (checked) {
    await sql`INSERT INTO shopping_checks (family_id, week_start, food_id) VALUES (${familyId}, ${weekStart}, ${foodId}) ON CONFLICT DO NOTHING`;
  } else {
    await sql`DELETE FROM shopping_checks WHERE family_id = ${familyId} AND week_start = ${weekStart} AND food_id = ${foodId}`;
  }
}

// Estimated products removed from a week's list, shared per family + week — so a deleted item
// stays gone across reloads and for every member (mirrors the tick marks above).
export async function listShoppingRemoved(familyId: string, weekStart: string): Promise<string[]> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`SELECT food_id FROM shopping_removed WHERE family_id = ${familyId} AND week_start = ${weekStart}`) as { food_id: string }[];
  return rows.map((r) => r.food_id);
}

export async function setShoppingRemoved(familyId: string, weekStart: string, foodId: string, removed: boolean): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  if (removed) {
    await sql`INSERT INTO shopping_removed (family_id, week_start, food_id) VALUES (${familyId}, ${weekStart}, ${foodId}) ON CONFLICT DO NOTHING`;
  } else {
    await sql`DELETE FROM shopping_removed WHERE family_id = ${familyId} AND week_start = ${weekStart} AND food_id = ${foodId}`;
  }
}

// Per-product overrides (custom pack qty and/or chosen brand), keyed by item_key, per family + week.
export type ShoppingOverride = { qty: number | null; brand: string | null };
export async function listShoppingOverrides(familyId: string, weekStart: string): Promise<Record<string, ShoppingOverride>> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`SELECT item_key, qty, brand FROM shopping_overrides WHERE family_id = ${familyId} AND week_start = ${weekStart}`) as {
    item_key: string;
    qty: number | null;
    brand: string | null;
  }[];
  const out: Record<string, ShoppingOverride> = {};
  for (const r of rows) out[r.item_key] = { qty: r.qty, brand: r.brand };
  return out;
}

// Set/merge a product's qty and/or brand. Passing both null (and no remaining override) deletes the row.
export async function setShoppingOverride(
  familyId: string,
  weekStart: string,
  itemKey: string,
  patch: { qty?: number | null; brand?: string | null },
): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  const cur = (await sql`SELECT qty, brand FROM shopping_overrides WHERE family_id = ${familyId} AND week_start = ${weekStart} AND item_key = ${itemKey}`) as {
    qty: number | null;
    brand: string | null;
  }[];
  const qty = patch.qty !== undefined ? patch.qty : (cur[0]?.qty ?? null);
  const brand = patch.brand !== undefined ? patch.brand : (cur[0]?.brand ?? null);
  if (qty == null && brand == null) {
    await sql`DELETE FROM shopping_overrides WHERE family_id = ${familyId} AND week_start = ${weekStart} AND item_key = ${itemKey}`;
    return;
  }
  await sql`
    INSERT INTO shopping_overrides (family_id, week_start, item_key, qty, brand)
    VALUES (${familyId}, ${weekStart}, ${itemKey}, ${qty}, ${brand})
    ON CONFLICT (family_id, week_start, item_key) DO UPDATE SET qty = ${qty}, brand = ${brand}
  `;
}

export async function addShoppingRequest(
  familyId: string,
  memberId: string,
  label: string,
  brand: string | null,
  qty: number,
): Promise<ShoppingRequest> {
  await ensureSchema();
  const sql = sqlClient();
  const id = newId("req");
  const q = Math.max(1, Math.min(99, Math.round(qty || 1)));
  await sql`INSERT INTO shopping_requests (id, family_id, member_id, label, brand, qty) VALUES (${id}, ${familyId}, ${memberId}, ${label}, ${brand}, ${q})`;
  return { id, memberId, label, brand, qty: q, checked: false };
}

export async function removeShoppingRequest(familyId: string, id: string): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  await sql`DELETE FROM shopping_requests WHERE family_id = ${familyId} AND id = ${id}`;
}

export async function removeMealPlanDish(
  familyId: string,
  date: string,
  slot: Slot,
  dishId: string,
): Promise<void> {
  await ensureSchema();
  const sql = sqlClient();
  await sql`DELETE FROM meal_plan WHERE family_id = ${familyId} AND plan_date = ${date} AND slot = ${slot} AND dish_id = ${dishId}`;
}
