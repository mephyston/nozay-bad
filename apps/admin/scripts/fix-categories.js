import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const helpDir = path.join(__dirname, '../src/content/help');

const files = fs.readdirSync(helpDir);

for (const file of files) {
  if (!file.endsWith('.md')) continue;
  
  const filePath = path.join(helpDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  content = content.replace(/category: "Général"/, 'category: "admin"');
  content = content.replace(/category: "Adhérents"/, 'category: "adherents"');
  content = content.replace(/category: "Comptabilité"/, 'category: "comptabilite"');
  content = content.replace(/category: "Boutique"/, 'category: "boutique"');
  content = content.replace(/category: "Réglages"/, 'category: "admin"');

  fs.writeFileSync(filePath, content);
}

console.log('Categories fixed!');
