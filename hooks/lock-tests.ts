// Claude Code PreToolUse hook: while <project>/.claude/tests.lock exists, blocks writes to test files,
// so the agent makes the reviewed tests pass instead of editing them.
// Exit 2 blocks the tool call and shows stderr to Claude: https://code.claude.com/docs/en/hooks
// Register it with matcher "Edit|Write" and command `node ~/.claude/hooks/lock-tests.ts`.
import { readFileSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { editedFilePath, findFolderContaining } from './hook-input.ts';

const LOCK_FILE = join('.claude', 'tests.lock');
const TEST_FILE_NAME = /\.(test|spec)\.[cm]?[jt]sx?$/;
const TEST_FOLDERS = new Set(['__tests__', 'test', 'tests']);
const ALLOW = 0;
const BLOCK = 2;

if (import.meta.main) {
  process.exitCode = guardTestFiles(readFileSync(0, 'utf8'));
}

function guardTestFiles(hookInput: string): number {
  const filePath = editedFilePath(hookInput);
  if (filePath === undefined) return ALLOW;

  const projectRoot = findFolderContaining(dirname(filePath), LOCK_FILE);
  if (projectRoot === undefined || !isTestFile(relative(projectRoot, filePath))) return ALLOW;

  process.stderr.write(lockMessage(join(projectRoot, LOCK_FILE)));
  return BLOCK;
}

// Folders are judged inside the project only, so a project that lives under a `tests` folder still works.
function isTestFile(pathInProject: string): boolean {
  const folders = pathInProject.split(sep).slice(0, -1);
  return TEST_FILE_NAME.test(basename(pathInProject)) || folders.some((folder) => TEST_FOLDERS.has(folder));
}

function lockMessage(lockPath: string): string {
  return (
    `Tests are locked while you implement (${lockPath}). ` +
    'Make the existing tests pass without changing them. ' +
    'If a test looks wrong, stop and tell the user which test and why.\n'
  );
}
