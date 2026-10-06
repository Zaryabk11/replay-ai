import { Brand } from "@/components/brand";
import { MobileNav, SidebarNav } from "@/components/app-shell/sidebar-nav";
import { UserFooter } from "@/components/app-shell/user-footer";
import { PageTransition } from "@/components/page-transition";
import { isDemoEmail } from "@/lib/demo-account";
import { requireSession } from "@/lib/session";

/**
 * Protected shell. `requireSession` redirects to /sign-in when there is no
 * session, so every page under (app) can assume a signed-in user.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireSession();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="hidden w-50 shrink-0 flex-col gap-1 bg-deep-teal-500 px-3.5 py-4.5 md:flex">
        <div className="px-2 pb-4">
          <Brand size="sm" tone="onTeal" href="/meetings" />
        </div>
        <SidebarNav />
        <UserFooter
          name={user.name}
          email={user.email}
          isDemo={isDemoEmail(user.email, process.env)}
        />
      </aside>

      <header className="flex items-center justify-between bg-deep-teal-500 px-4 py-3 md:hidden">
        <Brand size="sm" tone="onTeal" href="/meetings" />
        <span className="text-xs text-white/72">{user.name}</span>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex flex-1 flex-col">
          <PageTransition>{children}</PageTransition>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
