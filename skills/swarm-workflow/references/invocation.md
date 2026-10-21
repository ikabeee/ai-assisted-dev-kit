# Harness invocation (tested 2026-10-17)

Model names and flags change often. Check each CLI's `--help` or model list before relying on these.

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
