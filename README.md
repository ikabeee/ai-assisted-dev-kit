# AI-Assisted Dev Kit

My Claude Code setup for AI-assisted software development: the global rules I give every agent and the workflow I use to split work across several coding agents.

The idea behind it: the model is a member of the team, not a search box. I write the score (rules, specs, context), the agents play it, and I review before anything ships.

## What's inside

| Path | What it is |
|------|------------|
| `CLAUDE.md` | My global rules: objective-driven work, conversation (language, one question at a time, verify before agreeing), engineering-level explanations, tests first, SonarQube, no deprecated APIs, cite the docs, guidance outside my usual stack, visual style iteration. |
| `skills/readable-code/` | A skill that makes agents write code that reads like a book: Uncle Bob's stepdown rule plus scope, comment, boundary and type rules against AI code slop. |
| `.oxlintrc.json` | The kit lints itself with [eslint-plugin-readable-code](https://github.com/ikabeee/eslint-plugin-readable-code), my lint rules against AI code slop (stepdown order, function size and depth, copied functions, test special-casing), plus `unicorn-js/consistent-boolean-name`. |
| `hooks/` | Claude Code hooks: `lint-on-edit` lints each JS/TS file an agent edits and shows the findings to Claude; `lock-tests` blocks test edits while `.claude/tests.lock` exists, so reviewed tests stay fixed during implementation. See [hooks/README.md](hooks/README.md). |
| `scripts/objectives-index.ts` | Derives each objective's status in `odd/objectives.md` from its feature document's front-matter, so the index never drifts. `--check` fails when it is stale. Node 24, no dependencies. |
| `skills/swarm-workflow/` | A Claude Code skill that routes work across Claude subagents and harnesses (Codex, Antigravity, OpenCode), picking the coders by your Claude plan. |
| `skills/swarm-workflow/references/invocation.md` | Tested CLI commands per harness. |

## The workflow

Work starts from a general objective, not from a single request. The general objective splits into specific objectives, one feature each, tracked in an objectives index (`odd/objectives.md`). Each feature runs through the flow below. When it closes, the index points to the next one and I start a fresh session, so every feature begins with a clean context and the quality stays the same from the first feature to the last.

```
General objective ──► odd/objectives.md (specific objectives, one feature each)
   │
   ▼ one specific objective at a time
Request
   │
   ├─ Small adjustment ──► Claude does it inline ──► focused test + suite ──► done
   │
   └─ Larger work ──► swarm-workflow skill
         │
         1. PLAN       Claude Opus (xhigh): feature document with numbered specs
         │             → I approve the plan
         2. HANDOFF    Claude Opus (xhigh): scope, invariants, named tests,
         │             edit surface per harness
         3. CODER      by Claude plan: Claude subagents (Max 5x/20x) or
         │             Codex / Antigravity / OpenCode (Pro), inside its edit surface:
         │             tests first (RED) → Claude reviews and locks them →
         │             implementation until GREEN with tests locked
         │             (several in parallel when surfaces are disjoint)
         4. FEEDBACK   Claude Opus (medium): reviews the diff, tells the cleaner what to fix
         5. CLEANER    any harness: applies the feedback, no new behavior
         │             + architect / hardener / QA only for high-risk changes
         6. GATE       Claude Opus (xhigh): edit surfaces, SonarQube, no deprecated APIs,
         │             full test suite once
         7. COMMITS    Claude: ~400-line work units, Conventional Commits
         8. DELIVERY   me: push, PR and merge
         9. CLOSE      Claude: runs the index script, final Log entry with the next step
                       → I start a fresh session for the next specific objective
```

This objective layer is my own addition. I proposed it upstream in [gentle-ai#5715](https://github.com/Gentleman-Programming/gentle-ai/issues/5715), and the fresh session at feature close in [gentle-ai#5156](https://github.com/Gentleman-Programming/gentle-ai/issues/5156#issuecomment-6376616881).

Ground rules:

- All harnesses work in the same working tree, each inside a declared, disjoint edit surface.
- Only Claude runs git. Harnesses never commit.
- Every API or technique is backed by the current official docs, with the URL cited.

Credits:

- The base workflow comes from Organic Driven Development (ODD) in [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai): the inline path for small adjustments, feature documents with numbered specs, disjoint edit surfaces in a shared tree, and ~400-line work units.
- The coder → cleaner pipeline comes from Uncle Bob's [swarm-forge](https://github.com/unclebob/swarm-forge) "two-pack". I follow the process without its tooling.

## Tool stack

These are third-party tools I use alongside the kit. They are not included here; install them from their own repositories.

| Tool | Role |
|------|------|
| [Claude Code](https://code.claude.com/docs) | Main agent and orchestrator |
| [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) | Orchestrator rules: development workflow, delegation, review |
| [Engram](https://github.com/Gentleman-Programming/engram) | Persistent memory across sessions |
| [CodeGraph](https://github.com/colbymchenry/codegraph) | Code knowledge graph, so agents understand a repo without reading it all |
| graphify (`graphifyy` on PyPI) | Knowledge graph from code, docs and other inputs |
| Codex, Antigravity, OpenCode | Implementation harnesses |
| Skills by [Matt Pocock](https://github.com/mattpocock/skills), [caveman](https://github.com/JuliusBrussee/caveman), [archify](https://github.com/tt-a1i/archify), [ponytail](https://github.com/DietrichGebert/ponytail), [anti-slop](https://github.com/dmmulroy/anti-slop) | Reusable know-how loaded on demand |

## Install

1. Copy the skills: `cp -R skills/readable-code skills/swarm-workflow ~/.claude/skills/`
2. Copy the index script: `mkdir -p ~/.claude/scripts && cp scripts/objectives-index.ts ~/.claude/scripts/`.
3. Copy the hooks and register them, as [hooks/README.md](hooks/README.md) shows. Each project that wants the lint rules follows the quick path of [eslint-plugin-readable-code](https://github.com/ikabeee/eslint-plugin-readable-code#quick-path-oxlint).
4. Merge the rules from `CLAUDE.md` into your own `~/.claude/CLAUDE.md`. Adapt the stack and preferences to yours.
5. Edit `skills/swarm-workflow/references/invocation.md` with your own harnesses and models. Model names change often; check each CLI's help first.
6. Start a new Claude Code session so it loads the changes.

Kit development: `npm install`, then `npm test`, `npm run typecheck` and `npm run lint`.

## License

MIT
