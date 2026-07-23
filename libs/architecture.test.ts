import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Helper to recursively walk a directory and return all files
function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Helper to get immediate subdirectories of a path
function getImmediateSubdirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(file => {
    const filePath = path.join(dir, file);
    return fs.statSync(filePath).isDirectory();
  });
}

describe('Domain Architecture Validation', () => {
  const domainsDir = path.resolve(__dirname, './domains');
  const allDomainDirs = fs.existsSync(domainsDir)
    ? fs.readdirSync(domainsDir).filter(file => fs.statSync(path.join(domainsDir, file)).isDirectory())
    : [];

  it('Rule 6: No api/, data-access/, or ui/ directory exists directly at the root of a domain', () => {
    const forbidden = ['api', 'data-access', 'ui'];
    for (const domain of allDomainDirs) {
      const domainPath = path.join(domainsDir, domain);
      const subdirs = getImmediateSubdirs(domainPath);
      for (const subdir of subdirs) {
        expect(forbidden).not.toContain(subdir);
      }
    }
  });

  it('Layering and dependency checks across domain directories', () => {
    const allFiles = walkDir(domainsDir);
    const fileContents: { [filePath: string]: string } = {};
    const declaredRepoInterfaces: { name: string; file: string }[] = [];

    // Parse all files first
    for (const filePath of allFiles) {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.js') && !filePath.endsWith('.svelte')) {
        continue;
      }
      const relativePath = path.relative(domainsDir, filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      fileContents[filePath] = content;

      const filename = path.basename(filePath);
      const isMembersDomain = relativePath.startsWith('members/') || relativePath.startsWith('members\\');
      const isSchemaFile = filename === 'schema.ts';
      const isHandlerFile = filename === 'handler.ts';
      const isRouteFile = filename === 'route.ts';
      const isQuery = relativePath.includes('/queries/') || relativePath.includes('\\queries\\');

      // Extract declared RepositoryInterfaces
      const interfaceMatches = content.matchAll(/\binterface\s+(\w+RepositoryInterface)\b/g);
      for (const match of interfaceMatches) {
        declaredRepoInterfaces.push({ name: match[1], file: filePath });
      }

      // Rule 1: A file outside members/ imports membersTable (except references of FK in schema.ts)
      if (!isMembersDomain && !isSchemaFile) {
        const hasMembersTable = /\bmembersTable\b/.test(content);
        expect(hasMembersTable).toBe(false);
      }

      // Rule 2: A handler.ts under queries/ contains db.transaction
      if (isHandlerFile && isQuery) {
        const hasTransaction = /\bdb\.transaction\b/.test(content);
        expect(hasTransaction).toBe(false);
      }

      // Rule 3: A route.ts imports drizzle-orm (except client instantiation)
      if (isRouteFile) {
        const drizzleImports = content.match(/import\s+.*from\s+['"]drizzle-orm[^'"]*['"]/g);
        if (drizzleImports) {
          for (const imp of drizzleImports) {
            const curlyMatch = imp.match(/{([^}]+)}/);
            let isValid = false;
            if (curlyMatch) {
              const symbols = curlyMatch[1].split(',').map(s => s.trim());
              isValid = symbols.every(s => s === 'drizzle');
            } else {
              isValid = /\bimport\s+drizzle\s+from\b/.test(imp);
            }
            expect(isValid, `Violation of Rule 3 in ${relativePath}: "${imp}"`).toBe(true);
          }
        }
      }

      // Rule 4: A handler.ts imports hono
      if (isHandlerFile) {
        const importsHono = /\bfrom ['"]hono[^'"]*['"]/.test(content);
        expect(importsHono).toBe(false);
      }
    }

    // Rule 5: A RepositoryInterface is declared but neither implemented (implements) nor imported elsewhere
    for (const { name, file } of declaredRepoInterfaces) {
      let isUsed = false;
      for (const [filePath, content] of Object.entries(fileContents)) {
        if (filePath === file) {
          // Check if used in its own file (other than declaration)
          const occurrences = (content.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
          if (occurrences > 1) {
            isUsed = true;
            break;
          }
        } else {
          // Check if referenced/imported in another file
          if (content.includes(name)) {
            isUsed = true;
            break;
          }
        }
      }
      expect(isUsed).toBe(true);
    }
  });
});
