# Capture Test

Checks that every prompt I send and every final response the coding agent gives is written to disk automatically, before any product work starts.

## Tool and model

- **Tool:** Claude Code v2.1.278 (CLI), macOS, zsh
- **Model:** Claude Opus 5 with 1M context. SessionStart reports this as `claude-opus-5[1m]`; the transcript reports the API id `claude-opus-5`.
- **Author:** `merteldem1r`

## Mechanism and config files

Claude Code lifecycle hooks, set up at project level:

| File | Role |
|---|---|
| `.claude/settings.json` | Hooks three events to one script: `SessionStart` → `capture.py session`, `UserPromptSubmit` → `capture.py prompt`, `Stop` → `capture.py response`. Also denies `git commit` / `git push`. |
| `.claude/hooks/capture.py` | Appends entries to the session's log file. |

- `SessionStart` saves the session's model string to a temp cache (`$TMPDIR/claude-capture/<session>.model`) so the first prompt has a model before the transcript has one.
- `UserPromptSubmit` appends the prompt **verbatim**, with no trimming, and `<pasted_content>` tags are kept.
- `Stop` reads the session transcript and appends only the final text of the turn. It skips thinking, tool calls and text written between tool calls. It retries for about 5 s if the transcript hasn't finished writing.
- Logs are append-only. Only the front-matter header (counts and times) is regenerated. The hook never blocks Claude Code; any failures go to `~/.claude/capture-errors.log`.
- Model strings are normalized to the bare API id (`claude-opus-5`), so PROMPT and RESPONSE entries always match. See the last item under "What didn't work first".

## Log files

One file per session: `.agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md` (timestamp is UTC).

| File | What it is |
|---|---|
| `.agent-logs/2026-09-22_15-58-03_321352df-60f2-46d6-bf5c-3ba5477cde2f.md` | Setup session. Contains only an orphan RESPONSE (see below). |
| `.agent-logs/2026-09-22_16-03-47_f3dd3a39-a53c-4d55-a178-fb57140a4dce.md` | Canary 1 |
| `.agent-logs/2026-09-22_16-06-28_7613aef9-9f71-4bd3-94d7-348ddae44400.md` | Canary 2, in a separate session. This setup work continues in the same session. |

## Canary 1 (session `f3dd3a39`), raw

```text
[LOG_ENTRY type=PROMPT num=1 session=f3dd3a39]
timestamp: 2026-09-22T16:03:47.320Z
model: claude-opus-5[1m]



<pasted_content id="c82e">
CAPTURE TEST — 8x assignment, Mert
</pasted_content id="c82e">


[LOG_ENTRY type=RESPONSE num=1 session=f3dd3a39]
timestamp: 2026-09-22T16:03:59.726Z
model: claude-opus-5

The prompt capture hook is working. Your test prompt was logged to `.agent-logs/2026-09-22_16-03-47_f3dd3a39-a53c-4d55-a178-fb57140a4dce.md`:

- **Header:** it has the right session ID, author (`merteldem1r`), model, project and timestamp, and `total_exchanges: 1`.
- **Prompt entry:** it's saved as `PROMPT num=1`, and the pasted text sits inside the `<pasted_content>` tags word for word.

I can't see yet whether the response gets logged, because that hook only runs after this reply ends. Open the same file after this turn and look for a response entry.

A small thing: the prompt entry starts with a few empty lines. You might want to trim those in the hook.
```

## Canary 2 (session `7613aef9`), raw

```text
[LOG_ENTRY type=PROMPT num=1 session=7613aef9]
timestamp: 2026-09-22T16:06:28.180Z
model: claude-opus-5[1m]

CAPTURE TEST 2 -8x assignment, Mert second session


[LOG_ENTRY type=RESPONSE num=1 session=7613aef9]
timestamp: 2026-09-22T16:06:31.829Z
model: claude-opus-5[1m]

Got it. This looks like the second capture test for the prompt and response logging hooks. There's nothing to do on my end.

When this reply finishes, the hooks from commit `e37bc1a` should write this prompt and my final response to `.agent-logs/`. If you want, I can look in that folder afterwards and check that both sessions were recorded correctly.
```

Both canaries were captured, prompt and response, in two separate sessions.

## What didn't work first

1. **zsh `echo` test failure.** The first local test of `capture.py` fed it fake hook JSON through zsh's `echo`. zsh's `echo` interprets backslash escapes, so the script got invalid JSON and the test failed. The fault was in the test, not the hook, and the failure did go through the hook's error path without blocking anything. Later tests use `printf '%s'`.
2. **The setup prompt was not captured.** The prompt that asked for the capture setup was sent before the hooks existed, so nothing could record it. It was deliberately not added to the log by hand afterwards.
3. **Orphan RESPONSE in session 1 (`321352df`).** Claude Code picked up the new `Stop` hook partway through the setup session. `UserPromptSubmit` had not fired for that turn's prompt (see item 2). So the log has a `RESPONSE num=1` with no matching PROMPT and a header showing `total_exchanges: 0`. It was left as is.
4. **Model-string mismatch.** The prompt hook takes its model from the transcript's last assistant message. When there isn't one yet, as on a session's first prompt, it falls back to the SessionStart value `claude-opus-5[1m]`. The response hook usually finds `claude-opus-5` in the transcript. In canary 1 this gave `claude-opus-5[1m]` on the PROMPT and `claude-opus-5` on the RESPONSE. The mismatch was spotted after canary 1, but it is also visible in session `7613aef9`: PROMPT 1 and RESPONSE 1 show `[1m]`, and PROMPT 2 doesn't. The hook was fixed after both canaries. Every model string now goes through `normalize_model()`, which drops a trailing `[...]` tag, so all entries written from then on use `claude-opus-5`. Entries written before the fix were not edited.

## Out of scope for the hook

Scoping before the assignment happened in a **claude.ai chat**, not in Claude Code. The hook only sees Claude Code sessions in this repo, so that conversation is not in `.agent-logs/`.
