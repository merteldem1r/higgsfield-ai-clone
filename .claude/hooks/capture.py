#!/usr/bin/env python3
"""Append each prompt and final response to .agent-logs/<date>_<time>_<session>.md.

Wired from .claude/settings.json:
  SessionStart     -> capture.py session   (remembers the model for the first prompt)
  UserPromptSubmit -> capture.py prompt    (logs the prompt verbatim)
  Stop             -> capture.py response  (logs the final assistant text of the turn)

Entries are append-only; only the front-matter header is regenerated (counts/times).
Never blocks Claude Code: every failure is swallowed and written to ~/.claude/capture-errors.log.
Model strings are normalized to the bare API id (e.g. "claude-opus-5[1m]" -> "claude-opus-5") so
PROMPT and RESPONSE entries agree whether the model came from SessionStart or the transcript.
"""
import datetime
import glob
import json
import os
import re
import sys
import tempfile
import time
import traceback

AUTHOR = "merteldem1r"
TOOL = "claude-code"
PROJECT = "higgsfield-ai-clone"
ENTRY_RE = re.compile(r"^\[LOG_ENTRY type=(PROMPT|RESPONSE) num=(\d+) session=\w+\]\ntimestamp: (\S+)\nmodel: (.*)$", re.M)


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def model_cache(sid):
    return os.path.join(tempfile.gettempdir(), "claude-capture", sid + ".model")


def read_transcript(path):
    entries = []
    try:
        with open(path) as f:
            for line in f:
                try:
                    entries.append(json.loads(line))
                except ValueError:
                    pass
    except OSError:
        pass
    return entries


def normalize_model(m):
    """Drop a trailing variant tag such as "[1m]" so every entry uses the bare API model id."""
    return re.sub(r"\[[^\]]*\]$", "", (m or "").strip()) or "unknown"


def last_model(entries, sid):
    for e in reversed(entries):
        if e.get("type") == "assistant" and not e.get("isSidechain"):
            m = (e.get("message") or {}).get("model")
            if m and m != "<synthetic>":
                return normalize_model(m)
    try:
        with open(model_cache(sid)) as f:
            return normalize_model(f.read())
    except OSError:
        return "unknown"


def final_text(entries):
    """Text blocks of the trailing assistant messages (after the last tool result / prompt)."""
    parts = []
    for e in reversed(entries):
        if e.get("isSidechain"):
            continue
        if e.get("type") == "user":
            break
        if e.get("type") != "assistant":
            continue
        content = (e.get("message") or {}).get("content")
        if isinstance(content, str):
            parts.append(content)
        elif isinstance(content, list):
            texts = [b.get("text", "") for b in content if b.get("type") == "text"]
            if texts:
                parts.append("\n".join(texts))
    return "\n\n".join(reversed(parts)).strip()


def log_path(logdir, sid, ts):
    existing = glob.glob(os.path.join(logdir, "*_%s.md" % sid))
    if existing:
        return existing[0]
    stamp = ts[:19].replace("T", "_").replace(":", "-")
    return os.path.join(logdir, "%s_%s.md" % (stamp, sid))


def write_entry(logdir, sid, kind, ts, model, body):
    os.makedirs(logdir, exist_ok=True)
    path = log_path(logdir, sid, ts)
    old = ""
    if os.path.exists(path):
        with open(path) as f:
            old = f.read()
    idx = old.find("[LOG_ENTRY ")
    entries_text = old[idx:] if idx >= 0 else ""

    prompts = [m for m in ENTRY_RE.finditer(entries_text) if m.group(1) == "PROMPT"]
    num = len(prompts) + (1 if kind == "PROMPT" else 0)
    entry = "[LOG_ENTRY type=%s num=%d session=%s]\ntimestamp: %s\nmodel: %s\n\n%s\n\n\n" % (
        kind, max(num, 1), sid[:8], ts, model, body.rstrip("\n"))
    entries_text += entry

    all_entries = list(ENTRY_RE.finditer(entries_text))
    prompt_times = [m.group(3) for m in all_entries if m.group(1) == "PROMPT"]
    first = prompt_times[0] if prompt_times else ts
    last = prompt_times[-1] if prompt_times else ts
    header = (
        "---\n"
        "session_id: %s\n"
        "date: %s\n"
        "author: %s\n"
        "model: %s\n"
        "tool: %s\n"
        "project: %s\n"
        "total_exchanges: %d\n"
        "first_prompt_time: %s\n"
        "last_prompt_time: %s\n"
        "---\n\n"
        "# Session Log - %s\n\n"
        "Session: `%s` | Project: `%s` | Author: `%s`\n\n"
        "---\n\n"
    ) % (sid, first[:10], AUTHOR, all_entries[-1].group(4), TOOL, PROJECT, len(prompt_times),
         first, last, first[:10], sid[:8], PROJECT, AUTHOR)

    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        f.write(header + entries_text)
    os.replace(tmp, path)


def main():
    mode = sys.argv[1]
    data = json.load(sys.stdin)
    sid = data.get("session_id") or "unknown-session"
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    logdir = os.path.join(project_dir, ".agent-logs")
    ts = now_iso()

    if mode == "session":
        model = data.get("model")
        if isinstance(model, dict):
            model = model.get("id") or model.get("display_name")
        if model:
            os.makedirs(os.path.dirname(model_cache(sid)), exist_ok=True)
            with open(model_cache(sid), "w") as f:
                f.write(str(model))
        return

    transcript = data.get("transcript_path") or ""
    if mode == "prompt":
        entries = read_transcript(transcript)
        write_entry(logdir, sid, "PROMPT", ts, last_model(entries, sid), data.get("prompt", ""))
        return

    if mode == "response":
        text = (data.get("last_assistant_message") or "").strip() if isinstance(
            data.get("last_assistant_message"), str) else ""
        entries = read_transcript(transcript)
        # The transcript can lag the Stop event by a moment; wait briefly for the final text.
        for _ in range(20):
            if text:
                break
            text = final_text(entries)
            if text:
                break
            time.sleep(0.25)
            entries = read_transcript(transcript)
        write_entry(logdir, sid, "RESPONSE", ts, last_model(entries, sid),
                    text or "(no final text response captured for this turn)")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        try:
            with open(os.path.expanduser("~/.claude/capture-errors.log"), "a") as f:
                f.write(now_iso() + " " + " ".join(sys.argv) + "\n" + traceback.format_exc() + "\n")
        except Exception:
            pass
    sys.exit(0)
