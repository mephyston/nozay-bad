#!/usr/bin/env node
// PreToolUse(Edit|Write) : refuse la retouche d'une migration D1 déjà publiée sur
// origin/main. Elle a pu être appliquée en staging ou en production : la modifier
// ne changerait rien à ces bases, mais ferait diverger le dépôt de ce qui tourne
// (et `check:migrations` casserait la CI). Une migration encore locale reste
// modifiable — c'est la procédure normale de mise au point.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const filePath = String(input?.tool_input?.file_path ?? '');
if (!/libs\/shared\/db\/migrations\/\d{4}_[^/]+\.sql$/.test(filePath)) process.exit(0);

const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
let rel;
try {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
  rel = path.relative(root, path.resolve(cwd, filePath));
  execFileSync('git', ['cat-file', '-e', `origin/main:${rel}`], { cwd, stdio: 'ignore' });
} catch {
  process.exit(0); // absente d'origin/main (ou hors dépôt) : encore modifiable
}

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason:
      `[garde nozay-bad] ${rel} est déjà publiée sur origin/main : les migrations sont append-only. ` +
      'Écrire une nouvelle migration (skill /new-migration) qui corrige celle-ci.',
  },
}));
