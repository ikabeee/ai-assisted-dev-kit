import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderIndex } from './objectives-index.ts';

const SCRIPT = join(import.meta.dirname, 'objectives-index.ts');

const docs: Record<string, string> = {
  'tasks/done.md': '---\nstatus: done\n---\n# done',
  'tasks/plain.md': '# no front-matter',
};
const readDoc = (path: string) => docs[path];

test('takes the status from the linked feature document front-matter', () => {
  assert.equal(renderIndex('1. [Done](tasks/done.md)', readDoc), '1. [Done](tasks/done.md) — done');
});

test('marks an objective without a feature document as not started', () => {
  assert.equal(renderIndex('2. Ambiguity gate', readDoc), '2. Ambiguity gate — not started');
});

test('marks a document without front-matter or missing on disk as unknown', () => {
  assert.equal(renderIndex('1. [Plain](tasks/plain.md)', readDoc), '1. [Plain](tasks/plain.md) — unknown');
  assert.equal(renderIndex('1. [Gone](tasks/gone.md)', readDoc), '1. [Gone](tasks/gone.md) — unknown');
});

test('replaces a stale status and leaves other lines untouched', () => {
  const index = '# Objectives\n\n> quote\n1. [Done](tasks/done.md) — pending';
  assert.equal(renderIndex(index, readDoc), '# Objectives\n\n> quote\n1. [Done](tasks/done.md) — done');
});

test('CLI rewrites the index, then --check passes; a stale index fails --check', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'objectives-index-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'tasks'));
  writeFileSync(join(root, 'tasks/done.md'), docs['tasks/done.md']);
  const indexPath = join(root, 'objectives.md');
  writeFileSync(indexPath, '1. [Done](tasks/done.md)\n');

  const stale = spawnSync('node', [SCRIPT, '--check', indexPath], { encoding: 'utf8' });
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /is stale/);
  assert.equal(readFileSync(indexPath, 'utf8'), '1. [Done](tasks/done.md)\n');

  assert.equal(spawnSync('node', [SCRIPT, indexPath]).status, 0);
  assert.equal(readFileSync(indexPath, 'utf8'), '1. [Done](tasks/done.md) — done\n');
  assert.equal(spawnSync('node', [SCRIPT, '--check', indexPath]).status, 0);
});
