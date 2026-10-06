"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldMessage, Input } from "@/components/ui/input";
import {
  MAX_SPEAKER_NAME,
  colorForOrder,
  displayName,
  shortName,
  validateSpeakerName,
  type SpeakerRecord,
} from "@/lib/speakers";
import { cn } from "@/lib/utils";
import { renameSpeaker } from "../actions";

/**
 * The speaker legend, with rename in place.
 *
 * Renaming writes one Speaker row; every segment follows, because segments
 * hold the provider's key rather than the display name.
 */
export function SpeakerList({
  meetingId,
  speakers,
}: {
  meetingId: string;
  speakers: SpeakerRecord[];
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);

  if (speakers.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2.5">
      {speakers.map((speaker) =>
        editingKey === speaker.key ? (
          <li key={speaker.key}>
            <RenameForm
              meetingId={meetingId}
              speaker={speaker}
              onDone={() => setEditingKey(null)}
            />
          </li>
        ) : (
          <li key={speaker.key}>
            <SpeakerChip speaker={speaker} onRename={() => setEditingKey(speaker.key)} />
          </li>
        )
      )}
    </ul>
  );
}

function SpeakerChip({
  speaker,
  onRename,
}: {
  speaker: SpeakerRecord;
  onRename: () => void;
}) {
  const color = colorForOrder(speaker.order);

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line-300 py-2 pr-2 pl-3">
      <span
        aria-hidden
        className={cn(
          "flex size-6.5 items-center justify-center rounded-full text-2xs font-semibold text-white",
          color.dot
        )}
      >
        {shortName(speaker)}
      </span>
      <span className="text-[13.5px] font-medium text-ink">{displayName(speaker)}</span>
      <button
        type="button"
        onClick={onRename}
        aria-label={`Rename ${displayName(speaker)}`}
        className="rounded-sm p-1 text-slate-400 outline-none transition-colors hover:text-slate focus-visible:shadow-focus"
      >
        <PencilIcon className="size-3.5" />
      </button>
    </div>
  );
}

function RenameForm({
  meetingId,
  speaker,
  onDone,
}: {
  meetingId: string;
  speaker: SpeakerRecord;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const color = colorForOrder(speaker.order);
  const [value, setValue] = useState(speaker.label ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (name: string) => {
      const result = await renameSpeaker({ meetingId, speakerKey: speaker.key, name });
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    // Optimistic: the name changes everywhere the moment Save is pressed.
    onMutate: async (name: string) => {
      await queryClient.cancelQueries({ queryKey: ["speakers", meetingId] });
      const previous = queryClient.getQueryData<SpeakerRecord[]>(["speakers", meetingId]);
      queryClient.setQueryData<SpeakerRecord[]>(["speakers", meetingId], (old) =>
        (old ?? []).map((s) => (s.key === speaker.key ? { ...s, label: name.trim() || null } : s))
      );
      return { previous };
    },
    onError: (cause, _name, context) => {
      queryClient.setQueryData(["speakers", meetingId], context?.previous);
      setError(cause instanceof Error ? cause.message : "That rename didn't save.");
    },
    onSuccess: () => onDone(),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const check = validateSpeakerName(value);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setError(null);
    mutation.mutate(value);
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-1 rounded-xl border border-deep-teal-200 bg-deep-teal-50 p-2"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "flex size-6.5 shrink-0 items-center justify-center rounded-full text-2xs font-semibold text-white",
            color.dot
          )}
        >
          {shortName(speaker)}
        </span>
        <Input
          autoFocus
          value={value}
          maxLength={MAX_SPEAKER_NAME}
          aria-label={`New name for ${speaker.key}`}
          aria-invalid={error ? true : undefined}
          placeholder={speaker.key}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onDone();
          }}
          className="h-8 w-34 text-sm"
        />
        <Button type="submit" size="sm" loading={mutation.isPending} aria-label="Save name">
          <CheckIcon />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onDone}
          aria-label="Cancel rename"
        >
          <XIcon />
        </Button>
      </div>
      {error && <FieldMessage>{error}</FieldMessage>}
      {!error && (
        <p className="px-1 text-2xs text-slate-400">Leave empty to restore {speaker.key}.</p>
      )}
    </form>
  );
}
