import type { ActionItemStatus } from "@/generated/prisma/enums";

/**
 * Triage rules for a proposed action item.
 *
 * The model proposes; a person decides. These rules are enforced on the
 * server, not just in the UI — an optimistic update that the server would
 * refuse has to be caught somewhere, and the client is not that place.
 */

export type ActionItemAction = "accept" | "dismiss" | "restore" | "edit";

const ALLOWED: Record<ActionItemStatus, readonly ActionItemAction[]> = {
  // Nothing has been decided yet.
  PROPOSED: ["accept", "dismiss", "edit"],
  // Accepting twice is a no-op, so it is not offered; dismissing still is.
  ACCEPTED: ["dismiss", "edit"],
  // Undo. The design calls it "Restore", and it returns the item to PROPOSED
  // rather than to ACCEPTED — the person never said yes to it.
  DISMISSED: ["restore"],
};

export function canApply(status: ActionItemStatus, action: ActionItemAction): boolean {
  return ALLOWED[status].includes(action);
}

export function allowedActions(status: ActionItemStatus): readonly ActionItemAction[] {
  return ALLOWED[status];
}

/** The status an action produces, or null when the action is not allowed. */
export function nextStatus(
  status: ActionItemStatus,
  action: ActionItemAction
): ActionItemStatus | null {
  if (!canApply(status, action)) return null;

  switch (action) {
    case "accept":
      return "ACCEPTED";
    case "dismiss":
      return "DISMISSED";
    case "restore":
      return "PROPOSED";
    // Editing the text never changes the triage state.
    case "edit":
      return status;
  }
}

/** Only accepted items are exported or counted as decisions. */
export function isAccepted(status: ActionItemStatus): boolean {
  return status === "ACCEPTED";
}

export function isDismissed(status: ActionItemStatus): boolean {
  return status === "DISMISSED";
}

/** "5 of 8 accepted", as the design file's triage header shows. */
export function acceptedSummary(items: readonly { status: ActionItemStatus }[]): string {
  const accepted = items.filter((item) => isAccepted(item.status)).length;
  return `${accepted} of ${items.length} accepted`;
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

export const MAX_ACTION_TEXT = 280;
export const MAX_ASSIGNEE = 60;

export type EditDraft = { text: string; assignee: string | null };

export type EditResult = { ok: true; value: EditDraft } | { ok: false; field: string; message: string };

/**
 * Validate an edit. Messages are written the way the design file writes inline
 * validation — a short sentence under the field.
 */
export function validateEdit(input: { text?: unknown; assignee?: unknown }): EditResult {
  if (typeof input.text !== "string") {
    return { ok: false, field: "text", message: "Enter what needs doing." };
  }

  const text = input.text.trim().replace(/\s+/g, " ");
  if (text.length === 0) {
    return { ok: false, field: "text", message: "Enter what needs doing." };
  }
  if (text.length > MAX_ACTION_TEXT) {
    return {
      ok: false,
      field: "text",
      message: `Keep it under ${MAX_ACTION_TEXT} characters.`,
    };
  }

  let assignee: string | null = null;
  if (typeof input.assignee === "string") {
    const trimmed = input.assignee.trim();
    if (trimmed.length > MAX_ASSIGNEE) {
      return {
        ok: false,
        field: "assignee",
        message: `Keep the owner under ${MAX_ASSIGNEE} characters.`,
      };
    }
    assignee = trimmed.length > 0 ? trimmed : null;
  }

  return { ok: true, value: { text, assignee } };
}
