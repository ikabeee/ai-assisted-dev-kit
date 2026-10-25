---
status: done
---

# test-lock

Objective: tests come first, and once they are reviewed they stay locked while the code is implemented, so an agent makes them pass instead of editing them. Branch: `feat/test-lock`. Delivery: work-unit commits. Test runner: `node --test`.

## Specs

- S1. Tests-first rule in `CLAUDE.md`. User: "tenemos que agregar que primero son los tests antes de implementar features". Whenever a runnable test and a clear expected result exist, the tests are written from the specs and observed failing (RED) before implementation code. Small inline fixes stop there; the lock applies to tracked or delegated work (L5).
- S2. A Claude Code `PreToolUse` hook on `Edit|Write` blocks (exit 2) a change to an existing test file while `<project>/.claude/tests.lock` exists; creating a new test file stays allowed (L5). Test files: names matching `*.test.*` or `*.spec.*` (JS/TS extensions), or any path segment `__tests__`, `test` or `tests` relative to the project root. The message tells the agent to make the tests pass without changing them and to report a wrong test to the user.
- S3. The swarm-workflow runs tests first: tests (RED) → Claude reviews them against the specs → lock → implementation → GREEN → unlock.
- S4. Docs: hook install (both hooks in one place), lock/unlock commands, limitations, README.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S2 | inline: hook + shared hook-input module (lint-on-edit reuses it) | done (RED 0/5 → GREEN 5/5; lint-on-edit 4/4 after refactor) | see git log |
| T2 | S1, S3, S4 | inline | done (rule in kit + global CLAUDE.md, swarm steps, hooks/README.md, install) | see git log |

## Log

- L1 (2026-10-25, user): "Y eso es a partir de una skill? Ademas tenemos que agregar que primero son los tests antes de implementar features"
- L2 (2026-10-25, user): "Go ahead, ademas creo que esto aun no esta implementado en gentle ai, dale un research a los issues para proponer ese aspecto". Correction with evidence: gentle-ai already ships an advisory test-first policy ("observe RED before implementation"); `gentle-ai sync --help` says "applicable test-first ODD is default". The deterministic lock is what is checked upstream in `docs/research/gentle-ai-test-lock.md`.
- L3 (2026-10-25): Design facts. `PreToolUse` exit 2 "Blocks the tool call"; settings hooks "also run inside subagents" with `agent_id` (https://code.claude.com/docs/en/hooks), so Claude subagent coders are covered. Not covered: Bash writes and non-Claude harnesses; the swarm's per-diff edit-surface check (test files are outside the implementer's surface) covers those. ImpossibleBench recommends "restricting them to read-only access during implementation" (docs/research/ai-generated-code-slop.md).
- L4 (2026-10-25, close): Installed globally: `~/.claude/hooks/{hook-input,lint-on-edit,lock-tests}.ts`, PreToolUse `Edit|Write` entry merged into `~/.claude/settings.json` (diff: 12 added lines only; `jq -e` exit 0), tests-first rule in the global `CLAUDE.md`, swarm-workflow reinstalled. Live proof: with `.claude/tests.lock` present, an Edit to `scripts/objectives-index.test.ts` was blocked with the lock message and the file hash stayed `47dfaad1…`; lock removed after. Checks: `npm test` 62/62, typecheck 0, lint 0. Pending: the upstream proposal for gentle-ai (research running, `docs/research/gentle-ai-test-lock.md`), and posting it is the user's call. Next objective: 4, swarm-workflow fixes (bounded FEEDBACK, scratch cleanup; read-only tests are now covered here).
- L5 (2026-10-25, user): "Ahora lo que tengo duda si esto no rompe la filosofia de desarrollo de gentle ai" and "Aplica esos ajustes y traemelos al chat para ver como quedan". Analysis against the installed ODD text: the rule was stricter than ODD ("Small work stays inline and creates no durable task artifacts"; test-first only "when a relevant runnable deterministic test and clear expected outcome exist"), and blocking new test files broke "pin with a test" and "The writer commits the probes as regression tests". Changes: S1 scoped to tracked/delegated work and to applicable test-first; S2 freezes only existing test files (RED 5/6 → GREEN 6/6); the draft issue answers #5092's "No new toggle, mandatory agent, persistent artifact or review-authority mechanism" bar and gentle-shell#1354's "no proportional remedy".
