import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const HOOK = join(import.meta.dirname, 'lock-tests.ts');
const BLOCK = 2;

function createProject(isLocked: boolean, parentDir = tmpdir()): string {
  const root = mkdtempSync(join(parentDir, 'lock-tests-'));
  if (isLocked) {
    mkdirSync(join(root, '.claude'));
    writeFileSync(join(root, '.claude', 'tests.lock'), 'feature-x\n');
  }
  return root;
}

function createFile(filePath: string): string {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, '');
  return filePath;
}

function runHook(filePath: string | undefined, cwd: string) {
  const event = { hook_event_name: 'PreToolUse', cwd, tool_name: 'Edit', tool_input: { file_path: filePath } };
  return spawnSync('node', [HOOK], { input: JSON.stringify(event), encoding: 'utf8' });
}

test('blocks changes to existing test files while the lock exists and tells the agent what to do', (t) => {
  const root = createProject(true);
  t.after(() => rmSync(root, { recursive: true, force: true }));

  for (const testFile of ['src/import-csv.test.ts', 'src/Button.spec.tsx', 'src/__tests__/util.ts', 'tests/e2e.ts', 'test/setup.js']) {
    const result = runHook(createFile(join(root, testFile)), root);

    assert.equal(result.status, BLOCK, testFile);
    assert.equal(
      result.stderr,
      `Tests are locked while you implement (${join(root, '.claude', 'tests.lock')}). ` +
        'Make the existing tests pass without changing them. ' +
        'If a test looks wrong, stop and tell the user which test and why.\n',
    );
  }
});

test('allows creating new test files while the lock exists, so regressions and probes can be pinned', (t) => {
  const root = createProject(true);
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const result = runHook(join(root, 'src', 'regression.test.ts'), root);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});

test('allows implementation files while the lock exists', (t) => {
  const root = createProject(true);
  t.after(() => rmSync(root, { recursive: true, force: true }));

  for (const sourceFile of ['src/import-csv.ts', 'src/testing-utils.ts', 'src/contest/score.ts']) {
    const result = runHook(join(root, sourceFile), root);

    assert.equal(result.status, 0, sourceFile);
    assert.equal(result.stderr, '');
  }
});

test('allows test edits when there is no lock', (t) => {
  const root = createProject(false);
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const result = runHook(join(root, 'src', 'import-csv.test.ts'), root);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});

test('judges test folders relative to the project root, not its parent folders', (t) => {
  const outer = mkdtempSync(join(tmpdir(), 'lock-tests-outer-'));
  t.after(() => rmSync(outer, { recursive: true, force: true }));
  const testsDir = join(outer, 'tests');
  mkdirSync(testsDir);
  const root = createProject(true, testsDir);

  const result = runHook(join(root, 'src', 'import-csv.ts'), root);

  assert.equal(result.status, 0);
});

test('resolves a relative path against the session cwd and ignores events without a path', (t) => {
  const root = createProject(true);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  createFile(join(root, 'src', 'import-csv.test.ts'));

  assert.equal(runHook('src/import-csv.test.ts', root).status, BLOCK);
  assert.equal(runHook(undefined, root).status, 0);
});
