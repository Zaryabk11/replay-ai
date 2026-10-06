import { Badge } from "@/components/ui/badge";
import type { MeetingStatus } from "@/generated/prisma/enums";

const statusBadge: Record<MeetingStatus, { label: string; variant: "success" | "info" | "neutral" | "error" }> = {
  READY: { label: "Ready", variant: "success" },
  PROCESSING: { label: "Processing", variant: "info" },
  PENDING: { label: "Queued", variant: "neutral" },
  FAILED: { label: "Failed", variant: "error" },
};

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const { label, variant } = statusBadge[status];
  return <Badge variant={variant}>{label}</Badge>;
}
