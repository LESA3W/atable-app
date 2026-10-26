// Shared domain types for the family meal-preference app.

export type Status = "O" | "M" | "N"; // O = aime, M = moyen/tolere, N = aime pas

export type PersonId = string; // built-ins: marc, paul, louis, moi, ninon, anya (+ user-added)

export type Course = "entree" | "plat" | "dessert";

export interface Food {
  id: string;
  label: string;
  category: string;
}

export interface Dish {
  id: string;
  name: string;
  course: Course;
  cookMin: number; // rough total prep + cook time, minutes (shown on the calendar)
  ingredients: string[]; // food ids
}

// person -> foodId -> status
export type PreferenceMap = Record<string, Record<string, Status>>;

export type Slot = "midi" | "soir";

export interface CustomFood {
  id: string;
  label: string;
  category: string;
  createdBy: string;
}

export interface MealLogEntry {
  id: number;
  dishId: string;
  dishName: string;
  course: string;
  diners: string[];
  eatenAt: string;
}

export interface MealPlanEntry {
  date: string; // YYYY-MM-DD
  slot: Slot;
  dishId: string;
  dishName: string;
  course: string;
  diners?: string[]; // member ids the meal is planned for (for the calendar's people count)
  addedBy?: string; // member id who added this dish to the plan
  guests?: number; // extra anonymous diners (guests) for this meal — scales the shopping portions
}

// ---------- Multi-tenant (families / members / notifications) ----------

export type MemberRole = "admin" | "member";

export interface ShoppingInfo {
  postalCode?: string | null;
  city?: string | null;
  markets?: string[] | null; // stores the user shops at (Market.key[]); multi-select
  market?: string | null; // legacy single store — kept for reading old profiles
  lat?: number | null;
  lon?: number | null;
}

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  textColor?: string | null;
  photo?: string | null;
  role: MemberRole;
  diet?: string | null;
  restrictions?: string[];
  isChild?: boolean;
  hasAccount?: boolean; // true = a real login (email); false = a managed profile
  // Freemium state — only populated for "me" (see getFamilyContext). Read through lib/premium.ts,
  // never compared by hand, so the client and the server apply the same rule.
  premiumUntil?: string | null; // ISO end of the trial; null = no trial was ever granted
  lifetimeFree?: boolean; // earned by bringing 2 people in before the launch deadline
  referralCode?: string | null; // this account's PUBLIC share code
  referralCount?: number; // how many accounts signed up through it
  shopping?: ShoppingInfo | null; // only populated for "me"
}

export interface Family {
  id: string;
  name: string;
  code: string;
}

// One famille/groupe the account belongs to, with the account's role in it (for the switcher).
export interface FamilySummary extends Family {
  role: MemberRole;
}

export interface FamilyContext {
  family: Family | null; // the ACTIVE famille/groupe; null = account exists but not in one yet
  families: FamilySummary[]; // all the account's familles/groupes (active included), for switching
  members: Member[]; // roster of the active famille/groupe
  me: Member;
}

export interface AppNotification {
  id: string;
  type: string; // e.g. "join_request", "member_joined", "join_accepted"
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface Auth {
  familyId: string | null; // null = signed-in account with no family yet
  memberId: string;
  role: MemberRole;
}
