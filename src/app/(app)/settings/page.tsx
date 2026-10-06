import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Settings · Recap" };

export default function SettingsPage() {
  return (
    <PageHeader title="Settings" description="Your account and workspace preferences.">
      <ComingSoon note="Settings arrive once there is something to configure." />
    </PageHeader>
  );
}
