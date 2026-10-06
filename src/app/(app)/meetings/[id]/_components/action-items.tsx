"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldMessage, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_ACTION_TEXT,
  acceptedSummary,
  canApply,
  nextStatus,
  validateEdit,
  type ActionItemAction,
} from "@/lib/action-items";
import { fadeUpTransition, layoutShiftTransition } from "@/lib/motion";
import type { ActionItemStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { updateActionItem } from "../actions";
import { CitationChip } from "./citation-chip";

export type ActionItemView = {
  id: string;
  text: string;
  assignee: string | null;
  status: ActionItemStatus;
  editedAt: string | null;
  segmentIndex: number | null;
  startMs: number | null;
};

type Variables = {
  id: string;
  action: ActionItemAction;
  text?: string;
  assignee?: string | null;
};

export function ActionItems({
  meetingId,
  items,
}: {
  meetingId: string;
  items: ActionItemView[];
}) {
  const queryClient = useQueryClient();
  const queryKey = ["action-items", meetingId];
  const [editingId, setEditingId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (vars: Variables) => {
      const result = await updateActionItem({ meetingId, actionItemId: vars.id, ...vars });
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },

    // Triage is a fast, repetitive job — waiting on a round trip between each
    // decision would make it feel broken. The server still has the final say.
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ActionItemView[]>(queryKey);

      queryClient.setQueryData<ActionItemView[]>(queryKey, (old) =>
        (old ?? []).map((item) => {
          if (item.id !== vars.id) return item;
          const status = nextStatus(item.status, vars.action) ?? item.status;
          return {
            ...item,
            status,
            text: vars.text ?? item.text,
            assignee: vars.action === "edit" ? (vars.assignee ?? null) : item.assignee,
            editedAt: vars.action === "edit" ? new Date().toISOString() : item.editedAt,
          };
        })
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      toast.error(error instanceof Error ? error.message : "That change didn't save.");
    },

    onSuccess: (_data, vars) => {
      if (vars.action === "dismiss") {
        toast.success("Action item dismissed", {
          action: {
            label: "Undo",
            onClick: () => mutation.mutate({ id: vars.id, action: "restore" }),
          },
        });
      }
      if (vars.action === "edit") setEditingId(null);
    },
  });

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-line-200 bg-white px-5 py-8 text-center text-[12.5px] text-slate-400">
        No action items were proposed for this meeting.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Action items</h2>
        <span className="text-xs text-slate-400">{acceptedSummary(items)}</span>
      </div>

      <ul className="overflow-hidden rounded-xl border border-line-200 bg-white">
        {items.map((item) => (
          <motion.li
            key={item.id}
            layout
            transition={layoutShiftTransition}
            className={cn(
              "border-b border-line-100 px-4 py-3.5 last:border-0",
              item.status === "DISMISSED" && "opacity-60"
            )}
          >
            {editingId === item.id ? (
              <EditForm
                item={item}
                pending={mutation.isPending}
                onCancel={() => setEditingId(null)}
                onSave={(text, assignee) =>
                  mutation.mutate({ id: item.id, action: "edit", text, assignee })
                }
              />
            ) : (
              <Row
                item={item}
                onAction={(action) => mutation.mutate({ id: item.id, action })}
                onEdit={() => setEditingId(item.id)}
              />
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function Row({
  item,
  onAction,
  onEdit,
}: {
  item: ActionItemView;
  onAction: (action: ActionItemAction) => void;
  onEdit: () => void;
}) {
  const dismissed = item.status === "DISMISSED";

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={fadeUpTransition}
      className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2.5"
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium text-ink",
            dismissed && "line-through decoration-slate-400"
          )}
        >
          {item.text}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-slate-400">
          {item.assignee && <span>{item.assignee}</span>}
          <CitationChip
            startMs={item.startMs}
            segmentIndex={item.segmentIndex}
            verified={item.status === "ACCEPTED"}
          />
          {item.status === "ACCEPTED" && <span className="text-success-text">Accepted</span>}
          {dismissed && <span>Dismissed by you</span>}
          {item.editedAt && <span>Edited</span>}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5">
        {canApply(item.status, "accept") && (
          <Button size="sm" onClick={() => onAction("accept")}>
            Accept
          </Button>
        )}
        {canApply(item.status, "edit") && (
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Edit
          </Button>
        )}
        {canApply(item.status, "dismiss") && (
          <Button size="sm" variant="ghost" onClick={() => onAction("dismiss")}>
            Dismiss
          </Button>
        )}
        {canApply(item.status, "restore") && (
          <Button size="sm" variant="secondary" onClick={() => onAction("restore")}>
            ↩ Restore
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function EditForm({
  item,
  pending,
  onCancel,
  onSave,
}: {
  item: ActionItemView;
  pending: boolean;
  onCancel: () => void;
  onSave: (text: string, assignee: string | null) => void;
}) {
  const [text, setText] = useState(item.text);
  const [assignee, setAssignee] = useState(item.assignee ?? "");
  const [errors, setErrors] = useState<{ text?: string; assignee?: string }>({});

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const check = validateEdit({ text, assignee });
    if (!check.ok) {
      setErrors({ [check.field]: check.message });
      return;
    }
    setErrors({});
    onSave(check.value.text, check.value.assignee);
  }

  const valid = text.trim().length > 0 && text.trim().length <= MAX_ACTION_TEXT;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <Label htmlFor={`text-${item.id}`}>What needs doing</Label>
        <Input
          id={`text-${item.id}`}
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setErrors((prev) => ({ ...prev, text: undefined }));
          }}
          aria-invalid={errors.text ? true : undefined}
          data-valid={!errors.text && valid ? true : undefined}
          onKeyDown={(e) => e.key === "Escape" && onCancel()}
        />
        {errors.text ? (
          <FieldMessage>{errors.text}</FieldMessage>
        ) : (
          valid && <FieldMessage tone="success">✓ Looks good.</FieldMessage>
        )}
      </div>

      <div>
        <Label htmlFor={`assignee-${item.id}`}>Owner (optional)</Label>
        <Input
          id={`assignee-${item.id}`}
          value={assignee}
          placeholder="Speaker 2"
          onChange={(e) => {
            setAssignee(e.target.value);
            setErrors((prev) => ({ ...prev, assignee: undefined }));
          }}
          aria-invalid={errors.assignee ? true : undefined}
        />
        {errors.assignee && <FieldMessage>{errors.assignee}</FieldMessage>}
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
