---
name: swarm-workflow
description: "Trigger: multi-harness, swarm, delegate implementation to subagents or codex/agy/opencode. Opus plans and reviews; Claude subagents or other harnesses write code, chosen by the user's Claude plan."
license: MIT
metadata:
  author: "ikabeee"
  version: "1.0"
---

## Activation Contract

Load when work beyond a small adjustment is split across harnesses (Claude, Codex, Antigravity, OpenCode), or when the user asks to delegate implementation.

## Hard Rules

- Hybrid routing. Small adjustments: Claude does them inline (gentle-ai default). Larger implementation: pick the coders by the user's Claude plan, declared in `references/invocation.md`:
  - Max 5x or Max 20x: Claude subagents are the coders. Other harnesses join only for extra parallel capacity or when Claude usage limits are reached.
  - Pro: Codex, Antigravity or OpenCode are the coders, to use every available subscription.
  - Undeclared: ask the user once and record the answer in `references/invocation.md`.
  Delegating to use subscription capacity and run work in parallel is an explicit exception to gentle-ai's rule against delegating for cost.
- Agree the plan with the user before any code is written.
- Each project adapts roles, gates and rules in its own memory or AGENTS.md. Never mix information between projects.
- Ambiguity in a handoff: ask the operator, never guess.
- All delegated code follows the user's global code rules (SonarQube, no `@deprecated` APIs). Claude verifies this in review.
- Shared tree (gentle-ai): all harnesses work in the same working tree, each inside a declared, disjoint edit surface. Use an isolated worktree only when two units need the same file.
- Only Claude (the parent) runs git. Subagents and harnesses never commit, and never run repository-wide formatters, generators or installs.
- Commits: Claude commits work units in Conventional Commits, no `Co-Authored-By` or AI attribution, about 400 authored changed lines each; file count never decides. Push, PR and merge stay with the user.

## Decision Gates

| Work | Harness |
|------|---------|
| Specs, handoffs, final quality gate | Claude Opus, effort `xhigh` |
| UI/UX and visual design decisions | Claude Opus, effort `medium` |
| Coder (tests first, then implementation with tests locked) | By plan (see Hybrid routing): Claude subagents on Max 5x/20x; Codex, Antigravity or OpenCode on Pro. In parallel only when edit surfaces are disjoint |
| Implementation feedback (reviews the coder's diff, tells the cleaner what to fix) | Claude Opus, effort `medium` |
| Cleaner (applies the feedback, no new behavior) | Any harness; the coder's own harness is fine |
| Project indexing (graphify) | Codex |
| Tool runs and mechanical audits | Antigravity |

## Execution Steps

1. Write the handoff: scope, invariants, named tests, reference commit.
2. Assign each harness its allowed edit surface (exact paths or narrow globs) in the handoff; during implementation, test files stay out of it. Scratch in `./tmp/`.
3. Run the swarm-forge two-pack on top of gentle-ai's ODD flow, tests first. Claude specifies (feature document, `S#` specs); the coder writes the tests and shows them failing (RED); Claude reviews the tests against the specs and locks them (`.claude/tests.lock`, see the kit's `hooks/README.md`); the coder implements until GREEN without touching the tests and reports a wrong test instead of editing it; Claude Opus (effort `medium`) reviews the implementation and sends feedback; the cleaner applies it, checks coverage and duplication, and must not add behavior. Every role reads the project's AGENTS.md as its shared constitution. Add architect, hardener (mutation testing) or QA passes only when the task touches a gentle-ai high-risk item. Do not install the original tooling (tmux, Babashka, daemon); follow the process only.
4. Launch each coder (subagent or harness) as `references/invocation.md` describes.
5. Check each harness's diff stays inside its edit surface and meets the handoff and quality gate.
6. Run one seam check at the end (the full suite, once), delete `.claude/tests.lock`, then commit the work units.

## Output Contract

Return: the handoff per harness, the harness and edit surface assigned to each task, the review verdict per diff, and the seam check result.

## References

- `references/invocation.md` — tested CLI commands, models and sandbox caveats per harness.
