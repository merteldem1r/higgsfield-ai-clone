# CLAUDE.md

Working rules for Claude Code in this repo.

## Git

- Never run `git commit`, `git push`, `git reset`, `git rebase`, or anything else that rewrites history (`commit --amend`, `push --force`, `filter-branch`, `checkout -- <file>` over uncommitted work, etc.). `git commit` and `git push` are also denied in `.claude/settings.json`.
- The user makes all commits. When a task is done, list the changed files and suggest a commit message.
- Read-only git commands (`status`, `diff`, `log`, `show`) are fine.

## Agent logs and hooks

- `.agent-logs/` is written only by the capture hook and is append-only. Never edit, delete, move or reformat anything in it.
- Don't modify `.claude/hooks/` unless the user asks.

## Secrets

- Never hardcode or print API keys or other secrets. Don't echo them in commands, logs or responses.
- Keep keys in `.env.local`.
- Server-only keys never go into client code or `NEXT_PUBLIC_` variables.

## Work style

- Propose a plan before large changes.
- Work in small steps.
- Ask when requirements are ambiguous.
- Before adding any dependency, say why it's needed.

## Project context

_To be filled in after recon and planning._
