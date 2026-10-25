# Harness invocation (tested 2026-10-17)

Model names and flags change often. Check each CLI's `--help` or model list before relying on these.

## Claude plan

- Plan: `max-20x`. One of `pro`, `max-5x`, `max-20x`. `SKILL.md` (Hybrid routing) picks the coders from it. Update it when the subscription changes.
- Declared by hand because Claude Code exposes no plan tier to the agent: the [status line JSON](https://code.claude.com/docs/en/statusline), [hook input](https://code.claude.com/docs/en/hooks) and [environment variables](https://code.claude.com/docs/en/env-vars) document no tier field.
- Max 5x and Max 20x give five and 20 times the Pro per-session usage ([What is the Max plan?](https://support.claude.com/en/articles/11049741)).

## Claude subagents (Max 5x and Max 20x, tested 2026-10-25)

- Launch with the Agent tool, one call per unit. Send every unit of a parallel batch in the same message so they run concurrently.
  - `subagent_type: "general-purpose"`
  - `model: "sonnet"` (resolves to `claude-sonnet-5-5`) for coder and cleaner. Opus stays on plan, feedback and gate, so the Opus share of the plan goes to reasoning. Switch the coder to `"opus"` for a unit that touches a gentle-ai high-risk item.
  - `effort: "high"`. Sonnet 5.5 at low effort can report a change as done without running a check (`docs/research/model-specific-slop-and-readable-code-lint.md`, section 2).
  - Prompt: the handoff (scope, invariants, named tests, reference commit), `## Allowed edit surfaces`, `## Skills to load before work` with the registry paths of `readable-code` and `tdd`, and the exact verification commands.
- Accepted values ([Subagents](https://code.claude.com/docs/en/sub-agents)): `model` is `sonnet`, `opus`, `haiku`, `fable` or a full model ID; `effort` is `low`, `medium`, `high`, `xhigh` or `max`, depending on the model. The per-invocation `effort` parameter needs Claude Code v2.1.292 or later, and the `CLAUDE_CODE_EFFORT_LEVEL` environment variable overrides it.
- Cost: each subagent starts with about 70K tokens of system context before reading any file (measured 2026-10-25). Give one subagent a whole unit of behavior, never a single file.
- Subagents share the working tree and never commit; the parent owns git.
- The five-hour and weekly usage limits are shared between claude.ai and Claude Code ([Use Claude Code with your Pro or Max plan](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)). When one is reached, route the remaining units to the harnesses below.

## Codex

- Model: `gpt-6-luna`, effort `xhigh`.
- Command: `codex exec -C <repo> -m gpt-6-luna -c model_reasoning_effort=xhigh -s workspace-write -c sandbox_workspace_write.network_access=true -o tmp/codex-last.md "<prompt>"`
- The sandbox cannot write to `~/.npm`: use `--cache tmp/.npm-cache`.
- Codex does not commit (Claude owns git), so it needs no write access to `.git`.

## Antigravity (agy, Google AI Pro)

- Models: Gemini 3.8 Flash (High/Medium/Low), Claude Sonnet 4.6 / Opus 4.6 (Thinking), GPT-OSS 120B. List them with `agy models`.
- Implementation model: Gemini 3.8 Flash High.
- Command: `agy -p "<prompt>" --model gemini-3.8-flash-low --mode auto --print-timeout 15m`
- Claude Code asks for approval to run `agy -p`. Claude cannot edit its own `settings.json`; the user adds the rule with `/permissions`.

## OpenCode

- Model: DeepSeek V4.1 Flash, variant `max`.
- Command: `opencode run -m opencode/deepseek-v4.1-flash-free --variant max "<prompt>"`
- Muse Spark (`muse-spark-1.3-contributor-free`) no longer exists; it returned `UnknownError: Unexpected server error`.
