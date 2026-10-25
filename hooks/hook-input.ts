// Shared input handling for the Claude Code tool hooks: which file an Edit/Write touched,
// and which project folder owns it. Input fields: https://code.claude.com/docs/en/hooks
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

type ToolEvent = { cwd?: string; tool_input?: { file_path?: unknown } };

export function editedFilePath(hookInput: string): string | undefined {
  const event: ToolEvent = JSON.parse(hookInput);
  const filePath = event.tool_input?.file_path;
  if (typeof filePath !== 'string') return undefined;
  return resolve(event.cwd ?? process.cwd(), filePath);
}

export function findFolderContaining(startDir: string, relativePath: string): string | undefined {
  for (let dir = startDir; ; dir = dirname(dir)) {
    if (existsSync(join(dir, relativePath))) return dir;
    if (dirname(dir) === dir) return undefined;
  }
}
