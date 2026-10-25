# readable-code: lint rules that keep code readable like a book

An Oxlint JS plugin plus a rule template that reject code slop: files that do not read top-down, long or deeply nested functions, vague boolean names, copied functions and source code that special-cases tests. Paired with the `lint-on-edit` hook, an agent sees each finding right after its edit and fixes it before moving on.

## Quick path (per project)

1. Copy the plugin: `mkdir -p tools/oxlint && cp -R <kit>/tools/oxlint/readable-code tools/oxlint/`
2. Install the pinned tools: `npm install -D -E oxlint@1.89.0 @oxlint/plugins@1.89.0 eslint-plugin-unicorn@79.0.0 eslint-plugin-sonarjs@4.2.2`
3. Merge `<kit>/.oxlintrc.json` into the project's `.oxlintrc.json`: the `plugins`, `jsPlugins`, `rules` and `overrides` keys. Keep any existing `jsPlugins` entry (for example `anti-slop`) next to ours.
4. Add `"lint": "oxlint"` to `package.json` scripts and run `npm run lint` in CI.
5. Verify: `npx oxlint` exits 0 on clean code and prints `readable-code(stepdown-order)` on a file whose helper sits above its caller.

## Rules

| Rule | Catches | Source |
|------|---------|--------|
| `readable-code/stepdown-order` | A module-level function declared above its first caller | This plugin (Uncle Bob's stepdown rule) |
| `readable-code/no-test-runner-branching` | `NODE_ENV === "test"`, `process.env.JEST_WORKER_ID`/`VITEST`, `typeof jest`/`vi` in source code (off in `*.test.ts(x)`) | This plugin |
| `eslint/max-lines-per-function` 40 (off in tests) | Functions that do too much | Oxlint native |
| `eslint/max-depth` 3 | Deep nesting | Oxlint native |
| `eslint/max-params` 3 | Long parameter lists | Oxlint native |
| `react/jsx-max-depth` 6 | Deep JSX trees | Oxlint native |
| `unicorn-js/consistent-boolean-name` | `valid()` instead of `isValid()` | eslint-plugin-unicorn via `jsPlugins` |
| `sonarjs/cognitive-complexity` 15 | Hard-to-follow control flow | eslint-plugin-sonarjs via `jsPlugins` |
| `sonarjs/no-identical-functions` | Copied functions in one file | eslint-plugin-sonarjs via `jsPlugins` |

## Lint on every agent edit (per machine)

1. `mkdir -p ~/.claude/hooks && cp <kit>/hooks/lint-on-edit.ts ~/.claude/hooks/`
2. Register it in `~/.claude/settings.json`:

   ```json
   {
     "hooks": {
       "PostToolUse": [
         { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/lint-on-edit.ts" }] }
       ]
     }
   }
   ```

The hook lints only `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs` files in a project that has `.oxlintrc.json` and a local `node_modules/.bin/oxlint`; everywhere else it exits 0 and does nothing. On findings it exits 2, which shows stderr to Claude ([Hooks](https://code.claude.com/docs/en/hooks)).

## Caveats

| Topic | Detail |
|-------|--------|
| TypeScript 7 | `eslint-plugin-sonarjs` 4.2.2 fails to load with TypeScript 7.0 (its JS API has no `ts.TypeFlags`). Keep the project on TypeScript 6. |
| ESLint 9 projects | `eslint-plugin-unicorn` 79 has peer `eslint >=10.4`. In a project pinned to ESLint 9, drop the `unicorn-js` entry and rule instead of forcing the install. |
| Alpha API | Oxlint JS plugins are alpha and not subject to semver ([JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)). Pin `oxlint` and `@oxlint/plugins` to the same exact version. |
| `plugins` key | Setting it replaces Oxlint's base set, so the template lists `eslint`, `typescript`, `unicorn`, `oxc` and adds `react`. |
| Not included | `sonarjs/no-commented-code` (fired neither under Oxlint nor ESLint 10 in a probe) and the heuristic rules from the research (mixed abstraction levels, literal special-case branches). |

## Develop the rules

From the kit root: `npm test` (Oxlint `RuleTester` on `node:test`), `npm run typecheck`, `npm run lint`.
