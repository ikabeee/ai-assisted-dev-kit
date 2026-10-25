---
status: done
---

# lint-package

Objective: the lint rules live in their own public repository and package; the kit only references it. Branch: `feat/lint-package`. Delivery: work-unit commits. Test runner: `node --test`.

## Specs

- S1. New public repository with AI-related topics. User: "Crealo ponle tags que tengan que ver con AI".
- S2. The kit only references the new repository to use the tool. User: "este repositorio solo hara referencia al otro para poder hacer uso de la herramienta que acabamos de crear".
- S3. Remove the local scratch path from the kit's git history. User: "Borralo, no hay tema con el historal".

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S3 | inline: `git rebase --update-refs --exec` + force-with-lease push | done | see git log |
| T2 | S1 | inline: `ikabeee/eslint-plugin-readable-code` v0.1.0 | done | new repo `main`, tag `v0.1.0` |
| T3 | S2 | inline: kit depends on `github:ikabeee/eslint-plugin-readable-code#v0.1.0` | done | see git log |

## Log

- L1 (2026-10-25, user): "Haz push y capaz separamos el linter a un nuevo repositorio"
- L2 (2026-10-25, user): "Borralo, no hay tema con el historal / Crealo ponle tags que tengan que ver con AI y este repositorio solo hara referencia al otro para poder hacer uso de la herramienta que acabamos de crear"
- L3 (2026-10-25): History: the only commit with the path was `b51d162`; after the rebase no commit in `main..feat/test-lock` contains it; the empty removal commit was dropped; three branches force-pushed with `--force-with-lease`. Old SHAs may stay reachable on GitHub until its garbage collection.
- L4 (2026-10-25): Package facts. Node refuses type stripping under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, probed), so the package ships `dist/` built by `tsc` (`rewriteRelativeImportExtensions`) through `prepare`, which npm runs for git installs (https://docs.npmjs.com/cli/v11/using-npm/scripts). A preset's `jsPlugins` specifier resolves relative to the preset inside `node_modules` (probed). `eslint-plugin-unicorn` 79 left out of the preset (peer `eslint >=10.4` would break `npm install` on ESLint 9 projects); a consumer config adds it next to `extends`, and both rule sets fire (probed). The compiled plugin also works in ESLint 10 flat config (probed).
- L5 (2026-10-25, close): New repo checks: 48/48 tests, typecheck 0, build 0, self-lint 0 diagnostics, CI `success`; topics ai, llm, ai-agents, claude-code, ai-coding, ai-generated-code, code-quality, linter, oxlint, eslint-plugin, clean-code, readability. Clean install from the GitHub tag built `dist/` and the preset fired. Kit: local plugin removed, 15/15 tests, typecheck 0, lint 7 files / 136 rules / 0 diagnostics; the live `lint-on-edit` hook flagged a stepdown violation through the package. Next: publish the gentle-ai draft issue (user's call); remaining objectives 2, 3 and 4.
- L6 (2026-10-25, user goal): "Termina esos 4 puntos, algo que olvide decirte es que aparece generated with claude code". Attribution: removed the "Generated with Claude Code" line from PRs #1–#4, set `attribution` to `{ "commit": "", "pr": "", "sessionUrl": false }` in `~/.claude/settings.json`, and widened the CLAUDE.md rule to PRs and issues. (1) Kit CI: `.github/workflows/ci.yml` in PR #5, green on GitHub Actions. (2) PRs #1–#4 merged by the user with merge commits; my own merge was denied by the auto-mode classifier ("Merge Without Review"). (3) gentle-ai issue: body ready, privacy-scanned, no duplicates; posting was denied by the classifier ("Create Public Surface"), so the user posts it. (4) ut-e3: worktree `feature/readable-code-lint` from `develop`, oxlint 1.88.0 → 1.89.0, preset extended, 4 stepdown findings fixed by reordering, PR ikabeee/ut-e3#80 to `develop`.
