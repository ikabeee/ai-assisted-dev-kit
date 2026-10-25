// Derives the status of each objective in odd/objectives.md from the front-matter
// of its feature document, so the index never drifts from the documents.
// Usage: node objectives-index.ts [--check] [path/to/objectives.md]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

type ReadDoc = (relativePath: string) => string | undefined;

const DEFAULT_INDEX = 'odd/objectives.md';
const CHECK_FLAG = '--check';
const SEPARATOR = ' — ';
const OBJECTIVE_ITEM = /^\d+\. /;
// The script owns everything after the last " — ", so titles must not contain one.
const STATUS_SUFFIX = / — [^—]*$/;
const DOC_LINK = /\]\(([^)]+\.md)\)/;
const FRONT_MATTER = /^---\n([\s\S]*?)\n---/;
const STATUS_FIELD = /^status:\s*(\S+)\s*$/m;

if (import.meta.main) {
  main(process.argv.slice(2));
}

function main(args: string[]): void {
  const indexPath = args.find((arg) => arg !== CHECK_FLAG) ?? DEFAULT_INDEX;
  const current = readFileSync(indexPath, 'utf8');
  const derived = renderIndex(current, (docPath) => readIfExists(join(dirname(indexPath), docPath)));

  if (args.includes(CHECK_FLAG)) {
    reportIfStale(current, derived, indexPath);
    return;
  }
  writeFileSync(indexPath, derived);
}

export function renderIndex(indexText: string, readDoc: ReadDoc): string {
  return indexText
    .split('\n')
    .map((line) => withDerivedStatus(line, readDoc))
    .join('\n');
}

function reportIfStale(current: string, derived: string, indexPath: string): void {
  if (current === derived) return;
  console.error(`${indexPath} is stale: run node objectives-index.ts ${indexPath}`);
  process.exitCode = 1;
}

function withDerivedStatus(line: string, readDoc: ReadDoc): string {
  if (!OBJECTIVE_ITEM.test(line)) return line;
  const objective = line.replace(STATUS_SUFFIX, '');
  return objective + SEPARATOR + statusOf(objective, readDoc);
}

function statusOf(objective: string, readDoc: ReadDoc): string {
  const docPath = DOC_LINK.exec(objective)?.[1];
  if (docPath === undefined) return 'not started';
  return frontMatterStatus(readDoc(docPath)) ?? 'unknown';
}

function frontMatterStatus(doc: string | undefined): string | undefined {
  const frontMatter = FRONT_MATTER.exec(doc ?? '')?.[1];
  return STATUS_FIELD.exec(frontMatter ?? '')?.[1];
}

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}
