"use server";

import { revalidatePath } from "next/cache";
import { actionError, type ActionResult } from "@/lib/action-result";
import { canApply, nextStatus, validateEdit, type ActionItemAction } from "@/lib/action-items";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { validateSpeakerName } from "@/lib/speakers";

/**
 * Mutations for the meeting page.
 *
 * Every one re-checks ownership. The client updates optimistically, so the
 * server is the only place a refused change is actually caught.
 */

/** Confirm the meeting belongs to the signed-in user. */
async function ownedMeeting(meetingId: string): Promise<string | null> {
  const { user } = await requireSession();
  const meeting = await db.meeting.findFirst({
    where: { id: meetingId, userId: user.id },
    select: { id: true },
  });
  return meeting?.id ?? null;
}

/**
 * Rename a speaker. One row changes, and every segment follows, because
 * segments hold the provider's key rather than the display name.
 */
export async function renameSpeaker(input: {
  meetingId: string;
  speakerKey: string;
  name: string | null;
}): Promise<ActionResult<{ label: string | null }>> {
  const { meetingId, speakerKey } = input ?? {};
  if (typeof meetingId !== "string" || typeof speakerKey !== "string") {
    return actionError("Unknown speaker.");
  }

  const validated = validateSpeakerName(input.name);
  if (!validated.ok) return actionError(validated.message, "name");

  if (!(await ownedMeeting(meetingId))) return actionError("That meeting no longer exists.");

  const speaker = await db.speaker.findUnique({
    where: { meetingId_key: { meetingId, key: speakerKey } },
    select: { id: true },
  });
  if (!speaker) return actionError("That speaker isn't part of this meeting.");

  await db.speaker.update({
    where: { id: speaker.id },
    data: { label: validated.label },
  });

  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, data: { label: validated.label } };
}

/**
 * Accept, dismiss, restore or edit an action item.
 *
 * The transition is checked against the state machine here as well as in the
 * UI: an optimistic update is a guess, and a stale tab could guess wrong.
 */
export async function updateActionItem(input: {
  meetingId: string;
  actionItemId: string;
  action: ActionItemAction;
  text?: string;
  assignee?: string | null;
}): Promise<ActionResult<{ status: string }>> {
  const { meetingId, actionItemId, action } = input ?? {};
  if (typeof meetingId !== "string" || typeof actionItemId !== "string") {
    return actionError("Unknown action item.");
  }
  if (!["accept", "dismiss", "restore", "edit"].includes(action)) {
    return actionError("Unknown action.");
  }

  if (!(await ownedMeeting(meetingId))) return actionError("That meeting no longer exists.");

  const item = await db.actionItem.findFirst({
    where: { id: actionItemId, meetingId },
    select: { id: true, status: true },
  });
  if (!item) return actionError("That action item no longer exists.");

  if (!canApply(item.status, action)) {
    return actionError(`You can't ${action} an item that's already ${item.status.toLowerCase()}.`);
  }

  const status = nextStatus(item.status, action);
  if (!status) return actionError("That change isn't allowed.");

  const data: Record<string, unknown> = { status };

  if (action === "edit") {
    const validated = validateEdit({ text: input.text, assignee: input.assignee });
    if (!validated.ok) return actionError(validated.message, validated.field);
    data.text = validated.value.text;
    data.assignee = validated.value.assignee;
    data.editedAt = new Date();
  }

  if (action === "dismiss") data.dismissedAt = new Date();
  if (action === "restore") data.dismissedAt = null;

  await db.actionItem.update({ where: { id: item.id }, data });

  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, data: { status } };
}
