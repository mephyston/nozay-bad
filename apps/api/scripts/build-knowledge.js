import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const helpDir = path.join(__dirname, '../../../apps/admin/src/content/help');
const outputFilePath = path.join(__dirname, '../src/ai-knowledge.ts');

const schemaPaths = [
  '../../../libs/domains/accounting/shared/schema.ts',
  '../../../libs/domains/shop/shared/schema.ts',
  '../../../libs/domains/iam/shared/schema.ts',
  '../../../libs/domains/members/shared/schema.ts',
];

// 1. Read Help Docs
let helpDocs = '';
if (fs.existsSync(helpDir)) {
  const files = fs.readdirSync(helpDir);
  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(helpDir, file), 'utf-8');
      helpDocs += `\n--- Article: ${file} ---\n${content}\n`;
    }
  }
}

// 2. Read Schemas
let dbSchema = '';
for (const schemaPath of schemaPaths) {
  const absolutePath = path.join(__dirname, schemaPath);
  if (fs.existsSync(absolutePath)) {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    // 1. Remove imports
    let cleaned = content.replace(/import .*;?\n/g, '').trim();
    // 2. Force DB column names as keys for the LLM to avoid camelCase confusion
    // Example: lastName: text('last_name') -> last_name: text('last_name')
    cleaned = cleaned.replace(/([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)\('([^']+)'/g, '$3: $2(\'$3\'');
    
    dbSchema += `\n// Schema: ${path.basename(path.dirname(path.dirname(schemaPath)))}\n${cleaned}\n`;
  }
}

const tsContent = `// Fichier généré automatiquement. Ne pas modifier manuellement.
export const HELP_DOCS = \`${helpDocs.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;

export const DB_SCHEMA = \`${dbSchema.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
`;

fs.writeFileSync(outputFilePath, tsContent);
console.log('Knowledge base built at src/ai-knowledge.ts');
