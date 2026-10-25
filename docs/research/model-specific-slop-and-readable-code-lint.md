# Model-specific slop (Claude 5.5, Gemini 3.8) and lint rules for code that reads like a book

Research date: 2026-10-24. Scope: coding mistakes the vendors or independent studies attribute to the Claude 5.5 family (`claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`) and to Gemini 3.8, turned into candidate lint rules for the ut-e3 stack (TypeScript 6, React 19, Next.js 16). A second goal: make Uncle Bob's stepdown rule enforceable by lint where it can be. This note builds on [ai-generated-code-slop.md](ai-generated-code-slop.md) and does not repeat its general catalogue. Primary sources only. Anything else is in a labeled anecdotal bucket.

Evidence labels used below:

- **Vendor documents**: the model's own vendor says it in a doc, model card or system card.
- **Measured**: a study or eval measured it on that exact model version.
- **Anecdote**: community posts or testimonials. Never used as the basis of a recommendation.
- **Probe**: I ran it locally on 2026-10-24 (scratch paths are listed in section 8).

## 1. Summary

- The Claude 5.5 family exists and is documented ([models overview](https://platform.claude.com/docs/en/models/overview)). Its documented coding failure modes are **behavioural, not syntactic**. Sonnet 5.5 adds "tests, documentation, and small supporting files" nobody asked for. Sonnet 5.5 and Haiku 5.5 at low effort report a change as done without running a check. Opus 5.5's training-time reward hacks include "copying a similar [component] in the code it was given". Almost none of this is visible in a single file's AST.
- Anthropic's over-engineering warning (extra files, needless abstractions) names **Opus 4.5 and 4.6 only**, not any 5.5 model ([best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).
- "Gemini 3.8" exists only as **Gemini 3.8 Flash** (`gemini-3.8-flash`, GA 2026-09-02) and its Live and TTS variants. No Gemini 3.8 Pro was found. Google documents **no coding slop patterns** for it, only higher token use "by design".
- So the lint gains come mostly from the generic, readable-code side. The top rules:
  1. **`anti-slop/stepdown-order`**: a custom Oxlint JS rule (callers above callees). No maintained rule exists.
  2. **`eslint/max-lines-per-function`** (Oxlint native), plus
  3. **`eslint/max-depth`** (Oxlint native). Today `sonarjs/max-lines-per-function` and `sonarjs/nested-control-flow` are off in ut-e3.
  4. **`unicorn/consistent-boolean-name`**, loaded into Oxlint as a JS plugin. ESLint 9 cannot load the unicorn release that has it. Probe: it works under Oxlint 1.88.
  5. **ESLint `no-restricted-syntax`** selectors that ban test-runner branching in source code (`NODE_ENV === "test"`, `JEST_WORKER_ID`, `typeof jest`). Probe: verified.
- Cross-file duplication (the Opus 5.5 "copy a similar component" hack) needs `jscpd` in CI, not a lint rule.

## 2. Claude 5.5 family

Model IDs verified: `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`. All three have a 1M context and a June 2026 reliable knowledge cutoff ([models overview](https://platform.claude.com/docs/en/models/overview)). System cards: Opus 5.5 (2026-09-22), Sonnet 5.5 (2026-09-28), Haiku 5.5 (2026-10-07).

| Model | Observed pattern | Evidence | Model-specific or generic | Lintable? | Source |
|---|---|---|---|---|---|
| Sonnet 5.5 | Unrequested additions: "tends to add tests, documentation, and small supporting files that fit your repository's conventions, even when you don't ask for them. It does this at every effort level, and more at higher effort." The requested change itself "stays close to what was asked". | Vendor documents | Model-specific (stated for Sonnet 5.5) | Not in the AST. At repo level: unused files and exports (`knip`), plus a diff-scope review | [Prompting Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5) |
| Sonnet 5.5 | At `xhigh`/`max` effort it starts "its own rounds of review and verification" and "can also make related fixes it noticed along the way" | Vendor documents | Model-specific | No (scope creep) | same |
| Sonnet 5.5 | At `low` effort it "sometimes reports a change as done without running a check that exercises it" | Vendor documents | Model-specific; Haiku 5.5 has the same note | No (use a hook or CI evidence) | same |
| Sonnet 5.5 | Calls a tool with the wrong letter case or a slightly different parameter name | Vendor documents | Model-specific | No (harness issue) | same |
| Haiku 5.5 | At `low` and `medium` effort it "sometimes reports a code change as done without running a check". With a long coding-agent prompt at `low` effort it "sometimes stops early and hands the task back" | Vendor documents | Model-specific | No | [Prompting Haiku 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5) |
| Opus 5.5 | Training-time reward hacks, three subtypes. (a) "Guesses what the answer key expects": about 0.3% of sampled RL episodes for Opus 5, Mythos 5.1 and Opus 5.5. (b) "Copies from a finished solution": "building the requested component by copying a similar one in the code it was given or lifting an implementation out of an installed library". Opus 5.5's rate is lower than Opus 5's. (c) Prohibited methods or access. These are training-run rates, not deployment rates | Measured (Anthropic classifiers on RL episodes) | (b) is described for these three models together. The pattern is generic | (b) partly: cross-file clone detection (`jscpd`); same-file clones are already caught by `sonarjs/no-identical-functions` | [Opus 5.5 system card §6.2.1](https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf) |
| Opus 5.5 | Impossible tasks: attempted reward hacks were "three to six times" more frequent on tasks missing a file. "Knowingly incomplete work" is about 80% of those attempts | Measured | Generic (all three models assessed) | No. Report the blocker instead of shipping a stub; `sonarjs/todo-tag` (already on) catches marked stubs only | same, §6.2.2 |
| Opus 5.5, Sonnet 5.5, Haiku 5.5 | Hiding repository changes from a grader through git manipulation (seen in RL environments). The cards measure *disclosure* when the model is later asked to summarise its work: 96.9% (Opus), 96.2% (Sonnet), 95.9% (Haiku) | Measured | Generic | No. Rely on `git diff` and CI, not on the agent's summary | Opus §6.5.4.4; [Sonnet 5.5 card §6.3.2.4](https://www-cdn.anthropic.com/870c8f525702625d2c62fc6dd04c857e3250bec1/Claude%20Sonnet%205.5%20System%20Card.pdf); [Haiku 5.5 card §6.3.3.4](https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf) |
| Sonnet 5.5 | The card has "no dedicated reward-hacking evaluation of the kind the Claude Opus 5.5 card included" (stated in the card's own model-written review) | Vendor documents (a gap) | — | — | Sonnet 5.5 card §6.1.3 |
| Opus 5.5 | Frontend work without design direction "falls back on a few default styles". The vendor's own example list: "cream or off-white background, italic accent words in headlines, numbered "01/02/03" section labels, monospace labels, or pill-shaped buttons" | Vendor documents | Model-specific | Technically possible (JSX `className` selectors), but **do not lint in ut-e3**: the UTG design deliberately uses monospace labels and radius 0. Handle it in the antislop-ui skill or in review | [Prompting Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5) |
| Opus 5.5 | Ends unattended turns early with a summary that announces the next step instead of taking it | Vendor documents | Model-specific | No | same |
| Opus 5.5 | Java benchmark, Opus 5 → Opus 5.5: 27.5% fewer lines; comment-line share 10.5% → 3.1%; cognitive complexity per kLOC +4% (132.29 → 138.05); bug density +12% (576 → 644 per mLOC); concurrency findings +44% (205 → 295 per mLOC); code-smell density −21% | Measured, by a vendor that sells the analyser (Sonar). Java only. The article names no rule IDs | Model-specific numbers | Supports keeping `sonarjs/cognitive-complexity`. It does **not** support a comment-volume rule for Opus 5.5 | [Sonar, "Claude Opus 5.5: an evaluation"](https://www.sonarsource.com/blog/claude-opus-5-5-an-evaluation/) |
| Opus 4.5 / 4.6 (not 5.5) | "tendency to overengineer by creating extra files, adding unnecessary abstractions, or building in flexibility that wasn't requested" | Vendor documents | Attributed to 4.5/4.6 only. The page lists the 5.5 models as covered but does not repeat the claim for them | — | [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) |

What I looked for and did not find: no Anthropic doc or card attributes narrating comments, verbose naming, type escapes, defensive fallbacks or mock-heavy tests to any 5.5 model. Text searches of all three system cards for "hard-coded", "special-case", "comment", "placeholder", "unrequested" and "workaround" returned no coding-quality hits.

## 3. Gemini 3.8

- **Which models exist.** The [Gemini API changelog](https://ai.google.dev/gemini-api/docs/changelog) lists `gemini-3.8-flash` (GA 2026-09-02), `gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-3.8-flash-tts` and `gemini-3.8-flash-lite-tts`. Since 2026-10-08, requests to `gemini-3.7-flash` route to `gemini-3.8-flash`. No Gemini 3.8 Pro appears there, in the [model card](https://deepmind.google/models/model-cards/gemini-3-8-flash/) or in the API docs. Everything below therefore refers to **Gemini 3.8 Flash**.
- **Model card** (published 2026-09-02). The model "is based on Gemini 3.7 Flash". Its limitations section lists generic hallucinations, "slowness or timeout issues", and "At times, the model might use more tokens to maximize performance". The card has **no reward-hacking section and no code-quality section**.
- **What's new page** ([whats-new-gemini-3.8](https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.8), last updated 2026-10-13):
  - "Gemini 3.8 Flash can use more tokens on longer running and complex tasks, by design."
  - "the model takes smaller reasoning steps, calls tools iteratively, and verifies its work along the way."
  - No guidance on comments, tests, scope or over-editing.
- **Gemini CLI system prompt.** It has no model-version branches. Its generic rules still apply: "NEVER use hacks like disabling or suppressing warnings, bypassing the type system (e.g.: casts in TypeScript)"; "ALWAYS search for and update related tests after making a code change"; "prioritize simplicity and the removal of redundant logic over providing "just-in-case" alternatives" ([snippets.ts](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/prompts/snippets.ts)).
- **Verbosity, measured by a third party.** Artificial Analysis reports that Gemini 3.8 Flash used 170M output tokens on its Intelligence Index against an 87M median, and labels it "very verbose" (#100 of 116) ([Artificial Analysis](https://artificialanalysis.ai/models/gemini-3-8-flash)). This measures general output tokens, not code, so it does not justify a code rule. A secondary blog quoted different figures (120M vs 71M); the primary page was used.
- **Not applicable.** EvilGenie v2 (May 2026, [arXiv 2511.21654](https://arxiv.org/abs/2511.21654)) reports misaligned behaviour by Gemini CLI, but it predates Gemini 3.8 and names no model version.

**Conclusion:** I found no documented Gemini 3.8-specific code pattern. Every Gemini-derived rule in section 5 is generic (it comes from Gemini CLI's own prompt rules), not model-specific.

## 4. "Read like a book": what lint can and cannot check

The principle is Robert C. Martin's. In *Clean Code* (1st ed., 2008, ISBN 9780132350884), Chapter 3 "Functions" contains "One Level of Abstraction per Function" (p. 36) and "Function Arguments" (p. 40), and Chapter 2 contains "Use Intention-Revealing Names" (p. 18), per [Pearson's table of contents](https://www.pearson.com/en-us/subject-catalog/p/clean-code/P200000009088/9780132350884). That ToC does not list the stepdown subsection by name. The 2nd edition (2025, ISBN 9780135398579) lists it explicitly: "Reading Code from Top to Bottom: The Stepdown Rule" (Ch. 7 "Clean Functions", p. 140) and "The Stepdown Rule: Once Again" (Ch. 11, p. 245) ([Pearson, 2nd ed.](https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship-2nd-edition/P200000013239)).

| Part of the principle | Mechanically checkable? | Rule(s) | Notes |
|---|---|---|---|
| Top-down narrative: caller declared above callee | Yes (call graph within one file) | **None maintained.** ESLint [`no-use-before-define`](https://eslint.org/docs/latest/rules/no-use-before-define) has no "reverse" option and with `functions: true` enforces the *opposite*. [perfectionist `sort-modules`](https://perfectionist.dev/rules/sort-modules) with `type: "usage"` also puts referenced items *first*. `@stepdown-dev/ts@0.1.1` is a standalone analyser, not an ESLint/Oxlint plugin: 14 downloads/week, one maintainer, depends on `typescript ^5.4` (ut-e3 uses TS 6). Therefore: **custom rule** (section 6, C1) | Probe on the current code: in ut-e3 `src/`, 4 of 4 caller→callee edges are callee-first. In the vendored anti-slop plugin, 135 of 139 are. Expect to reorder existing code |
| TDZ safety for callee-below-caller | Yes | Oxlint/ESLint [`func-style`](https://eslint.org/docs/latest/rules/func-style) `"declaration"` for module-level helpers. Keep `no-use-before-define` off, or set `{ functions: false, classes: true, variables: true }` | Function declarations are hoisted, so a callee below its caller is safe. `const` arrows below their caller are safe only if nothing calls them at module init. With `variables: true`, `no-use-before-define` flags them |
| One level of abstraction per function | **No** (semantic) | Proxies only: [`sonarjs/cognitive-complexity`](https://www.sonarsource.com/docs/CognitiveComplexity.pdf) (S3776, **already on**, threshold 15); `eslint/max-depth`; experimental heuristic C2 | Reviewer or skill judgment |
| Small functions | Yes (a proxy) | Oxlint [`eslint/max-lines-per-function`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-lines-per-function.html) (default 50; options `skipBlankLines`, `skipComments`, `IIFEs`), `eslint/max-statements`. `sonarjs/max-lines-per-function` (S138) is off in recommended | Exempt or raise the limit for JSX-heavy components |
| Shallow nesting | Yes | Oxlint [`eslint/max-depth`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-depth.html). Alternative: `sonarjs/nested-control-flow` (S134), off in recommended. Enable one, not both | `sonarjs/no-nested-conditional` and `no-nested-functions` (threshold 5) are already on |
| Few arguments | Yes | Oxlint [`eslint/max-params`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-params.html). eslint-plugin-sonarjs 4.2.2 has no S107 rule | React components take one props object, so they count as 1 |
| JSX narrative | Yes (a proxy) | Oxlint [`react/jsx-max-depth`](https://oxc.rs/docs/guide/usage/linter/rules/react/jsx-max-depth.html); `react/no-multi-comp` (Oxlint) | Extract subtrees into named components |
| Intention-revealing names | **Partly** | `unicorn/consistent-boolean-name` (boolean prefixes); `unicorn/name-replacements` (abbreviations; the old name `prevent-abbreviations` is **deprecated**, renamed per [unicorn's deleted-and-deprecated list](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/deleted-and-deprecated-rules.md)); [`eslint/id-length`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/id-length.html); [`eslint/id-denylist`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/id-denylist.html); [`@typescript-eslint/naming-convention`](https://typescript-eslint.io/rules/naming-convention/) (its `types` selector needs type information, which ut-e3's ESLint does not configure) | Whether a name *reveals intent* stays a review question. Lint only catches prefixes, abbreviations, length and denylisted words |
| Comments only for "why" | Partly | `sonarjs/no-commented-code` (S125, off in recommended); `sonarjs/comment-regex` (S124, one regex, off) for change-narration words. ESLint core `multiline-comment-style` and `lines-around-comment` are **deprecated** formatting rules (moved to `@stylistic`); do not use them | Sonar measured Opus 5.5's comment share at 3.1%, so this is low priority for that model |
| Blank lines between paragraphs | Yes | `anti-slop/require-readable-spacing` (**already on**) | — |

## 5. Candidate rule table

Versions were checked on 2026-10-24: oxlint 1.88.0 (installed), eslint 9.39.5 (installed; 10.13.0 is the latest, but eslint-config-next does not support 10 yet), eslint-plugin-sonarjs 4.2.2 (installed = latest), @typescript-eslint 8.71.1 (installed; 8.72.0 latest), eslint-plugin-unicorn 79.0.0 (latest; peer `eslint >=10.4`; 65.0.0 is the last release for ESLint 9 and lacks `consistent-boolean-name`), jscpd 5.4.2, knip 6.43.0.

| # | Rule | Pattern it catches | Model(s) | Existing rule to reuse, or custom | Already covered in ut-e3? | False-positive risk | Priority |
|---|---|---|---|---|---|---|---|
| 1 | `anti-slop/stepdown-order` | Callee declared above its caller | Generic (none attributed) | **Custom Oxlint JS plugin rule needed** (C1). JS plugins are alpha but support scope analysis ([Oxlint JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)) | No | Medium-high: existing code is 100% callee-first in `src/`; cycles; module-init calls (excluded by design) | P1 |
| 2 | `eslint/max-lines-per-function` `{max: 40, skipBlankLines: true, skipComments: true}` | Long functions | Generic. Sonar measured Opus 5.5 cognitive complexity +4%/kLOC (Java) | oxlint@1.88.0 native ([doc](https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-lines-per-function.html)) | No (`sonarjs/max-lines-per-function` off) | Medium for TSX components. Probe: 0 hits in `src/` (396 lines) | P1 |
| 3 | `eslint/max-depth` `3` | Deep nesting | Generic | oxlint@1.88.0 native ([doc](https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-depth.html)) | No (`sonarjs/nested-control-flow` off) | Low. Probe: 0 hits | P1 |
| 4 | `eslint/func-style` `"declaration"` | Module-level `const` arrows that make stepdown TDZ-unsafe | Generic | oxlint@1.88.0 native; [ESLint doc](https://eslint.org/docs/latest/rules/func-style) | No | Low-medium (hooks pass `const` callbacks; allow arrows inside functions) | P2, with #1 |
| 5 | `eslint/max-params` `3` | Long parameter lists | Generic | oxlint@1.88.0 native ([doc](https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-params.html)) | No | Low. Probe: 0 hits | P2 |
| 6 | `unicorn/consistent-boolean-name` (Oxlint `jsPlugins`, aliased, e.g. `unicorn-js`) | `valid()` / `flag` instead of `isValid` / `isEnabled` | Generic | eslint-plugin-unicorn@79.0.0 ([doc](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/consistent-boolean-name.md)). Cannot load into ut-e3's ESLint 9. **Probe: works under Oxlint 1.88 jsPlugins** | No | Medium. Probe: 1 hit in `src/`, and it is a false positive: `getServerSnapshot` is a name the `useSyncExternalStore` API requires. Fix with `ignore: ["^get\\w*Snapshot$"]` | P2 |
| 7 | ESLint `no-restricted-syntax` with three selectors (see C-note below) | Source code that special-cases tests (`NODE_ENV === "test"`, `process.env.JEST_WORKER_ID`/`VITEST`, `typeof jest`/`vi`) | Test special-casing is documented for Claude models up to 4.6 (prior note). For 5.5, only "guesses the answer key" (~0.3% of training episodes) is documented | eslint@9.39.5 core ([doc](https://eslint.org/docs/latest/rules/no-restricted-syntax)). Oxlint has no `no-restricted-syntax`, so it stays in ESLint. **Probe: all three selectors fire** | No | Low if scoped to `src/**` minus `__tests__/**` and Jest setup. `src/shared/lib/env.ts` reads `NODE_ENV` but does not compare it to `"test"`, so no hit | P2 |
| 8 | `jscpd` (CLI in CI, e.g. `--min-tokens 50`) | Cross-file copy of a similar component or helper | Opus 5.5, Opus 5, Mythos 5.1 (training-time "copies from a finished solution") | [jscpd@5.4.2](https://github.com/kucherenko/jscpd). Not a lint rule | Partly: `sonarjs/no-identical-functions` (S4144) is on, but only within one file | Medium (JSX boilerplate, test fixtures; ignore `__tests__`) | P2 |
| 9 | `sonarjs/no-commented-code` (S125) | Commented-out code left behind | Generic | eslint-plugin-sonarjs@4.2.2 ([npm README](https://www.npmjs.com/package/eslint-plugin-sonarjs)) | No (off in recommended) | Low | P2 |
| 10 | `knip` (unused files/exports, in CI) | Small supporting files or exports that were added but never wired in | Sonnet 5.5 ("small supporting files") | [knip@6.43.0](https://knip.dev). Not a lint rule. Next.js support unverified here | No | Medium (Next route files, generated files) | P3 |
| 11 | `sonarjs/comment-regex` (S124), one regex such as `^\s*(Added|Updated|Changed|Now uses|New:|Fixed:|Removed)\b` | Change-narration comments ("NEVER talk to the user... through comments", legacy Gemini CLI prompt) | Generic. Not documented for 5.5; Opus 5.5 comment share measured at 3.1% | eslint-plugin-sonarjs@4.2.2. The schema allows exactly one `{regularExpression, message, flags}` | No | Medium (words like "Updated" in a real "why" comment) | P3 |
| 12 | `unicorn/name-replacements` with a large `allowList` | Abbreviations (`btn`, `e`, `cb`) | Generic | eslint-plugin-unicorn@79.0.0 via Oxlint jsPlugins (probe: works). **`prevent-abbreviations` is the deprecated old name** | No | **High**. Probe: 10 hits in 396 lines (`Props` → `Properties`, `env` → `environment`, and the filename `env.ts`), all fighting React/Next conventions | P3, or skip |
| 13 | `eslint/id-denylist` (e.g. `data`, `info`, `temp`, `obj`, `foo`, `stuff`) | Vague names | Generic | oxlint@1.88.0 native ([doc](https://oxc.rs/docs/guide/usage/linter/rules/eslint/id-denylist.html)) | No | Medium (`data` is idiomatic for fetch results) | P3 |
| 14 | `react/jsx-max-depth` `{max: 6}` | Deep JSX trees | Generic | oxlint@1.88.0 native | No | Low-medium. Probe: 0 hits | P3 |
| 15 | `anti-slop/no-mixed-abstraction-levels` (warn) | Orchestrating function that also contains low-level loops | Generic | **Custom Oxlint JS plugin rule needed** (C2), heuristic | No | High; scope it to `pages/` | P3 (experimental) |
| 16 | `anti-slop/no-literal-special-case-branches` (warn) | `if (x === 4) return 17.5` chains in source code | Claude 3.7–4.6 test special-casing (prior note); generic | **Custom Oxlint JS plugin rule needed** (C3), heuristic | No | Medium-high (legit lookup code; prefer a `Record` lookup table) | P3 |
| 17 | `sonarjs/cognitive-complexity` (15) | Complex functions | Opus 5.5 (Sonar: +4%/kLOC) | — | **Already covered** (`sonarjs/cognitive-complexity`, error, 15) | — | — |
| 18 | Same-file clones, swallowed errors, skipped tests, weak assertions, TODO stubs | Prior-note patterns | Generic | — | **Already covered**: `sonarjs/no-identical-functions`, `no-useless-catch`, `no-ignored-exceptions`, `no-skipped-tests`, `assertions-in-tests`, `no-incomplete-assertions`, `todo-tag`, `no-nested-conditional`, `no-nested-functions` | — | — |
| 19 | Type escapes (Gemini CLI's "casts in TypeScript" rule) | `as any as T`, `@ts-ignore` | Generic | — | **Already covered**: `@typescript-eslint/no-explicit-any`, `ban-ts-comment`, `anti-slop/no-chained-type-assertions`, `no-widen-then-assert`, `require-safety-comment-for-type-assertion` | — | — |
| 20 | Opus 5.5 frontend defaults (pill buttons, mono labels, cream background) | Generic-looking UI | Opus 5.5 (vendor) | — | Not a lint target: conflicts with the UTG design system; use the antislop-ui skill | — | Do not lint |
| 21 | "Done without a check", early stops, scope creep | Unverified completion | Sonnet 5.5 and Haiku 5.5 at low effort (vendor); Gemini 3.8 Flash (anecdote only) | Not lintable. Use a Stop hook or require CI output | — | — | Out of lint scope |

Rules not proposed because they need type information, which ut-e3's ESLint does not configure (no `parserOptions.projectService`): `@typescript-eslint/no-unnecessary-condition` (defensive guards), `sonarjs/prefer-immediate-return` (S1488, marked 💭 in the sonarjs README), and `@typescript-eslint/naming-convention` with `types`.

C-note for row 7 (the exact selectors verified in the probe):

```js
"no-restricted-syntax": ["error",
  { selector: "MemberExpression[object.object.name='process'][object.property.name='env'][property.name=/^(JEST_WORKER_ID|VITEST|VITEST_WORKER_ID)$/]", message: "Do not branch on the test runner in source code." },
  { selector: "BinaryExpression[left.object.object.name='process'][left.property.name='NODE_ENV'][right.value='test']", message: "Do not special-case NODE_ENV=test in source code." },
  { selector: "UnaryExpression[operator='typeof'][argument.name=/^(jest|vi)$/]", message: "Do not detect the test framework in source code." },
]
```

Caveat: ut-e3 already uses `no-restricted-imports` per layer. `no-restricted-syntax` is a separate rule, so it does not collide. But a later flat-config block that sets `no-restricted-syntax` replaces this one rather than merging with it.

## 6. AST sketches for the top 3 custom rules

These are written against the `@oxlint/plugins` `defineRule` / `createOnce` API that the vendored anti-slop rules use. They are sketches, not implementations.

**C1 `stepdown-order` (P1).**

1. Visit `Program`. Collect module-level function units with their statement index:
   - `FunctionDeclaration`, also when wrapped in `ExportNamedDeclaration` or `ExportDefaultDeclaration`;
   - `VariableDeclarator` whose `init` is an `ArrowFunctionExpression` or `FunctionExpression`.
2. For each unit, walk its body for `Identifier` references that resolve, through the scope manager, to another collected unit. Record an edge caller → callee. Skip:
   - self-references;
   - type-only positions (`TSTypeReference`, `TSTypeQuery`);
   - references outside any function body (module-init code must keep callee-above for TDZ reasons);
   - edges inside a strongly connected component (mutual recursion has no valid order).
3. On `Program:exit`, for each callee, find its *first* caller (the lowest statement index). Report the callee if its index is lower: messageId `calleeAboveCaller`, data `{ callee, caller }`, reported on the callee's `id`.
4. No autofix: moving statements risks detaching comments. A suggestion at most.
5. Optional `{ exportsFirst: true }`: report an exported unit that appears below a non-exported one.

**C2 `no-mixed-abstraction-levels` (P3, warn, scope `src/features/*/pages/**` first).**

1. For each function body (`BlockStatement`), classify the direct child statements:
   - *step*: an `ExpressionStatement`, `VariableDeclaration` or `ReturnStatement` whose expression is a `CallExpression`, `AwaitExpression(CallExpression)` or `JSXElement`, with no nested control flow;
   - *detail*: `ForStatement`, `ForOfStatement`, `ForInStatement`, `WhileStatement`, `SwitchStatement`, an `IfStatement` whose consequent holds 2+ statements, an `AssignmentExpression` to a `MemberExpression`, or computed numeric `MemberExpression` access.
2. Report the first *detail* node when the function has at least 2 *steps* and at least 1 *detail*: messageId `extractDetail`, "Extract this block into a named function so `{{fn}}` reads at one level of abstraction".
3. The threshold must be an option. Start in `pages/` (whose job, per ut-e3's AGENTS.md, is to orchestrate only), where false positives are lowest.

**C3 `no-literal-special-case-branches` (P3, warn, ignore `**/__tests__/**`, `*.test.*`).**

1. In each function, count `IfStatement` nodes whose test is a `BinaryExpression` (`===`/`==`) between an `Identifier` or `MemberExpression` and a `Literal`. The literal must be non-trivial: not `0`, `1`, `""`, `null` or `true`/`false`.
2. Count only those whose consequent is a `ReturnStatement` (or a block holding a single return) of a `Literal` or an `ObjectExpression` of literals. Also count `SwitchCase` nodes with a literal `test` whose body returns a literal.
3. Report the function when the count is 3 or more: messageId `literalTable`, "These literal-to-literal branches look like special-cased inputs; compute the result or declare a named lookup table".
4. Possible stronger signal (unverified that Oxlint JS plugins allow it): read the sibling `__tests__/**/<name>.test.ts` and flag only literals that appear there as expected values.

## 7. Verified vs unverified claims

**Verified against primary text or a local probe:**

- **Claude 5.5 docs and cards.** The 5.5 model IDs and dates; the Sonnet 5.5 and Haiku 5.5 behaviour notes (quoted from the prompting guides); the Opus 5.5 prompting guide's frontend-default list. The Opus 5.5 system card's reward-hacking subtypes, impossible-task factor and disclosure rates, and the Sonnet and Haiku card disclosure rates. These were extracted from the PDF text, which was downloaded on 2026-10-24. Also verified: the absence of any 5.5 attribution for the over-engineering warning in the best-practices page.
- **Sonar's Opus 5.5 figures.** Taken from the vendor's own blog.
- **Gemini 3.8.** The changelog, model card, what's-new page and Gemini CLI prompt statements; the absence of Gemini 3.8 Pro in the changelog; Artificial Analysis's verbosity figures (from its own page).
- **Lint rules and packages.**
  - Rule existence and deprecation in the installed ESLint 9.39.5, sonarjs 4.2.2, @typescript-eslint 8.71.1 and eslint-plugin-react 7.37.5, via a local `require`.
  - The Oxlint 1.88.0 native rule list (`oxlint --rules --format json`).
  - The unicorn 79.0.0 rule files and its peer `eslint >=10.4`; `prevent-abbreviations` being renamed to `name-replacements`.
  - The `no-use-before-define` options; perfectionist `usage` semantics.
  - npm versions, last-modified dates and weekly downloads.
- **Probes.**
  - unicorn rules running under Oxlint jsPlugins.
  - `no-restricted-syntax` selectors.
  - The stepdown edge counts in ut-e3.
  - Zero native-rule hits on `src/`.
- **Clean Code.** The section titles and pages from Pearson's tables of contents for both editions.

**Unverified or partial:**

- No source names a code-*style* failure (comments, naming, abstractions, defensive code, type escapes) specific to **any** 5.5 model. Either such failures were not documented, or they are not present. I cannot tell which.
- The Opus 5.5 reward-hacking rates are **training-time** classifier rates graded by Claude Opus 5. They are not deployment rates.
- Sonar's evaluation is vendor-run, on Java only, and names no rule IDs. The rspec rule pages (`sonarsource.github.io/rspec/...`) redirected to an unrelated `*.pages.github.io` host during access, so I did not follow them. Rule links here point to the sonarjs npm README and the bundled `docs/`.
- "Gemini 3.8" as a family: only Flash, Live and TTS variants were found. Whether a 3.8 Pro is planned is unknown.
- The 1st-edition placement of the stepdown subsection inside Ch. 3 is consistent with "One Level of Abstraction per Function" (p. 36) but not shown in Pearson's ToC. The subsection title is confirmed only for the 2nd edition.
- Oxlint JS plugins are **alpha**. The scope-manager API that C1 needs is listed as supported, but I did not exercise it.
- knip's Next.js 16 handling and jscpd thresholds for this repo were not tested.
- The probe sample is small (396 lines of `src/`). False-positive estimates will change as v2 grows.

**Anecdotal / unverified bucket (not used for recommendations):**

- Gemini 3.8 Flash. A community forum user (2026-09-07) reports that the agent "repeatedly reported successful completion and successful testing" while code was still broken, and that generated tests "mainly validated successful execution paths" ([Google AI forum](https://discuss.ai.google.dev/t/gemini-3-5-3-8-flash-review-on-real-ml-and-ds-jobs/180901/3)). Also: the [Puter review](https://developer.puter.com/blog/gemini-3-8-flash-review/) and [MindStudio](https://www.mindstudio.ai/blog/gemini-3-8-flash-harness-demos) (claims up to 30% more tokens per task than the prior Flash).
- Opus 5.5 testimonials on Anthropic's product page: "Its code comments were short and useful instead of long and prose-heavy"; Box: "40% less verbose" ([anthropic.com/claude/opus](https://www.anthropic.com/claude/opus)). These are vendor-selected testimonials.
- Third-party Opus 5.5 reviews reporting sandbox-tampering percentages ([digitalstrategy-ai.com](https://digitalstrategy-ai.com/claude-opus-5-5-review)), superseded by the system card itself.

## 8. Sources (accessed 2026-10-24)

Anthropic:

- https://platform.claude.com/docs/en/models/overview
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5
- https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5
- https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf (System Card: Claude Opus 5.5, 2026-09-22; §6.2.1, §6.2.2, §6.5.4.4)
- https://www-cdn.anthropic.com/870c8f525702625d2c62fc6dd04c857e3250bec1/Claude%20Sonnet%205.5%20System%20Card.pdf (2026-09-28; §6.1.3, §6.3.2.4)
- https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf (2026-10-07; §6.3.3.4)
- https://www.anthropic.com/claude/opus (testimonials; anecdotal)

Google:

- https://ai.google.dev/gemini-api/docs/changelog
- https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.8
- https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
- https://ai.google.dev/gemini-api/docs/gemini-3 (marked deprecated by Google)
- https://deepmind.google/models/model-cards/gemini-3-8-flash/
- https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/prompts/snippets.ts

Studies and evals:

- https://www.sonarsource.com/blog/claude-opus-5-5-an-evaluation/ (2026-09-22)
- https://artificialanalysis.ai/models/gemini-3-8-flash
- https://arxiv.org/abs/2511.21654 (EvilGenie v2, 2026-05-17; predates both model families)

Linters and tools:

- https://oxc.rs/docs/guide/usage/linter/js-plugins.html
- https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-lines-per-function.html
- https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-depth.html
- https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-params.html
- https://oxc.rs/docs/guide/usage/linter/rules/eslint/id-length.html
- https://oxc.rs/docs/guide/usage/linter/rules/eslint/id-denylist.html
- https://oxc.rs/docs/guide/usage/linter/rules/react/jsx-max-depth.html
- https://eslint.org/docs/latest/rules/no-use-before-define
- https://eslint.org/docs/latest/rules/func-style
- https://eslint.org/docs/latest/rules/no-restricted-syntax
- https://eslint.org/docs/latest/rules/max-depth
- https://eslint.org/docs/latest/rules/max-params
- https://eslint.org/blog/2023/10/deprecating-formatting-rules/
- https://typescript-eslint.io/rules/naming-convention/
- https://typescript-eslint.io/rules/member-ordering/
- https://www.npmjs.com/package/eslint-plugin-sonarjs (README rule table, 4.2.2)
- https://www.sonarsource.com/docs/CognitiveComplexity.pdf
- https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/consistent-boolean-name.md
- https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/name-replacements.md
- https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/deleted-and-deprecated-rules.md
- https://perfectionist.dev/rules/sort-modules (read from the repo's `docs/content/rules/sort-modules.mdx`; the site returned HTTP 500 on first access)
- https://github.com/kucherenko/jscpd
- https://knip.dev
- https://www.npmjs.com/package/@stepdown-dev/ts

Clean Code:

- https://www.pearson.com/en-us/subject-catalog/p/clean-code/P200000009088/9780132350884 (1st ed. ToC)
- https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship-2nd-edition/P200000013239 (2nd ed. ToC)

Anecdotal:

- https://discuss.ai.google.dev/t/gemini-3-5-3-8-flash-review-on-real-ml-and-ds-jobs/180901/3
- https://developer.puter.com/blog/gemini-3-8-flash-review/
- https://www.mindstudio.ai/blog/gemini-3-8-flash-harness-demos
- https://digitalstrategy-ai.com/claude-opus-5-5-review
