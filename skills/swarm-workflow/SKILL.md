---
name: swarm-workflow
description: "Trigger: multi-harness, swarm, delegate to codex/agy/opencode, split implementation across harnesses. Opus plans and reviews; other harnesses write code."
license: MIT
metadata:
  author: "ikabeee"
  version: "1.0"
---

## Activation Contract

Load when work beyond a small adjustment is split across harnesses (Claude, Codex, Antigravity, OpenCode), or when the user asks to delegate implementation.

## Hard Rules

- Hybrid routing. Small adjustments: Claude does them inline (gentle-ai default). Larger implementation: delegate to other harnesses to use every available subscription (Claude, Gemini via Antigravity, Codex, OpenCode) and run work in parallel. This is an explicit exception to gentle-ai's rule against delegating for cost.
- Agree the plan with the user before any code is written.
- Each project adapts roles, gates and rules in its own memory or AGENTS.md. Never mix information between projects.
- Ambiguity in a handoff: ask the operator, never guess.
- All delegated code follows the user's global code rules (SonarQube, no `@deprecated` APIs). Claude verifies this in review.
- Shared tree (gentle-ai): all harnesses work in the same working tree, each inside a declared, disjoint edit surface. Use an isolated worktree only when two units need the same file.
- Only Claude (the parent) runs git. Harnesses never commit, and never run repository-wide formatters, generators or installs.
- Commits: Claude commits work units in Conventional Commits, no `Co-Authored-By` or AI attribution, about 400 authored changed lines each; file count never decides. Push, PR and merge stay with the user.

## Decision Gates

| Work | Harness |
|------|---------|
| Specs, handoffs, final quality gate | Claude Opus, effort `xhigh` |
| UI/UX and visual design decisions | Claude Opus, effort `medium` |
| Coder (TDD implementation) | Codex, Antigravity or OpenCode; in parallel only when edit surfaces are disjoint |
| Implementation feedback (reviews the coder's diff, tells the cleaner what to fix) | Claude Opus, effort `medium` |
| Cleaner (applies the feedback, no new behavior) | Any harness; the coder's own harness is fine |
| Project indexing (graphify) | Codex |
| Tool runs and mechanical audits | Antigravity |

## Execution Steps

1. Write the handoff: scope, invariants, named tests, reference commit.
2. Assign each harness its allowed edit surface (exact paths or narrow globs) in the handoff; scratch in `./tmp/`.
3. Run the swarm-forge two-pack on top of gentle-ai's ODD flow. Claude specifies (feature document, `S#` specs); the coder implements with TDD and unit tests; Claude Opus (effort `medium`) reviews the implementation and sends feedback; the cleaner applies it, checks coverage and duplication, and must not add behavior. Every role reads the project's AGENTS.md as its shared constitution. Add architect, hardener (mutation testing) or QA passes only when the task touches a gentle-ai high-risk item. Do not install the original tooling (tmux, Babashka, daemon); follow the process only.
4. Launch each harness with the commands in `references/invocation.md`.
5. Check each harness's diff stays inside its edit surface and meets the handoff and quality gate.
6. Run one seam check at the end (the full suite, once), then commit the work units.

## Output Contract

Return: the handoff per harness, the harness and edit surface assigned to each task, the review verdict per diff, and the seam check result.

## References

- `references/invocation.md` — tested CLI commands, models and sandbox caveats per harness.
