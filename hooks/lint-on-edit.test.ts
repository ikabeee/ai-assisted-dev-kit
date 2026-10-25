import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HOOK = join(import.meta.dirname, 'lint-on-edit.ts');
const BLOCKING_EXIT = 2;

type Stub = { exitCode: number; output: string };

function createProject(stub?: Stub): string {
  const root = mkdtempSync(join(tmpdir(), 'lint-on-edit-'));
  writeFileSync(join(root, '.oxlintrc.json'), '{}');
  if (stub !== undefined) writeOxlintStub(root, stub);
  return root;
}

function writeOxlintStub(root: string, { exitCode, output }: Stub): void {
  mkdirSync(join(root, 'node_modules', '.bin'), { recursive: true });
  const script = `#!/bin/sh\necho "${output} $1"\nexit ${exitCode}\n`;
  writeFileSync(join(root, 'node_modules', '.bin', 'oxlint'), script, { mode: 0o755 });
}

function runHook(filePath: string | undefined, cwd: string) {
  const event = { hook_event_name: 'PostToolUse', cwd, tool_name: 'Edit', tool_input: { file_path: filePath } };
  return spawnSync('node', [HOOK], { input: JSON.stringify(event), encoding: 'utf8' });
}

test('shows the lint findings to Claude with exit 2 when oxlint fails', (t) => {
  const root = createProject({ exitCode: 1, output: 'stepdown-order in' });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src'));
  const file = join(root, 'src', 'import-csv.ts');

  const result = runHook(file, root);

  assert.equal(result.status, BLOCKING_EXIT);
  assert.equal(result.stderr, `stepdown-order in ${file}\n`);
});

test('stays silent with exit 0 when the edited file is clean', (t) => {
  const root = createProject({ exitCode: 0, output: 'clean' });
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const result = runHook(join(root, 'clean.ts'), root);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});

test('resolves a relative file path against the session cwd', (t) => {
  const root = createProject({ exitCode: 1, output: 'finding in' });
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const result = runHook('relative.tsx', root);

  assert.equal(result.status, BLOCKING_EXIT);
  assert.equal(result.stderr, `finding in ${join(root, 'relative.tsx')}\n`);
});

test('skips files oxlint does not lint, projects without config or oxlint, and events without a path', (t) => {
  const linted = createProject({ exitCode: 1, output: 'should not run' });
  const notInstalled = createProject();
  const noConfig = mkdtempSync(join(tmpdir(), 'lint-on-edit-'));
  t.after(() => [linted, notInstalled, noConfig].forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  for (const result of [
    runHook(join(linted, 'README.md'), linted),
    runHook(join(notInstalled, 'index.ts'), notInstalled),
    runHook(join(noConfig, 'index.ts'), noConfig),
    runHook(undefined, linted),
  ]) {
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
  }
});
