# Capture Test

## Tool and model

- Tool: Claude Code (CLI)
- Model: `claude-sonnet-5-5`

## Mechanism

Two Claude Code hooks append every prompt and every final reply to a per-session Markdown log in `.agent-logs/`.

- **`UserPromptSubmit`** runs `capture-prompt.js`. It writes a `PROMPT` entry with the verbatim prompt text.
- **`Stop`** runs `capture-response.js`. It reads the session transcript (`transcript_path` from the hook payload), takes the final `end_turn` assistant text, and writes a `RESPONSE` entry.

Config: `.claude/settings.json` registers both hooks as `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<script>.js"` commands.

Scripts in `.claude/hooks/`:

| File | Role |
| --- | --- |
| `capture-prompt.js` | `UserPromptSubmit` hook. Creates the session log if missing, appends the PROMPT entry. |
| `capture-response.js` | `Stop` hook. Retries until the reply is in the transcript, appends the RESPONSE entry, skips duplicates. |
| `lib.js` | Shared helpers: log file creation, front matter updates, transcript parsing, model lookup, trace logging. |
| `.state/` | Runtime state. `trace.log` records every hook run; `<session_id>.json` records the last response uuid. Not part of the logs. |

Log files are named `<UTC date>_<UTC time>_<session_id>.md`. Both hooks write to the file for their session and never block a turn (every failure path exits 0).

## Where the canaries landed

| Canary | Prompt | Log file |
| --- | --- | --- |
| 1 | `CAPTURE TEST — 8x assignment, Zaryab` | `.agent-logs/2026-10-05_23-59-05_b658348f-5e58-4611-a439-d529eeb57288.md` |
| 2 | `CAPTURE TEST 2 - 8x ASSIGNMENT, ZARYAB` | `.agent-logs/2026-10-06_00-10-25_e3b1ee0f-b019-4e3b-b6d6-ae47c4f8ea48.md` |

## Canary entries (raw from the logs)

### Canary 1 (`b658348f`)

```
[LOG_ENTRY type=PROMPT num=1 session=b658348f-5e58-4611-a439-d529eeb57288]
timestamp: 2026-10-05T23:59:05.772Z
model: claude-sonnet-5-5

CAPTURE TEST — 8x assignment, Zaryab


[LOG_ENTRY type=RESPONSE num=1 session=b658348f-5e58-4611-a439-d529eeb57288]
timestamp: 2026-10-05T23:59:08.720Z
model: claude-sonnet-5-5

Received. This looks like a capture test, and I haven't taken any action. If you want me to do something in `C:\Code\replay-ai`, tell me what it is.

---
```

### Canary 2 (`e3b1ee0f`)

```
[LOG_ENTRY type=PROMPT num=1 session=e3b1ee0f-b019-4e3b-b6d6-ae47c4f8ea48]
timestamp: 2026-10-06T00:10:25.599Z
model: claude-sonnet-5-5

CAPTURE TEST 2 - 8x ASSIGNMENT, ZARYAB


[LOG_ENTRY type=RESPONSE num=1 session=e3b1ee0f-b019-4e3b-b6d6-ae47c4f8ea48]
timestamp: 2026-10-06T00:10:30.129Z
model: claude-sonnet-5-5

Received "CAPTURE TEST 2 - 8x ASSIGNMENT, ZARYAB", but it doesn't say what you want done, so I haven't taken any action.

What should I do in `C:\Code\replay-ai`? If this is a test of capturing the message, that worked.

---
```

## What failed first, and how each was fixed

1. **Hooks not loaded in the first session.**
   Claude Code reads hook configuration at startup. Hooks added to `.claude/settings.json` during a session don't take effect in that session. The first session (`2c4362a2`) was the one that set things up, so it never captured its own prompt properly; its log has only a stray `RESPONSE num=0` entry.
   Fix: start a fresh session after the config exists. Canaries 1 and 2 ran in fresh sessions and both hooks fired.

2. **The Stop hook wrote no RESPONSE.**
   In the second session (`19215aba`) the prompt was logged but no reply was. The trace showed the Stop hook did fire, about 100 ms after the transcript line holding the reply was written. The original script read the transcript once and returned silently when it found nothing. A race with the transcript flush is the likely cause; the timing could not be reproduced, so this is an inference.
   Fix: `capture-response.js` now retries up to 20 times, 250 ms apart (5 s total). It only accepts an `end_turn` reply that comes after the most recent human prompt. It dedupes by message uuid. Every skip reason goes to the trace log.

3. **Model showed as `unknown` (header) / `pending` (entry).**
   The model name isn't in the hook payload, and on a session's first prompt the transcript has no assistant message yet.
   Fix: both hooks read the model from the transcript (`findLatestModel`). On a first prompt the PROMPT entry is written as `pending`. The Stop hook then replaces it, and the front matter `model:`, with the real model from the reply. From the second prompt on, the prompt hook already knows the model. Canaries 1 and 2 both show `claude-sonnet-5-5` on every entry and in the front matter.

Debugging aid added along the way: `.claude/hooks/.state/trace.log`, outside `.agent-logs/`. It records payload keys, session id, transcript path, each skip reason, and a `wrote` line on success.
