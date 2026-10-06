"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, navItems } from "./nav-items";

/** Vertical nav inside the teal sidebar (tablet and up). */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] outline-none transition-colors focus-visible:shadow-focus",
              active
                ? "bg-white/14 font-medium text-white"
                : "text-white/72 hover:bg-white/8 hover:text-white"
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom bar on phones, where the sidebar collapses. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-20 flex border-t border-line-200 bg-white md:hidden"
    >
      {navItems.map(({ href, short, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.75 py-2.5 text-2xs outline-none transition-colors focus-visible:shadow-focus",
              active ? "text-deep-teal-500" : "text-slate-400 hover:text-slate"
            )}
          >
            <Icon aria-hidden className="size-4.5" />
            {short}
          </Link>
        );
      })}
    </nav>
  );
}
