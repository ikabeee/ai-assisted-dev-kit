# Claude Code hooks: lint every edit, lock tests while implementing

Two hooks that turn kit rules into checks Claude Code runs itself. A skill or `CLAUDE.md` rule only asks; a hook runs on every matching tool call, also inside subagents ([Hooks](https://code.claude.com/docs/en/hooks)).

| Hook | Event | What it does |
|------|-------|--------------|
| `lint-on-edit.ts` | `PostToolUse` on `Edit\|Write` | Lints the edited JS/TS file with the project's own `oxlint`; on findings exits 2, which shows them to Claude so it fixes them. Projects without `.oxlintrc.json` are skipped. |
| `lock-tests.ts` | `PreToolUse` on `Edit\|Write` | While `<project>/.claude/tests.lock` exists, exits 2 on a change to an existing test file, which blocks the tool call. Creating a new test file stays allowed, so regressions found during implementation can be pinned. Test files: `*.test.*`, `*.spec.*`, and anything under `__tests__/`, `test/` or `tests/` inside the project. |

## Install (per machine)

1. `mkdir -p ~/.claude/hooks && cp <kit>/hooks/hook-input.ts <kit>/hooks/lint-on-edit.ts <kit>/hooks/lock-tests.ts ~/.claude/hooks/`
2. Merge into `~/.claude/settings.json`, keeping your existing hooks:

   ```json
   {
     "hooks": {
       "PreToolUse": [
         { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/lock-tests.ts" }] }
       ],
       "PostToolUse": [
         { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/lint-on-edit.ts" }] }
       ]
     }
   }
   ```

3. Verify with `/hooks`: both entries are listed.

## Tests-first flow with the lock

For tracked or delegated work. A small inline fix stops at RED → GREEN, without a lock.

1. Write the tests from the feature document's specs and run them: they fail (RED).
2. Review the tests against the specs.
3. Lock them: `mkdir -p .claude && echo "<feature>" > .claude/tests.lock`. Add `.claude/tests.lock` to the project's `.gitignore`.
4. Implement until the tests pass (GREEN). New test files can be added; a change to an existing one is blocked with: "Tests are locked while you implement (…). Make the existing tests pass without changing them. If a test looks wrong, stop and tell the user which test and why."
5. At feature close, unlock: `rm .claude/tests.lock`.

## Limits

| Gap | Covered by |
|-----|------------|
| Writes through Bash (`sed -i`, `>`), including deleting the lock | The diff review: in swarm-workflow, test files are outside the implementer's edit surface |
| Harnesses other than Claude Code (Codex, Antigravity, OpenCode) do not run these hooks | The same diff review |
| `lint-on-edit` needs the project's local `node_modules/.bin/oxlint` | Install the lint template first: [readable-code README](../tools/oxlint/readable-code/README.md) |
