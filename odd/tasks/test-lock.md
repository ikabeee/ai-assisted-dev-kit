---
status: in-progress
---

# test-lock

Objective: tests come first, and once they are reviewed they stay locked while the code is implemented, so an agent makes them pass instead of editing them. Branch: `feat/test-lock`. Delivery: work-unit commits. Test runner: `node --test`.

## Specs

- S1. Tests-first rule in `CLAUDE.md`. User: "tenemos que agregar que primero son los tests antes de implementar features". For every feature or bugfix the tests are written from the specs and observed failing (RED) before implementation code.
- S2. A Claude Code `PreToolUse` hook on `Edit|Write` blocks (exit 2) any write to a test file while `<project>/.claude/tests.lock` exists. Test files: names matching `*.test.*` or `*.spec.*` (JS/TS extensions), or any path segment `__tests__`, `test` or `tests` relative to the project root. The message tells the agent to make the tests pass without changing them and to report a wrong test to the user.
- S3. The swarm-workflow runs tests first: tests (RED) → Claude reviews them against the specs → lock → implementation → GREEN → unlock.
- S4. Docs: hook install (both hooks in one place), lock/unlock commands, limitations, README.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S2 | inline: hook + shared hook-input module (lint-on-edit reuses it) | done (RED 0/5 → GREEN 5/5; lint-on-edit 4/4 after refactor) | see git log |
| T2 | S1, S3, S4 | inline | pending | — |

## Log

- L1 (2026-10-25, user): "Y eso es a partir de una skill? Ademas tenemos que agregar que primero son los tests antes de implementar features"
- L2 (2026-10-25, user): "Go ahead, ademas creo que esto aun no esta implementado en gentle ai, dale un research a los issues para proponer ese aspecto". Correction with evidence: gentle-ai already ships an advisory test-first policy ("observe RED before implementation"); `gentle-ai sync --help` says "applicable test-first ODD is default". The deterministic lock is what is checked upstream in `docs/research/gentle-ai-test-lock.md`.
- L3 (2026-10-25): Design facts. `PreToolUse` exit 2 "Blocks the tool call"; settings hooks "also run inside subagents" with `agent_id` (https://code.claude.com/docs/en/hooks), so Claude subagent coders are covered. Not covered: Bash writes and non-Claude harnesses; the swarm's per-diff edit-surface check (test files are outside the implementer's surface) covers those. ImpossibleBench recommends "restricting them to read-only access during implementation" (docs/research/ai-generated-code-slop.md).
