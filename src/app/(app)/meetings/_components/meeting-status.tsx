import { Badge } from "@/components/ui/badge";
import type { MeetingStatus } from "@/generated/prisma/enums";

const statusBadge: Record<
  MeetingStatus,
  { label: string; variant: "success" | "info" | "neutral" | "error" }
> = {
  UPLOADED: { label: "Queued", variant: "neutral" },
  TRANSCRIBING: { label: "Transcribing", variant: "info" },
  SUMMARIZING: { label: "Summarizing", variant: "info" },
  VALIDATING: { label: "Validating", variant: "info" },
  READY: { label: "Ready", variant: "success" },
  FAILED: { label: "Failed", variant: "error" },
};

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const { label, variant } = statusBadge[status];
  return <Badge variant={variant}>{label}</Badge>;
}
