# Context-usage tooling for Claude Code: build or adopt?

Research date: 2026-10-23. Scope: before building a DIY context guard (status line script writes `used_percentage` to a file, a `UserPromptSubmit` hook injects `additionalContext` past ~100K tokens), check whether Claude Code itself (plugins, mods, built-in settings) or an open-source tool already collects the current session's context-window usage and can act on it: warn the user, or make the agent offer to continue, `/compact`, or start a new session with a handoff of pending tasks. Primary sources only. Anything not traced to its owner is marked **unverified**. Local environment checked: Claude Code `2.1.309`.

## 1. Summary

- **Claude Code mods already solve the data-collection problem natively.** A mod is "a plugin that changes how Claude Code looks and behaves", made of JavaScript or TypeScript event handlers that run inside Claude Code. Anthropic's own example use is "a pane that charts how full your context is after each request" ([Mods overview](https://code.claude.com/docs/en/plugins/mods/overview)).
- **A mod can read context usage directly.** `$.session.usage()` "returns `{ startedAt, context, rateLimits, cost }`: `context` has `tokens`, `window`, and `percent`" ([Mods reference](https://code.claude.com/docs/en/plugins/mods/reference#mods-api-methods)). Anthropic's sample mod says these match the status line's `total_input_tokens`, `context_window_size` and `used_percentage`, and that the call "is free, because the mod doesn't ask for a breakdown, so it sends no token-count request" ([token-weather README](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/token-weather)).
- **A mod can also act on it, with no file bridge.** It can add text only Claude reads to a submitted prompt (`next({ ...e, context: [...] })` on `prompt.submit`), ask the user a multiple-choice question (`$.ui.ask`), show a toast or status line, submit a prompt, fill the prompt box, and compact the session (`$.session.compact`) ([Mods events](https://code.claude.com/docs/en/plugins/mods/events#rewrite-or-add-to-a-prompt), [Mods API](https://code.claude.com/docs/en/plugins/mods/api#show-something-without-starting-a-turn), [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference#mods-api-methods)).
- **Mods need Claude Code v2.1.287 or later in the terminal** ("Mods are on by default") ([Mods overview](https://code.claude.com/docs/en/plugins/mods/overview#turn-mods-on-or-off)). The local install (`2.1.309`) qualifies.
- **Settings hooks still get no context-usage fields.** The common input fields are `session_id`, `prompt_id`, `transcript_path`, `cwd`, `scratchpad_dir`, `permission_mode`, `effort`, `hook_event_name`, `agent_id` and `agent_type` ([Hooks](https://code.claude.com/docs/en/hooks)). The upstream request to add them, [anthropics/claude-code#30202](https://github.com/anthropics/claude-code/issues/30202), was closed as a duplicate. That is why every hook-based tool below uses either a status line bridge or transcript parsing.
- **Three open-source tools already do something close to our plan:**
  - [`context-keeper`](https://github.com/mishgoldenberg/claude-mods) is a mod. It toasts at `warnAt` (default 70%) and writes a handoff note at `checkpointAt` (default 85%). The note covers goal, decisions, files and TODOs, saved to `.claude/checkpoints/`. It also offers `/resume-checkpoint` after `/clear`. The repo is 3 weeks old with 10 stars.
  - [`context-awareness-for-agents`](https://github.com/sdi2200262/context-awareness-for-agents) is a plugin. A `PreToolUse` hook on every tool injects threshold reminders into the conversation. It reads usage by parsing the transcript JSONL.
  - The [cc-context-awareness listing](https://tomevault.io/tome/sdi2200262/cc-context-awareness) describes a status line bridge plus a hook, the same shape as our DIY design. **Unverified**: the listing is secondary, and it appears to be an earlier version of `context-awareness-for-agents`.
- **The popular tools only display; they do not act on the model.** These are [ccusage](https://github.com/ccusage/ccusage), [ccstatusline](https://github.com/sirmalloc/ccstatusline) and [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor).
- **No built-in setting warns at a user-chosen threshold and asks what to do.** Built-ins either show usage (`/context`, `/usage`, status line) or compact automatically (`/autocompact`, `autoCompactWindow`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`). On 1M-window models such as Opus 5.5, the default auto-compact point is "about 967K tokens" ([Model config](https://code.claude.com/docs/en/model-config)). A 100K guard therefore fires far earlier than anything built in.
- **The transcript JSONL format is not a supported contract.** The request for "Stable, documented schema for `~/.claude/projects/<encoded-cwd>/<uuid>.jsonl` line types" was closed `NOT_PLANNED` on 2026-09-16 ([anthropics/claude-code#53516](https://github.com/anthropics/claude-code/issues/53516)). Tools that parse it (ccusage, ccstatusline in part, Claude-Code-Usage-Monitor, context-awareness-for-agents) depend on an undocumented format.

## 2. What Claude Code itself provides

### 2.1 Mods: read and act in-process

Quoted capabilities relevant to a context guard:

| Need | Mod mechanism | Source |
|---|---|---|
| Read current context size | `$.session.usage()` gives `context.tokens`, `context.window` and `context.percent` | [Reference](https://code.claude.com/docs/en/plugins/mods/reference#mods-api-methods) |
| Know when to re-check | `turn.complete` ("A turn ended", with `e.agentId` set for subagents). `session.measure` fires "After each turn, and when a plan limit's percent used changes" | [Reference: Turns, Session](https://code.claude.com/docs/en/plugins/mods/reference#turns) |
| Tell Claude (the model) | On `prompt.submit`: "Add text only Claude reads, after the prompt: `next({ ...e, context: [...(e.context ?? []), extraText] })`" | [Events](https://code.claude.com/docs/en/plugins/mods/events#rewrite-or-add-to-a-prompt) |
| Ask the user to choose | `$.ui.ask(question, options)` "shows your question above a numbered list of your options ... and resolves to the label the user picks". It rejects in `claude -p` | [Events](https://code.claude.com/docs/en/plugins/mods/events#hold-a-tool-call-until-the-user-decides) |
| Warn without a turn | `$.ui.toast` (shown for 4 s by default), `$.ui.status` (a persistent line under the prompt), `$.ui.notify` (an OS or terminal notification) | [API](https://code.claude.com/docs/en/plugins/mods/api#show-something-without-starting-a-turn) |
| Compact | `$.session.compact` (listed method). `session.compact` event: "The conversation is about to be compacted" | [Reference](https://code.claude.com/docs/en/plugins/mods/reference#session) |
| Hand off to a new session | `$.model.fork({ prompt })` "sends the current conversation with your prompt at the end" (mostly cache reads). `$.prompt.fill` puts a draft in the prompt box | [API](https://code.claude.com/docs/en/plugins/mods/api#call-a-model) |

Constraints to weigh:

- **Trust surface.** "A mod is code that runs with your permissions. It can read and write your files, start processes, and make network requests." "Mods aren't sandboxed." ([Overview](https://code.claude.com/docs/en/plugins/mods/overview#decide-whether-to-trust-a-mod)). `claude plugin validate <dir>` lists a mod's `hooks:` and `calls:` before you install it.
- **Where it draws.** Hooks run everywhere the plugin loads, including `claude -p` and the Agent SDK. Drawing (bands, panes, toasts) shows only in the terminal, the Desktop app and the VS Code extension (2.1.299 or later) ([Overview: Where mods run](https://code.claude.com/docs/en/plugins/mods/overview#where-mods-run)).
- **Limits.** A hook gets 10 s of its own execution time, and Claude Code "skips a hook that exceeds a time limit" ([Reference: Limits](https://code.claude.com/docs/en/plugins/mods/reference#limits)).
- **Cache.** Text added through prompt hooks "that changes between requests invalidates the prompt cache" ([Events](https://code.claude.com/docs/en/plugins/mods/events#rewrite-or-add-to-a-prompt)). Inject only when a threshold is crossed, not on every prompt.
- **Breakdown cost.** Per the token-weather README, calling `usage()` without a breakdown sends no token-count request. Inferred, not stated in Anthropic docs: asking for a breakdown (as `context-keeper` does with `{ breakdown: 'summary' }`) may send one.

### 2.2 Plugins and settings hooks

- A plugin can ship hooks, skills, MCP servers, monitors, and so on. Its `settings` key can set only `agent` and `subagentStatusLine`, so a plugin cannot install the main status line for you ([Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)).
- Settings hooks inject text through `additionalContext`. Claude Code "wraps the string in a system reminder and inserts it into the conversation". Each string is capped at 10,000 characters ([Hooks](https://code.claude.com/docs/en/hooks)). Hook stdin carries no context usage, so a hook-only design must bridge from the status line or parse the transcript.

### 2.3 Status line

- It receives `context_window.used_percentage`, `context_window_size`, `total_input_tokens`, `current_usage`, `exceeds_200k_tokens` and `session_id` on stdin ([Status line](https://code.claude.com/docs/en/statusline)).
- `used_percentage` "is calculated from input tokens only" and "may be `null` early in the session". `current_usage` is `null` "after `/compact` until the next API call".
- It runs after each assistant message, after `/compact`, and on a few other triggers, "debounces updates at 300ms", and "runs locally and does not consume API tokens". It is display-only: nothing it prints reaches the model.
- When the auto-compact window is set via `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, "the status line's `used_percentage` measures against the model's full context window, so ... that percentage doesn't indicate when compaction will run" ([Model config](https://code.claude.com/docs/en/model-config)).

### 2.4 Built-in thresholds and commands

| Built-in | What it does | Warns and asks? | Source |
|---|---|---|---|
| `/context [all]` | "Visualize current context usage as a colored grid", with "capacity warnings" | On demand only | [Commands](https://code.claude.com/docs/en/commands) |
| `/usage` | Session token totals and plan limits | On demand only | [Costs](https://code.claude.com/docs/en/costs) |
| `/autocompact <tokens>` / `autoCompactWindow` | "Set the auto-compact window: how full the context window gets before Claude Code compacts automatically" | No, it compacts | [Commands](https://code.claude.com/docs/en/commands), [Model config](https://code.claude.com/docs/en/model-config) |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | Percentage of the auto-compact window at which compaction triggers. It "can't raise the threshold" | No | [Env vars](https://code.claude.com/docs/en/env-vars) |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | Window from `100000` to `1000000` tokens | No | [Env vars](https://code.claude.com/docs/en/env-vars) |
| `idleCompaction` / `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` | Compacts idle conversations above 200K by default (minimum 100K) | No | [Env vars](https://code.claude.com/docs/en/env-vars) |
| "Context or auto-compact warning" | Shown when "the conversation has grown close to the session's auto-compact window" | Near compaction only, not configurable to 100K independently | [Costs](https://code.claude.com/docs/en/costs) |

Conclusion: `autoCompactWindow: 100000` would enforce the budget, but by compacting without asking. That loses the "continue / compact / new session with handoff" choice the user wants.

## 3. Open-source tools

Repository data from the GitHub API on 2026-10-23.

| Tool | License | Activity | Data source | Acts on model / user? | Install | Undocumented-format dependency | Notes |
|---|---|---|---|---|---|---|---|
| [ccusage](https://github.com/ccusage/ccusage) | MIT (LICENSE file, npm) | v20.0.42, 2026-10-23. 19.2k stars | "reads local usage data from coding agent CLIs" (README) | Display only. Daily, weekly, session and 5-hour block reports, plus `ccusage statusline` "(Beta)" | `npx ccusage@latest` | Yes (local session logs) | Cost and usage reporting, not a live guard |
| [ccstatusline](https://github.com/sirmalloc/ccstatusline) | MIT | v2.2.32, 2026-10-09. 13.4k stars | Status line stdin JSON, plus transcript JSONL for some widgets ("Transcript-backed token ... metrics now stream JSONL records") | Display only (status line widgets: Context %, Context Bar, Compaction Counter) | `npx -y ccstatusline@latest` TUI, which writes `statusLine` to settings | Partly | The README warns that the command "runs once per repaint". Pin the version rather than `@latest` |
| [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) | MIT | v4.0.0, 2026-06-27. Last push 2026-07-05 | Local session data, plus an optional status line hook "to capture official rate_limits" | Display and plan-limit forecasts. `--once` exit codes for automation | `uv tool install claude-monitor` | Yes | Targets plan and rate limits, not the context window. Activity is slowing |
| [cc-aio-mon](https://github.com/iM3SK/cc-aio-mon) | MIT | Pushed 2026-10-23. 34 stars | Status line stdin, written to `$TMPDIR` snapshots | Display (TUI). Also probes `status.claude.com` | Python, stdlib only | No | Same status line file bridge as our DIY design, but display-only |
| [clepsydre](https://github.com/tpierrain/clepsydre) | Apache-2.0 | Last push 2026-07-11. 14 stars | Status line | Display (gauge, "% until auto-compact") | Status line script | **Unverified** | Visual only |
| [context-awareness-for-agents](https://github.com/sdi2200262/context-awareness-for-agents) | MIT | Pushed 2026-10-19. 35 stars | Transcript JSONL (`claude/read-context.sh` reads `~/.claude/projects/*/<sid>.jsonl`, `message.usage`, `compact_boundary`) | **Acts on the model**: a `PreToolUse` hook (matcher `.*`) injects reminders at thresholds. Default 70% of ~967K. Configurable messages, plus a `get-my-context` skill | `/plugin marketplace add ...` | **Yes** | Runs bash and jq on every tool call. Reminders fire on tool calls, not on prompt submit |
| [claude-mods / context-keeper](https://github.com/mishgoldenberg/claude-mods) | MIT | Created 2026-10-03. 10 stars | `$.session.usage()` (mods API) | **Acts on the user**: toast at `warnAt`, auto handoff note at `checkpointAt` via `$.model.fork`, `$.prompt.suggest('/compact')`, `/checkpoint`, `/resume-checkpoint` | Plugin marketplace | No (official API) | Very close to our goal. Thresholds are percentages, not tokens. Does not inject text for the model. Tiny, very new, single author |
| [token-weather](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/token-weather) (Anthropic sample) | Repo: Apache-2.0 | Repo pushed 2026-10-14 | `$.session.usage()` on `session.start` and `turn.complete` | Display only (band above the prompt, with "Compact soon" at 90%+) | `--plugin-dir` | No | "Shared as-is ... no support or maintenance is implied." A good reference implementation |

### Supply-chain notes

- **`claude-mods` (context-keeper)**: 10 stars, created three weeks ago, one maintainer. It runs unsandboxed in-process with full user permissions and makes model calls. Read `plugins/context-keeper/hooks/register.tsx` and run `claude plugin validate` before any install. Its README also claims "Function hooks are early access". Anthropic's current docs say mods are on by default from v2.1.287, so that line is likely stale. **Unverified**.
- **`context-awareness-for-agents`**: small (35 stars). It runs a shell script on every tool call, writes state to `/tmp` by default, and depends on the undocumented JSONL layout.
- **`ccstatusline` / `ccusage` via `npx ...@latest`**: a mutable tag executes on every repaint or run. Pin exact versions.
- **Claude-Code-Usage-Monitor**: no release since June 2026. It does not cover context-window guarding.

## 4. Fit against our requirement

Requirement: past a configurable token budget (~100K), have the agent offer to continue, `/compact`, or start a new session with a handoff of pending tasks.

| Option | Collects usage | Model is told | User is offered a choice | Handoff | Contract stability |
|---|---|---|---|---|---|
| DIY: status line file plus `UserPromptSubmit` hook | Yes (bridge) | Yes (`additionalContext`) | Indirectly (Claude asks) | Via our existing skills | Documented APIs. The file bridge is ours |
| context-awareness-for-agents | Yes (JSONL) | Yes | Indirectly | Prompt-driven | Undocumented JSONL |
| context-keeper mod | Yes (official) | No | Toast and suggestion only | Yes (auto note) | Official mods API, new third-party code |
| Custom mod (ours) | Yes (official) | Yes (`prompt.submit` context) | Yes (`$.ui.ask` with 3 options) | `$.model.fork` or our skills | Official mods API |

## 5. Verified vs unverified claims

**Verified against the primary text (quoted above):** mods capabilities, API methods, events, limits and version requirement (code.claude.com mods pages). Status line fields and update triggers. Hook input fields and the `additionalContext` behaviour. `/context`, `/autocompact` and auto-compact thresholds and env vars. Repo licenses, stars, dates and releases (GitHub API, npm registry). The token-weather README text. The context-awareness-for-agents hook config and JSONL reader (source files). The context-keeper options and API calls (README and `register.tsx` via the GitHub API). Issue states for #53516 and #30202 (`gh issue view`).

**Unverified or partial:**
- The cc-context-awareness description (status line bridge, `PreToolUse` and `SessionStart` reset) comes from a third-party listing (tomevault). The current repo uses JSONL parsing instead.
- The date the mods feature opened to all users (2026-10-01, v2.1.287) comes from a third-party blog. The docs confirm only the version.
- That `$.session.usage({ breakdown })` triggers a token-count request is inferred from the token-weather README, not stated in the reference.
- The exact threshold at which Claude Code shows its own "context or auto-compact warning" is not documented.
- The clepsydre data source was not checked in source.
- The [hooks page](https://code.claude.com/docs/en/hooks) was read only up to about 100k characters. No context fields appeared in the common input table.

## 6. Recommendation

**Build our own guard as a small mod, using Anthropic's `token-weather` as the reference and `context-keeper` as design input. Keep the DIY hook only as a fallback.**

- **Why a mod over the planned status line plus hook:**
  - `$.session.usage()` gives the same numbers as the status line, from an official API, with no temp-file bridge, no per-`session_id` file, and no stale-file race.
  - One TypeScript file can both inject a factual note for Claude (`prompt.submit` context) and put a real three-way choice to the user (`$.ui.ask`: Continue / `/compact` / New session with handoff).
  - TypeScript is already in our stack.
- **Why not adopt context-keeper directly:**
  - It is three weeks old, with a single author and full unsandboxed permissions.
  - Its thresholds are percentages, and it never tells the model.
  - Borrow its ideas instead: the handoff note via `$.model.fork`, and `/resume-checkpoint` via `$.prompt.fill`.
- **Why not context-awareness-for-agents:** it depends on the transcript JSONL schema that Anthropic declined to stabilise (#53516), and it runs a shell process on every tool call.
- **Trade-offs:**
  - Mods require v2.1.287 or later, and drawing UI requires the terminal, Desktop app or VS Code extension.
  - In `claude -p`, `$.ui.ask` rejects, so fall back to context injection only.
  - A mod is unsandboxed in-process code, but it is our own and is reviewable with `claude plugin validate`.
  - The mods API is newer than settings hooks, so it is more likely to change. Pin the minimum version and add a `claude plugin test` case.
- **When to keep the DIY hook:** if the guard must also work where mods are off (`disableAllHooks`, `allowManagedModsOnly`, `--safe-mode`) or on older Claude Code versions.
- **No-code stopgap:** set `/autocompact 100k` (or `autoCompactWindow: 100000`). It enforces the budget, but it compacts without offering the choice.

### Sources (accessed 2026-10-23)

- https://code.claude.com/docs/en/plugins/mods/overview
- https://code.claude.com/docs/en/plugins/mods/reference
- https://code.claude.com/docs/en/plugins/mods/events
- https://code.claude.com/docs/en/plugins/mods/api
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/statusline
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/commands
- https://code.claude.com/docs/en/costs
- https://code.claude.com/docs/en/context-window
- https://code.claude.com/docs/en/model-config
- https://code.claude.com/docs/en/env-vars
- https://platform.claude.com/docs/en/build-with-claude/context-windows
- https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/token-weather
- https://github.com/anthropics/claude-code/issues/53516
- https://github.com/anthropics/claude-code/issues/30202
- https://github.com/ccusage/ccusage
- https://www.npmjs.com/package/ccusage
- https://github.com/sirmalloc/ccstatusline
- https://www.npmjs.com/package/ccstatusline
- https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor
- https://github.com/iM3SK/cc-aio-mon
- https://github.com/tpierrain/clepsydre
- https://github.com/sdi2200262/context-awareness-for-agents
- https://github.com/mishgoldenberg/claude-mods
- https://tomevault.io/tome/sdi2200262/cc-context-awareness (secondary listing, unverified)
