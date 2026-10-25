---
status: done
---

# readable-lint

Objective: a lint template that stops code slop and keeps code readable by humans, enforced while agents write. Branch: `feat/readable-lint`. Delivery: work-unit commits. Test runner: `node --test` with Oxlint's `RuleTester`.

## Specs

- S1. The kit ships a lint template for TS/JS/React projects: "el linter para dejar de hacer codigo slop y sea codigo leeible por los humanos". Oxlint 1.89 with JS plugins is the only linter (one tool); ESLint appears only as a documented fallback for a plugin that fails under Oxlint. Rule choices come from `docs/research/model-specific-slop-and-readable-code-lint.md`, section 5.
- S2. Custom rule `readable-code/stepdown-order` (research C1): report a module-level function declared above its first caller, with message data `{ callee, caller }` on the callee's name. Units: function declarations (also exported) and variables initialised with an arrow or function expression. Skip self-references, type-only positions, references outside any function body (module-init code) and mutual recursion. No autofix.
- S3. Native Oxlint rules in the template: `eslint/max-lines-per-function` `{ max: 40, skipBlankLines: true, skipComments: true }`, `eslint/max-depth` `3`, `eslint/max-params` `3`, `react/jsx-max-depth` `{ max: 6 }`.
- S4. Custom rule `readable-code/no-test-runner-branching` (research row 7): report source code that branches on the test runner: `process.env.JEST_WORKER_ID|VITEST|VITEST_WORKER_ID`, `process.env.NODE_ENV === "test"` and `typeof jest|vi`.
- S5. Third-party plugins through `jsPlugins`, each probed under Oxlint before it enters the template: `unicorn/consistent-boolean-name` and `eslint-plugin-sonarjs` (`cognitive-complexity` 15, `no-commented-code`, `no-identical-functions`). A plugin that fails the probe is documented as an ESLint fallback instead.
- S6. A Claude Code `PostToolUse` hook lints each JS/TS file an agent edits and feeds the findings back to the agent, so slop is fixed while the code is written.
- S7. Docs: install steps for the template, plugin and hook; the `readable-code` skill's completion criterion runs the linter.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1, S3, S5 | inline: scaffold (package.json, tsconfig, plugin index, template, probes); shared files stay with the parent | done (probe: 7 of 8 rules fire) | see Log L3 |
| T2 | S2 | delegated: Sonnet coder (swarm-workflow, parallel with T3) | done (18/18 tests; feedback: helpers reordered by call order) | see git log |
| T3 | S4 | delegated: Sonnet coder (swarm-workflow, parallel with T2) | done (30/30 tests; feedback: approved, no cleaner) | see git log |
| T4 | S6 | inline | done (4/4 tests; e2e: real hook + oxlint exit 2) | see git log |
| T5 | S7 | inline | done (README, plugin README, skill criterion 6, global install) | see git log |

## Log

- L1 (2026-10-25, user): "Vamos con el objetivo que me interesa que es el linter para dejar de hacer codigo slop y sea codigo leeible por los humanos"
- L2 (2026-10-25): Oxlint JS plugins are alpha; `eslintCompatPlugin` keeps rules ESLint-compatible; `createOnce` runs once per lint run; `RuleTester` comes from `oxlint/plugins-dev`; scope analysis is supported, type-aware rules are not (https://oxc.rs/docs/guide/usage/linter/js-plugins.html, https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html). `func-style` and the P3 heuristic rules (C2, C3, name-replacements, id-denylist) stay out: noisy or experimental per the research.
- L3 (2026-10-25, T1): The kit's root `.oxlintrc.json` is both the template and the kit's own config; the plugin lives at `tools/oxlint/readable-code/`, the same path projects use, so one file serves both. Setting `plugins` replaces the base set (eslint, unicorn, oxc, typescript), so `react` is listed with them; `react` and `unicorn` are reserved names, so the JS unicorn plugin is aliased `unicorn-js`. Probe on fixtures: `max-lines-per-function`, `max-depth`, `max-params`, `react/jsx-max-depth`, `unicorn-js/consistent-boolean-name`, `sonarjs/cognitive-complexity` and `sonarjs/no-identical-functions` fire under Oxlint 1.89. `sonarjs/no-commented-code` fired neither under Oxlint nor ESLint 10.13 (rule enabled per `--print-config`), so it is dropped. sonarjs fails to load with TypeScript 7.0.2 (`ts.TypeFlags` is undefined in TS 7's JS API, `ts-api-utils` crashes), independent of Oxlint: the kit pins TypeScript 6.0.3. `eslint-plugin-unicorn@79` has peer `eslint >=10.4`, so npm installs ESLint 10 alongside; projects pinned to ESLint 9 get a peer conflict. Checks: `npm test` 5/5, `npm run typecheck` exit 0, `npm run lint` 0 diagnostics on 3 files.
- L4 (2026-10-25, T3+T4): T3 coder (Sonnet 5.5, effort high) returned RED 11/30 then GREEN 30/30; feedback approved without a cleaner pass (only nit: double quotes vs the kit's single quotes, no formatter in the kit). The rule is off in `**/*.test.ts(x)` via overrides. T4 hook: RED 0/4 then GREEN 4/4 with an oxlint stub; e2e with the real hook and oxlint on a probe file returned exit 2 and the `no-test-runner-branching` message on stderr. Optional chaining (`process?.env?.VITEST`) is not detected; spec S4 lists dot and computed access only.
- L5 (2026-10-25, T2): T2 coder (Sonnet 5.5, effort high) returned RED 9/18 then GREEN 18/18. It resolves edges through `getDeclaredVariables` + `variable.references` (shadowed names never match), filters `TSTypeReference`/`TSTypeQuery` parents, and drops cycles with an iterative DFS. Feedback: approved; the parent, as cleaner, reordered helpers into call order (`collectUnits` before `findCalleesAboveFirstCaller`, `firstCaller` last) and moved `type Candidate` to the top. Coder scratch removed. Seam check: `npm test` 57/57, `npm run typecheck` exit 0, `oxlint` on the kit 9 files / 136 rules / 0 diagnostics (the kit passes its own stepdown rule). E2E: the real hook on the `parseRow`/`importCsv` probe returned exit 2 with the stepdown message.
- L6 (2026-10-25, close): Outcome: Oxlint template + `readable-code` plugin (`stepdown-order`, `no-test-runner-branching`) + `lint-on-edit` PostToolUse hook, docs in `tools/oxlint/readable-code/README.md`, and `readable-code` skill criterion 6 (run oxlint). Installed globally: `~/.claude/hooks/lint-on-edit.ts`, PostToolUse `Edit|Write` entry merged into `~/.claude/settings.json` (diff showed only the added block; `jq -e` exit 0), updated skill copy. Live proof in this session: a Write with a callee above its caller got the hook's stepdown error; the corrected Write passed silently. Final checks: `npm test` 57/57, `npm run typecheck` exit 0, `npm run lint` 0 diagnostics. Pending: install the template in each project (ut-e3 is on ESLint 9, so drop the `unicorn-js` rule there or upgrade ESLint); push/PR are the user's. Next objective: 6, test-edit hook.
