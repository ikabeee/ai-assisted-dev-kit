# AI-Assisted Dev Kit

My Claude Code setup for AI-assisted software development: the global rules I give every agent and the workflow I use to split work across several coding agents.

The idea behind it: the model is a member of the team, not a search box. I write the score (rules, specs, context), the agents play it, and I review before anything ships.

## What's inside

| Path | What it is |
|------|------------|
| `CLAUDE.md` | My global rules: objective-driven work, engineering-level explanations, SonarQube, no deprecated APIs, cite the docs, guidance outside my usual stack, visual style iteration. |
| `skills/swarm-workflow/` | A Claude Code skill that routes work across harnesses (Claude, Codex, Antigravity, OpenCode). |
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
         3. CODER      Codex / Antigravity / OpenCode: TDD inside its edit surface
         │             (several in parallel when surfaces are disjoint)
         4. FEEDBACK   Claude Opus (medium): reviews the diff, tells the cleaner what to fix
         5. CLEANER    any harness: applies the feedback, no new behavior
         │             + architect / hardener / QA only for high-risk changes
         6. GATE       Claude Opus (xhigh): edit surfaces, SonarQube, no deprecated APIs,
         │             full test suite once
         7. COMMITS    Claude: ~400-line work units, Conventional Commits
         8. DELIVERY   me: push, PR and merge
         9. CLOSE      Claude: updates the index, final Log entry with the next step
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

1. Copy the skill: `cp -R skills/swarm-workflow ~/.claude/skills/`
2. Merge the rules from `CLAUDE.md` into your own `~/.claude/CLAUDE.md`. Adapt the stack and preferences to yours.
3. Edit `skills/swarm-workflow/references/invocation.md` with your own harnesses and models. Model names change often; check each CLI's help first.
4. Start a new Claude Code session so it loads the changes.

## License

MIT
