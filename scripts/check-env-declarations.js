import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const APPS_AND_LIBS = [path.join(ROOT_DIR, 'apps'), path.join(ROOT_DIR, 'libs')];

const ASTRO_AND_SYSTEM_EXCLUSIONS = new Set([
  'DEV',
  'MODE',
  'PROD',
  'SSR',
  'BASE_URL',
  'SITE',
  'NODE_ENV'
]);

function getDeclaredVars() {
  const declared = new Set();

  // 1. Read .env.example
  const envExamplePath = path.join(ROOT_DIR, '.env.example');
  if (fs.existsSync(envExamplePath)) {
    const content = fs.readFileSync(envExamplePath, 'utf8');
    const matches = content.matchAll(/([A-Z0-9_]+)\s*=/g);
    for (const match of matches) {
      declared.add(match[1]);
    }
  }

  // 2. Read all wrangler*.json files
  function findWranglerConfigs(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.astro') {
        findWranglerConfigs(fullPath);
      } else if (entry.isFile() && entry.name.startsWith('wrangler') && entry.name.endsWith('.json')) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const json = JSON.parse(raw);

          const extractFromObj = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            if (obj.vars) Object.keys(obj.vars).forEach(k => declared.add(k));
            if (Array.isArray(obj.kv_namespaces)) obj.kv_namespaces.forEach(kv => kv.binding && declared.add(kv.binding));
            if (Array.isArray(obj.d1_databases)) obj.d1_databases.forEach(d1 => d1.binding && declared.add(d1.binding));
            if (Array.isArray(obj.services)) obj.services.forEach(s => s.binding && declared.add(s.binding));
            if (obj.env) Object.values(obj.env).forEach(envObj => extractFromObj(envObj));
          };

          extractFromObj(json);
        } catch {
          // Ignore JSON parse error
        }
      }
    }
  }

  findWranglerConfigs(ROOT_DIR);
  return declared;
}

function findEnvVariableUsages() {
  const usages = new Map(); // varName -> Set of filePaths

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.astro' && entry.name !== '.nx') {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.astro') || entry.name.endsWith('.svelte'))) {
        if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) continue;

        const content = fs.readFileSync(fullPath, 'utf8');

        const regexes = [
          /\bc\.env(?:\?\.)?([A-Z0-9_]+)\b/g,
          /\bimport\.meta\.env(?:\?\.)?([A-Z0-9_]+)\b/g,
          /\bprocess\.env(?:\?\.)?([A-Z0-9_]+)\b/g,
          /\bresolvedEnv(?:\?\.)?([A-Z0-9_]+)\b/g,
          /\bcfEnv(?:\?\.)?([A-Z0-9_]+)\b/g,
          /\b(?:env as any)(?:\?\.)?([A-Z0-9_]+)\b/g
        ];

        for (const regex of regexes) {
          const matches = content.matchAll(regex);
          for (const match of matches) {
            const varName = match[1];
            if (!ASTRO_AND_SYSTEM_EXCLUSIONS.has(varName)) {
              if (!usages.has(varName)) {
                usages.set(varName, new Set());
              }
              usages.get(varName).add(path.relative(ROOT_DIR, fullPath));
            }
          }
        }
      }
    }
  }

  APPS_AND_LIBS.forEach(dir => {
    if (fs.existsSync(dir)) scanDir(dir);
  });

  return usages;
}

function main() {
  const declared = getDeclaredVars();
  const usages = findEnvVariableUsages();

  const missing = [];

  for (const [varName, files] of usages.entries()) {
    if (!declared.has(varName)) {
      missing.push({ varName, files: Array.from(files) });
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ [env-check] Erreur : Variables d\'environnement ou bindings non déclarés détectés !\n');
    missing.forEach(item => {
      console.error(`  - ${item.varName}`);
      console.error(`    Fichiers d'utilisation :`);
      item.files.forEach(f => console.error(`      • ${f}`));
    });
    console.error('\n--> Déclarez chaque variable dans wrangler.json (prod/staging) ou dans .env.example.\n');
    process.exit(1);
  }

  console.log(`\n✅ [env-check] Succès : Les ${usages.size} variables/bindings analysés sont tous correctement déclarés.\n`);
  process.exit(0);
}

main();
