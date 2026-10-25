// Claude Code PostToolUse hook: lints the JS/TS file an agent just edited with the project's own oxlint.
// Exit 2 shows stderr to Claude even though the edit already happened, so it fixes the findings:
// https://code.claude.com/docs/en/hooks
// Register it with matcher "Edit|Write" and command `node ~/.claude/hooks/lint-on-edit.ts`.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

type HookEvent = { cwd?: string; tool_input?: { file_path?: unknown } };

const LINTABLE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const CONFIG_FILE = '.oxlintrc.json';
const PASS = 0;
const SHOW_TO_CLAUDE = 2;

if (import.meta.main) {
  process.exitCode = lintEditedFile(readFileSync(0, 'utf8'));
}

function lintEditedFile(hookInput: string): number {
  const filePath = editedFilePath(hookInput);
  if (filePath === undefined || !LINTABLE_EXTENSIONS.has(extname(filePath))) return PASS;

  const projectRoot = findProjectRoot(dirname(filePath));
  if (projectRoot === undefined) return PASS;
  return runOxlint(projectRoot, filePath);
}

function editedFilePath(hookInput: string): string | undefined {
  const event: HookEvent = JSON.parse(hookInput);
  const filePath = event.tool_input?.file_path;
  if (typeof filePath !== 'string') return undefined;
  return resolve(event.cwd ?? process.cwd(), filePath);
}

function findProjectRoot(startDir: string): string | undefined {
  for (let dir = startDir; ; dir = dirname(dir)) {
    if (existsSync(join(dir, CONFIG_FILE))) return dir;
    if (dirname(dir) === dir) return undefined;
  }
}

// Uses the project's pinned oxlint, never npx, so an edit never downloads anything.
function runOxlint(projectRoot: string, filePath: string): number {
  const oxlint = join(projectRoot, 'node_modules', '.bin', 'oxlint');
  if (!existsSync(oxlint)) return PASS;

  const result = spawnSync(oxlint, [filePath], { cwd: projectRoot, encoding: 'utf8' });
  if (result.status === PASS) return PASS;
  process.stderr.write(result.stdout + result.stderr);
  return SHOW_TO_CLAUDE;
}
