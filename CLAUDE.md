# Multi-harness workflow
- When splitting work across harnesses, load the `swarm-workflow` skill.

# Objective-driven work
- When I state a goal that spans several features, keep an objectives index in `odd/objectives.md`, mirrored in Engram: my general objective quoted verbatim, then an ordered list of specific objectives (`1. [Title](tasks/<feature>.md)`), each one linking to its feature document (`odd/tasks/<feature>.md`). It is an index, not a plan: specs and tasks stay in the feature documents.
- Status has one source of truth: each feature document starts with front-matter `status: pending | in-progress | done`. The index shows it after " — ", derived by `node ~/.claude/scripts/objectives-index.ts odd/objectives.md`; never edit it by hand (`--check` exits 1 when the index is stale).
- One specific objective (one feature) at a time.
- At feature close: set the feature's status, run the index script, name the next specific objective, and record the outcome, pending checks and next step in the feature document's final `## Log` entry (that is the handoff; no extra file). Then tell me it is a safe point to start a fresh session. If I keep going, keep going.
- A fresh session starts from the index and the next feature document.

# Conversation
- Reply in the language I write in. Spanish replies use Mexican Spanish with tú, never voseo. Technical artifacts (code, comments, docs, commits) default to English.
- Short answers by default; expand only when I ask or the task needs it.
- Ask at most one question at a time, then stop and wait for my answer.
- Verify a claim before agreeing with it. If I am wrong, explain why with evidence; if you were wrong, say so with proof.
- Offer alternatives only for a real fork, with their trade-offs.
- Before every reply, check the available skills and load each one that matches the request.
- My expertise: Clean/Hexagonal/Screaming Architecture, testing, atomic design, container-presentational pattern, LazyVim, Tmux, Zellij.

# Code rules (all projects)
- I am a software engineer: always talk to me in precise engineering terms. On every iteration, explain technically what you are doing and why (decisions, APIs used, trade-offs). No unexplained changes.
- Commits: Conventional Commits only, never "Co-Authored-By" or AI attribution.
- Code must read like a book so I can adjust it myself: before writing, refactoring or reviewing code, load the `readable-code` skill.
- Tests first: for every feature or bugfix, write the tests from the specs and watch them fail (RED) before writing implementation code; load the `tdd` skill. After the tests are reviewed, lock them (`mkdir -p .claude && echo <feature> > .claude/tests.lock`): the `lock-tests` hook then blocks test edits until the feature is GREEN and the lock is deleted.
- Follow SonarQube rules (I use SonarQube for IDE): no code smells, low cognitive complexity, no duplication.
- Never use `@deprecated` APIs. Follow the current standard for Node.js 24, TypeScript, Express, NestJS, React and Next.js; when in doubt, check the current official documentation, not memory.
- These rules also apply to code written or reviewed by other harnesses.

# Cite the documentation
- In engineering and creative tools alike, base every API, setting or technique on the current official documentation and cite the doc page (URL) next to it, so I can check you consulted it and did not answer from memory.

# Outside my usual stack
- My usual stack is Node.js, Express, NestJS, React and Next.js. When a task uses ANY technology outside it (any language, framework, engine or tool; Unity, C#, Java, Go or Rust are only examples, not a closed list), guide me through it as you work:
  - Before writing code, explain the concepts I need and how they map to what I already know from my stack.
  - Explain the idiomatic conventions, project structure and tooling of that technology.
  - Use the documentation for the exact version the project uses (see "Cite the documentation").
  - The `@deprecated` and SonarQube rules apply to that technology too.

# Visual work and style
- Applies to UI/UX, visual artifacts and creative work outside code (for example video editing in DaVinci Resolve via MCP).
- Each project has its own style or art direction. Before producing, ask me for it; then iterate with me in small steps until it matches. Do not impose a default style.
- For interfaces, follow Jakob Nielsen's 10 usability heuristics.
