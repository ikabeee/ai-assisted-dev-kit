# gentle-ai test lock: prior art and upstream proposal

Research date: 2026-10-25. Scope: whether Gentleman-Programming/gentle-ai (and gentle-shell, which ships gentle-pi) has a test-first policy, whether it is enforced, and whether anyone has proposed locking tests read-only during implementation. Sources: source code at gentle-ai `main` [`f61484d`](https://github.com/Gentleman-Programming/gentle-ai/tree/f61484d781e75de8f35a32ff31dfefba01a67c66) (2026-10-24; latest release v4.2.0, 2026-10-15, which is also the locally installed version) and gentle-shell `main` [`4863250`](https://github.com/Gentleman-Programming/gentle-shell/tree/4863250a8b8bfe7bac35879dcd4e44ddfbb92d68) (2026-10-24), issues, PRs and discussions read with `gh` (read-only), and the Claude Code docs. Anything not traced to its owner is marked **unverified**.

## 1. Summary

- **The test-first policy exists, and it is prompt text only.** The sentence "Apply one default test-first policy to ODD behavior changes: ... observe RED before implementation, implement GREEN, then refactor while tests stay green" is emitted by `RenderRouting` at [`internal/components/agentguidance/routing.go:168`](https://github.com/Gentleman-Programming/gentle-ai/blob/f61484d781e75de8f35a32ff31dfefba01a67c66/internal/components/agentguidance/routing.go#L168). It is written into the `agent-routing` section of `~/.claude/CLAUDE.md`. No hook, gate or CLI command checks RED evidence or test immutability. The old Strict TDD toggle was retired in v4.0.0 (#4977, PR #4978). The only TDD-related code left rejects the retired `--strict-tdd` flag.
- **gentle-ai installs no `PreToolUse` hook for Claude Code.** It installs `Stop`/`SessionStart` (review stop-hook), `SubagentStop`/`Stop` (telemetry) and `UserPromptSubmit` (skill registry). The only `PreToolUse` hook it ever shipped was the SDD preflight on `Agent`. That hook was retired in v4.0.0 (#5157).
- **Nobody has proposed a read-only test lock.** I ran about 100 searches over gentle-ai and gentle-shell issues and PRs (open and closed) and the whole org, and read all 35 gentle-ai discussions. Nothing proposes a test lock, a lock file, read-only tests during implementation, or a hook that blocks test edits. Nothing mentions reward hacking or ImpossibleBench.
- **The closest proposals are advisory, or they were closed with SDD.** #5092 (open) adds guidance: "Do not weaken expectations merely to obtain GREEN". It explicitly rules out any new gate. #3727 required "Freeze tests before the fault challenge" and said "Material test changes after RED invalidate or renew the corresponding evidence". It was approved, then closed as not planned when SDD was removed, and its PR #3760 was closed unmerged.
- **A deterministic test-file gate already exists in this org, on Pi only.** gentle-shell#2290 added [`lib/delivered-test-lint.ts`](https://github.com/Gentleman-Programming/gentle-shell/blob/4863250a8b8bfe7bac35879dcd4e44ddfbb92d68/lib/delivered-test-lint.ts). It is a `tool_call` guard on writes to test paths that blocks test content reading git history or putting `TMPDIR` inside the repo. Its rationale: "The prompt rule did not hold, so the runtime blocks the write." It inspects content and has no lock lifecycle.
- **The org also has a counter-precedent.** A runtime write gate (gentle-shell#1200) was removed in gentle-shell#1354 because it had "no proportional remedy" (gentle-shell#1347). A test lock needs a cheap, parent-owned way out for a wrong test.
- **The gap:** on no runtime does anything stop the implementer from editing reviewed RED tests to reach GREEN. ImpossibleBench recommends "restricting them to read-only access during implementation". Read-only tests "restore legitimate performance while preventing test modification attempts", but do not stop special-casing. So the lock complements the oracle guidance in #5092 and does not replace it.
- **Claude Code limits to design around:** an `Edit|Write` matcher does not see Bash writes. `Edit(...)` permission deny rules cover recognized Bash file commands and redirections, but not arbitrary subprocesses. Hook failures let the call through unless `onFailure: "block"` is set (v2.1.295+).

## 2. Findings

### 2.1 Q1: where the test-first policy lives, and whether it is enforced

| Location (gentle-ai @ `f61484d` unless noted) | Content | Kind |
|---|---|---|
| `internal/components/agentguidance/routing.go:168` (`RenderRouting`, line 47) | The full policy: RED before implementation, "Write one RED test per requested rule", a differential check against the base, and "never invent RED/GREEN evidence or a runner" | Prompt text |
| `internal/components/agentguidance/routing.go:88` | Small path: "observe RED inline before the fix" | Prompt text |
| `internal/components/agentguidance/inject.go:21`, `:110`; `internal/agents/claude/adapter.go:160-161` | Section id `agent-routing`, rendered into `~/.claude/CLAUDE.md` | Delivery |
| Local install (v4.2.0), `~/.claude/CLAUDE.md:582` | The same sentence, inside `<!-- gentle-ai:agent-routing -->` | Confirms delivery |
| `internal/assets/claude/orchestrator.md:77` | Tells the parent to pass "the applicable test-first policy and runner" to workers | Prompt text |
| `internal/assets/skills/_shared/odd-orchestrator-sections.md:21` | Verify handoff: "The writer commits the probes as regression tests" (the writer edits tests after verification, by design) | Prompt text |
| `README.md:177-179`, `docs/intended-usage.md:16`, `docs/usage.md:432` | User docs: "`--strict-tdd` was retired in v4.0.0: ODD uses applicable test-first development by default, and sync rejects the flag." | Docs |
| `internal/cli/sync.go:192`, `:232`, `:249` | Rejects `--strict-tdd` with an error | The only TDD code path, and it is not a gate |
| `internal/components/agentguidance/strict_tdd.go:16` | Legacy `"Strict TDD Mode: enabled"` section manager | Cleanup of the old marker |
| gentle-shell `extensions/gentle-ai.ts:1472`, `assets/support/strict-tdd-verify.md:1-7` | Same policy for Pi. The verify asset says its legacy filename "does not represent a Strict TDD switch" | Prompt text |

Enforcement surface. [`internal/components/agenthooks/claude.go:46-55`](https://github.com/Gentleman-Programming/gentle-ai/blob/f61484d781e75de8f35a32ff31dfefba01a67c66/internal/components/agenthooks/claude.go#L46-L55) lists the Claude Code hooks gentle-ai installs: `Stop` and `SessionStart` run `gentle-ai review stop-hook`, and `SubagentStop` and `Stop` run telemetry. `skill_registry.go:83-86` adds a `UserPromptSubmit` skill-registry refresh. There is no `PreToolUse`. [`internal/components/legacyassets/claude_hook.go:14-17`](https://github.com/Gentleman-Programming/gentle-ai/blob/f61484d781e75de8f35a32ff31dfefba01a67c66/internal/components/legacyassets/claude_hook.go#L14-L17) only removes the retired v2.8.0–v3.7.0 `PreToolUse(Agent)` SDD preflight hook (#5157, PR #5299).

**Verdict: advisory.** History:

- **#4977, PR #4978** (both closed 2026-09-25). The installer toggle was retired because "Require TDD unconditionally: this encourages fabricated RED".
- **#262 and #4133 (SDD era).** Earlier attempts to bind RED/GREEN evidence to task completion. A maintainer confirmed in #4133 that "nothing in the status package reads strict-TDD RED/GREEN evidence".
- **#986, #1263.** Rubric work and mutation testing.
- **Closure.** #262, #4133, #986 and #1263 were all closed as not planned on 2026-09-25 when SDD was removed. The closing comment asks for "fresh evidence ... showing that the same problem affects ODD".

### 2.2 Q2: has anyone proposed locking tests?

**Method.**

- **Issues and PRs.** `gh search issues --include-prs`, which returns open and closed results. Per query: 30 results in the first gentle-ai batch, 15 in the second, 12 in the third, 15 in gentle-shell and 10 org-wide. Phrasings:
  - Locks and read-only: test lock, `tests.lock`, read-only tests, frozen/immutable/protect tests, test guard, protected paths, edit surface, block edit.
  - Tampering and cheating: tamper, reward hacking, ImpossibleBench, cheat, special-casing, overfitting, weaken expectations.
  - Editing tests: modify/edit/delete/skip/weaken tests, do not edit tests, test file edits, assertion changes.
  - TDD: RED GREEN, red-green, test-first, TDD, strict tdd, test oracle, mutation testing, behavioral falsification.
  - Hooks and enforcement: PreToolUse, hook block, hooks enforcement, enforced only by prose, mechanizable.
- **Repositories.** gentle-ai (about 75 queries), gentle-shell (20) and the whole org (8).
- **Discussions.** The GitHub discussion search index returned only 6 of gentle-ai's 35 discussions, so I read all 35 (bodies and comments) through a read-only GraphQL query and grepped them locally. gentle-shell has discussions disabled.

**Result: no direct match.** The "tamper" hits are artifact-integrity tests (for example `TestVerifyArchiveRejectsATamperedRoutingFile`), not test tampering by agents. The source trees contain no "do not edit tests" rule.

Nearest prior art:

| Item | State | What it does | Relation to a test lock |
|---|---|---|---|
| [#5092](https://github.com/Gentleman-Programming/gentle-ai/issues/5092) feat(odd): make verification intent and test-oracle provenance explicit | Open (2026-09-29) | Guidance: "Review assertion changes, removed scenarios and new skips against the intended contract. Do not weaken expectations merely to obtain GREEN." Acceptance: "No new toggle, mandatory agent, persistent artifact or review-authority mechanism is introduced." | Same concern, advisory by design. The lock is the mechanical part #5092 leaves out |
| [#3727](https://github.com/Gentleman-Programming/gentle-ai/issues/3727) feat(sdd): verify agent-written tests through behavioral falsification | Closed, not planned (2026-09-25) | "Freeze tests before the fault challenge. After GREEN, freeze the relevant test identity." "If the test oracle or setup changes materially during GREEN, require a new RED for the changed test instead of allowing the expectation to move with the implementation." Approved by a maintainer on 2026-08-26. PR [#3760](https://github.com/Gentleman-Programming/gentle-ai/pull/3760) was closed unmerged on 2026-10-02 because it "changes only retired sdd-apply/sdd-verify assets" | Approved precedent for test immutability, but SDD-only, freezing after GREEN, and detection rather than prevention |
| [gentle-shell#2290](https://github.com/Gentleman-Programming/gentle-shell/pull/2290) (closes gentle-shell#2289) "enforce orchestration rules in the runtime (harness R1)" | Merged 2026-10-15 | `lib/delivered-test-lint.ts`: a `tool_call` guard on `write`/`edit` to test paths (`tests?/`, `__tests__/`, `spec/`, `*.test|spec.[cm]?[jt]sx?`, `_test.go`, `test_*.py`). It blocks content that reads git history at a literal commit or sets `TMPDIR` inside the cwd. Wired at `extensions/gentle-ai.ts:10605`. It notes: "Content written through bash is not seen here." | The deterministic test-path hook point and glob list a lock could reuse on Pi |
| gentle-shell `odd/tasks/r1-review-advisories.md:77-82` | Maintainer note | Rejected an escape hatch for that guard: "an escape hatch (a marker in the content) is one the model can add to bypass the block" | Design rule: the unlock path must be parent- or human-owned, never a marker the model can write |
| gentle-shell#1200 → [gentle-shell#1354](https://github.com/Gentleman-Programming/gentle-shell/pull/1354) via [gentle-shell#1347](https://github.com/Gentleman-Programming/gentle-shell/issues/1347) | Added 2026-09-18, removed 2026-09-22 | A runtime refusal of a second direct file edit, removed because it had "no proportional remedy"; the report measured "roughly 30K tokens of avoidable subagent handoff" in one session | Counter-precedent: a lock needs a cheap, explicit remedy |
| [#4915](https://github.com/Gentleman-Programming/gentle-ai/issues/4915) ODD parity matrix (NODD) | Open | A Pi extension that implements ODD as `tool_call` gates. "44 contain something mechanizable" out of 56 clauses. Its gates (`authorize`, `classify`, `delegate`, `evidence`, `policy` at nodd `0eb8a41`) include no test lock. `policy.ts`: "a decision, a flag and an escape hatch" (`/nodd-allow`) | Shows ODD clauses can be gated. No test lock |
| [#3411](https://github.com/Gentleman-Programming/gentle-ai/issues/3411) delegation contract enforced only by prose | Open | A long thread on prose vs gates. A comment from 2026-09-30 tabulates the `PreToolUse` and `tool_call` deny capabilities of Claude Code, Codex and Pi, and warns: "This is a procedural control, not a security boundary" | Cross-runtime feasibility and failure modes |
| [#5587](https://github.com/Gentleman-Programming/gentle-ai/issues/5587) turn-close pending-work guard | Open | A guard built from existing harness hooks. Fail-open, bounded | Hook-based ODD enforcement pattern |
| [#212](https://github.com/Gentleman-Programming/gentle-ai/issues/212) project-level hook system (`PreToolUse` exit 2) | Closed 2026-04-06 | Closed as overlapping with #56 (per-project config) | Earlier generic hook proposal, not about tests |

### 2.3 Q3: related issues to cite

| Issue | State | Why cite it |
|---|---|---|
| #5092 | Open | Closest: oracle and assertion-change guidance. The lock is its deterministic complement, not a duplicate |
| #3727 (+ PR #3760) | Closed, not planned | Approved test-freeze design. Its closure invites fresh ODD evidence |
| #4977 / PR #4978 | Closed / merged | Made applicable test-first the ODD default |
| #5483 | Open | Task-scoped TDD rubric parity for non-Pi hosts (Pi counterpart: gentle-shell#2153). The lock would follow the same "applicable" decision |
| #3411, #4915, #5587 | Open | Prose vs runtime enforcement in ODD, including hook capability per runtime |
| #5715 | Open | Objectives index (same author). Format reference |
| #5156 | Open | Task close as a session boundary. Unlocking at close fits the same boundary |
| #262, #4133 | Closed | SDD-era evidence that self-reported TDD was not enforced |
| gentle-shell#2290 / #2289, gentle-shell#1354 / #1347 | Merged / closed | The existing test-path gate on Pi, and the retired disproportionate gate |
| #2026, #4920 | Open | Benchmarks; #5092 coordinates its evaluation with them |

## 3. Draft issue (DRAFT, not yet posted)

Posting is the user's decision. Before posting:

1. Push `feat/test-lock` in ikabeee/ai-assisted-dev-kit and replace the reference-implementation placeholder with the link.
2. Re-check that no duplicate appeared since 2026-10-25.

The section headings below are the labels of the repo's `feature_request.yml` form. "Affected Area" is a dropdown; pick "Other".

**Title:** `feat(odd): keep reviewed tests read-only during implementation with a deterministic lock`

**Body:**

```markdown
### Pre-flight Checklist

- [x] I have searched [existing issues](https://github.com/Gentleman-Programming/gentle-ai/issues) and this is not a duplicate
- [x] I understand that PRs will be rejected if the linked issue does not have `status:approved`

Related, not duplicates: #5092 (oracle provenance and assertion-change guidance, advisory by design), #3727 (approved test-freeze design for SDD, closed with SDD's removal), #4977 (applicable test-first as the ODD default), #5483 (task-scoped TDD rubric), #3411 and #4915 (prose vs runtime enforcement), and Gentleman-Programming/gentle-shell#2290 (existing runtime guard on test-file writes in Pi).

### 🔍 Affected Area

Other (ODD workflow in the orchestrator instructions, plus managed agent hooks)

### 💡 Problem Statement

ODD's test-first policy asks the agent to "observe RED before implementation, implement GREEN, then refactor while tests stay green" (`internal/components/agentguidance/routing.go:168`). Nothing stops the agent that implements GREEN from editing the RED tests instead of the code:

1. The policy is prompt text in the `agent-routing` block of `~/.claude/CLAUDE.md`. gentle-ai installs no `PreToolUse` hook for Claude Code (`internal/components/agenthooks/claude.go:46-55`), and no CLI check compares test files before and after implementation.
2. Editing the test is the main cheating strategy measured for Claude models. ImpossibleBench (arXiv 2510.20270, §4.2): "Claude models and Qwen3-Coder, however, cheat primarily (>79%) through modifying test cases." Its §5.2 recommends "either hiding test files entirely or restricting them to read-only access during implementation, when feasible", and finds that read-only access "restores legitimate performance while preventing test modification attempts".
3. Prompt rules against this already exist and are advisory. Anthropic's own prompt reads: "It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality." The Claude Code best practices say: "Unlike CLAUDE.md instructions which are advisory, hooks are deterministic and guarantee the action happens."
4. This org already chose the runtime over the prompt for a related test rule. gentle-shell's `lib/delivered-test-lint.ts` blocks bad test writes in Pi because "The prompt rule did not hold, so the runtime blocks the write."

#5092 covers the oracle side (where expected values come from, and reviewing assertion changes) and deliberately adds no gate. #3727's approved design required that "Material test changes after RED invalidate or renew the corresponding evidence", but it was SDD-only and closed with SDD. In ODD on v4.2.0 (`main` at `f61484d`), the gap is structural: nothing keeps reviewed tests fixed between review and GREEN. I am not claiming a measured ODD incident.

### 📦 Proposed Solution

An optional, deterministic **test lock** for tracked ODD work. The small path is unchanged.

1. **RED.** The writer writes tests from the feature document's `S#` and observes RED (unchanged).
2. **Review.** The parent reviews those tests against the specs (the oracle check #5092 describes).
3. **Lock.** On approval, the parent creates a lock file that records the feature, the task and the base commit, and logs it in the feature document's `## Log`.
4. **Implement.** While the lock exists, a pre-tool-call hook denies changes to existing test files with a fixed message: make the existing tests pass without changing them; if a test looks wrong, stop and report the test and the reason to the parent. On Claude Code this is `PreToolUse` on `Edit|Write`. Exit 2 "Blocks the tool call", and the docs say settings hooks "also run inside subagents", so delegated writers are covered too. Creating a new test file stays allowed, so ODD's regressions ("pin with a test") and the verifier's step ("The writer commits the probes as regression tests") keep working under the lock.
5. **Wrong test.** This is the proportional remedy that gentle-shell#1347 found missing. The parent decides (and asks the user when a spec is in question), unlocks, fixes the test, reviews it, relocks, and logs the change. The unlock is owned by the parent or the user, never by a marker the model can write (the reasoning in gentle-shell `odd/tasks/r1-review-advisories.md`).
6. **GREEN and close.** The parent checks that the test files are unchanged since the base commit recorded in the lock (for example `git diff --quiet <base> -- <test paths>`), then removes the lock. This check also catches writes the hook cannot see.

Why this stays within ODD's proportionality:
- #5092 sets the bar: "No new toggle, mandatory agent, persistent artifact or review-authority mechanism is introduced." The lock adds no agent and no review authority. Its file is git-ignored runtime state, deleted at close, and never part of a review candidate. It is a toggle, so it is opt-in and only for tracked or delegated work: "Small work stays inline and creates no durable task artifacts" stays true.
- gentle-shell#1354 removed a refusal because it had "no proportional remedy". Here the remedy is one step: the agent reports the test, and the parent or the user unlocks.
- The same writer writes the tests and the code, as ODD requires ("never split one behavior into test, docs, and code writers").

Delivery per runtime:
- **Claude Code:** a managed `PreToolUse` hook next to the existing review and telemetry hooks.
- **Pi:** the existing `tool_call` guard in gentle-shell (`isTestFilePath` in `lib/delivered-test-lint.ts`).
- **Codex:** `PreToolUse` deny, per the capability matrix in #3411.

Known limits, to state in the docs:
- An `Edit|Write` matcher does not see Bash writes. Claude Code's `Edit(...)` deny rules do cover "file commands Claude Code recognizes in Bash, such as `cat`, `head`, `tail`, `sed`, and `tee`" and redirections, but "not arbitrary subprocesses". The close-time diff in step 6 is the backstop.
- Command hooks fail open unless `onFailure: "block"` is set (Claude Code v2.1.295+).
- This is a procedural control, not a security boundary.
- Read-only tests do not stop special-casing or operator overloading (ImpossibleBench §5.2), so this complements #5092 and does not replace it.

### 🔄 Alternatives Considered

- **Prompt rule only** ("do not edit tests"): this is today's state. It already exists in vendor prompts and is advisory.
- **Hide tests from the implementer:** ImpossibleBench reports cheating success "to near zero", but it "also degrades performance on the original benchmark".
- **Static permission deny** (`Edit(**/*.test.*)` in settings): it would also block the RED phase, has no lifecycle, and is Claude-only.
- **Detection only** (diff at close or in the RDD review): it catches tampering after the work is done and costs a correction round. Kept as the backstop, not as the primary control.
- **A separate agent writes all tests:** #3727 rejected this as doubling work without guaranteeing a better oracle.

### 📎 Additional Context

Reference implementation (Claude Code only): `hooks/lock-tests.ts` in my AI-assisted development kit ([hooks/lock-tests.ts](https://github.com/ikabeee/ai-assisted-dev-kit/blob/85af558df0f0ba2ebffc39e70fcbfd5965a7d210/hooks/lock-tests.ts), tests in [hooks/lock-tests.test.ts](https://github.com/ikabeee/ai-assisted-dev-kit/blob/85af558df0f0ba2ebffc39e70fcbfd5965a7d210/hooks/lock-tests.test.ts)). It is about 40 lines of Node: `PreToolUse` on `Edit|Write`, a `.claude/tests.lock` file, test files matching `*.test.*`, `*.spec.*` or a `__tests__/`, `test/` or `tests/` folder, and exit 2 with the message above on a change to an existing test file; new test files are allowed. Checked live: an edit to a locked test was blocked and the file hash did not change.

Open questions for maintainers:
- **Lock location.** `.claude/tests.lock` is Claude-specific. Should it be a runtime-neutral, git-ignored file (for example under `odd/`), or state outside the worktree? It must never become part of a review candidate.
- **Test paths.** Should it reuse gentle-shell's `TEST_PATH_PATTERNS` as the single list (it already includes `_test.go` and `test_*.py`)? Are golden files and `testdata/` locked too? gentle-ai's own routing goldens change whenever routing text changes.
- **Granularity.** Lock per task or per feature? New test files are already allowed, so a later task can add RED tests; is "existing files are frozen" enough, or should the lock name a manifest of the reviewed files?
- **Ownership.** Who creates and removes the lock: the parent only? A small CLI (`gentle-ai odd lock|unlock`) would keep the hook, the record and the close-time diff in one implementation.
- **RDD interaction.** A native correction or the verifier's "The writer commits the probes as regression tests" step may need to edit tests. Do those run unlocked, or does the lock exempt them?
- **Defaults.** Opt-in or on for tracked work? Fail-open, or `onFailure: "block"`?

AI disclosure: this issue was drafted with AI assistance and reviewed by me.
```

## 4. Verified vs unverified claims

**Verified against the primary text (quoted above):**

- **gentle-ai source** (at `f61484d`): every file and line cited, plus the installed v4.2.0 `~/.claude/CLAUDE.md` content.
- **gentle-shell source** (at `4863250`): `lib/delivered-test-lint.ts`, `extensions/gentle-ai.ts:1472` and `:10605`, `assets/support/strict-tdd-verify.md`, `odd/tasks/r1-review-advisories.md`.
- **Issues and PRs:** every state, date and quote, read with `gh issue view` / `gh pr view` (#5092, #3727, #3760, #4977, #4978, #5483, #3411, #4915, #5587, #212, #262, #4133, #986, #1263, #5156, #5715, gentle-shell #2289, #2290, #1200, #1347, #1354, #1693, #46, #2364).
- **Claude Code hooks docs:** the PreToolUse exit-2 row, `permissionDecision` values, `onFailure`, timeouts failing open, hooks running inside subagents with `agent_id`/`agent_type`, PostToolUse not firing for Bash rewrites, `FileChanged` "can't block".
- **Claude Code permissions docs:** `Edit` rule scope, Bash coverage and limits, deny precedence over hooks.
- **Claude Code best practices:** "hooks are deterministic", and "have one Claude write tests, then another write code to pass them".
- **Anthropic prompting best practices:** both test quotes.
- **ImpossibleBench:** §4.2 and §5.2 quotes, from the arXiv HTML.

**Unverified or partial:**

- **Codex and Pi hook capabilities** (deny, `ask`, fail behavior): taken from a community comment on #3411 (2026-09-30) that cites the source. I did not check them myself.
- **Search coverage:** GitHub search ranks by relevance and I capped results per query (10 to 30), so a low-ranked match could be missed. Two queries ("special-case", "overfit") hit the rate limit and were rerun as "special-casing" and "overfitting". gentle-shell has discussions disabled, so only gentle-ai discussions were read.
- **NODD:** gate names and the `/nodd-allow` escape hatch come from its source comments at `0eb8a41`. Whether only the user can call `/nodd-allow` was not checked.
- **Lock file and Bash:** whether Claude Code's `Edit(...)` deny rules also catch `rm` of a lock file through Bash. The docs list `cat`, `head`, `tail`, `sed`, `tee` and redirections, and do not mention `rm`.
- **Settings reload:** whether a mid-session change to settings (a deny-rule-based lock) takes effect without a restart. Not checked.
- **ImpossibleBench numbers:** the size of the read-only effect is only in its Figure 7 and was not extracted.
- **Adherence in practice:** no measurement of how often ODD agents edit RED tests. The draft states the gap as structural, not as a measured incident.

### Sources (accessed 2026-10-25)

- https://github.com/Gentleman-Programming/gentle-ai/tree/f61484d781e75de8f35a32ff31dfefba01a67c66 (source tree; files cited in §2.1)
- https://github.com/Gentleman-Programming/gentle-ai/blob/f61484d781e75de8f35a32ff31dfefba01a67c66/internal/components/agentguidance/routing.go
- https://github.com/Gentleman-Programming/gentle-ai/blob/f61484d781e75de8f35a32ff31dfefba01a67c66/internal/components/agenthooks/claude.go
- https://github.com/Gentleman-Programming/gentle-ai/blob/f61484d781e75de8f35a32ff31dfefba01a67c66/internal/components/legacyassets/claude_hook.go
- https://github.com/Gentleman-Programming/gentle-ai/blob/f61484d781e75de8f35a32ff31dfefba01a67c66/.github/ISSUE_TEMPLATE/feature_request.yml
- https://github.com/Gentleman-Programming/gentle-shell/blob/4863250a8b8bfe7bac35879dcd4e44ddfbb92d68/lib/delivered-test-lint.ts
- https://github.com/Gentleman-Programming/gentle-shell/blob/4863250a8b8bfe7bac35879dcd4e44ddfbb92d68/odd/tasks/r1-review-advisories.md
- https://github.com/Gentleman-Programming/gentle-ai/issues/5092
- https://github.com/Gentleman-Programming/gentle-ai/issues/3727 and https://github.com/Gentleman-Programming/gentle-ai/pull/3760
- https://github.com/Gentleman-Programming/gentle-ai/issues/4977 and https://github.com/Gentleman-Programming/gentle-ai/pull/4978
- https://github.com/Gentleman-Programming/gentle-ai/issues/5483
- https://github.com/Gentleman-Programming/gentle-ai/issues/3411 (capability matrix: https://github.com/Gentleman-Programming/gentle-ai/issues/3411#issuecomment-5902803157)
- https://github.com/Gentleman-Programming/gentle-ai/issues/4915 and https://github.com/gonzalonicolasr/nodd (src/gates at `0eb8a41`)
- https://github.com/Gentleman-Programming/gentle-ai/issues/5587
- https://github.com/Gentleman-Programming/gentle-ai/issues/5715
- https://github.com/Gentleman-Programming/gentle-ai/issues/5156
- https://github.com/Gentleman-Programming/gentle-ai/issues/262, https://github.com/Gentleman-Programming/gentle-ai/issues/4133, https://github.com/Gentleman-Programming/gentle-ai/issues/986, https://github.com/Gentleman-Programming/gentle-ai/issues/1263
- https://github.com/Gentleman-Programming/gentle-ai/issues/212
- https://github.com/Gentleman-Programming/gentle-ai/discussions (all 35 read)
- https://github.com/Gentleman-Programming/gentle-shell/issues/2289 and https://github.com/Gentleman-Programming/gentle-shell/pull/2290
- https://github.com/Gentleman-Programming/gentle-shell/pull/1200, https://github.com/Gentleman-Programming/gentle-shell/issues/1347, https://github.com/Gentleman-Programming/gentle-shell/pull/1354
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/best-practices
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://arxiv.org/abs/2510.20270 and https://arxiv.org/html/2510.20270 (ImpossibleBench, Zhong, Raghunathan, Carlini)
