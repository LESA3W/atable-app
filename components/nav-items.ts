// Single source of truth for the app navigation, shared by the desktop top bar
// (TopNav) and the mobile bottom dock (BottomNav).
export type NavItem = { href: string; label: string; icon: string };

// Historique dropped from the nav: the calendar already shows past + planned meals, so it
// was redundant and ate a slot. The /historique route still exists if linked elsewhere.
export const NAV_ITEMS: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: "bell" },
  { href: "/preferences", label: "Mes goûts", icon: "heart" },
  { href: "/", label: "Repas", icon: "plus-circle" },
  { href: "/semaine", label: "Calendrier", icon: "calendar" },
  { href: "/parametres", label: "Profil", icon: "user" },
];
