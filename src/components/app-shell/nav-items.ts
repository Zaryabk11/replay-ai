import { CircleCheckIcon, LayoutGridIcon, SearchIcon, SettingsIcon } from "lucide-react";

/**
 * The trimmed sidebar from the design file: Meetings, Search, Action Items,
 * Settings. Nothing else goes here without a design change.
 */
export const navItems = [
  { href: "/meetings", label: "Meetings", short: "Meetings", icon: LayoutGridIcon },
  { href: "/search", label: "Search", short: "Search", icon: SearchIcon },
  { href: "/action-items", label: "Action Items", short: "Actions", icon: CircleCheckIcon },
  { href: "/settings", label: "Settings", short: "Settings", icon: SettingsIcon },
] as const;

export type NavItem = (typeof navItems)[number];

/** A nav entry owns its own section, so /meetings/abc keeps Meetings lit. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
