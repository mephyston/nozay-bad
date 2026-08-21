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

      // Rule 1 : hors du domaine members, personne ne touche à ses tables.
      //
      // La règle ne visait que `membersTable`. Cette table s'appelle désormais
      // `membershipsTable` et s'accompagne de `personsTable` : n'avoir renommé que la
      // première aurait laissé le garde-fou vert tout en ne couvrant plus rien — le
      // contrôle est une recherche textuelle, il ne connaît que les noms qu'on lui donne.
      const isTestFile = filename.endsWith('.test.ts') || filename.endsWith('.spec.ts');
      if (!isMembersDomain && !isSchemaFile && !isTestFile) {
        const hasMembersTable = /\b(membersTable|membershipsTable|personsTable)\b/.test(content);
        expect(hasMembersTable, `${relativePath} référence une table du domaine members`).toBe(false);
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

/**
 * Invariants du modèle d'autorisation.
 *
 * Ces règles ne se relisent pas : elles portent sur l'absence de quelque chose, et
 * une réapparition passerait inaperçue en revue. Chacune correspond à un défaut
 * réellement constaté avant la bascule RBAC.
 */
/**
 * `Astro.locals.runtime.env` a été retiré en Astro v6 : l'accès se fait par un
 * accesseur qui **lève**, y compris derrière un `?.`. Le storefront s'y est brûlé une
 * première fois — d'où `request-context.ts` — et le site public une seconde, avec des
 * 500 sur toutes les pages qui touchaient l'API.
 *
 * La lecture reste tolérée pour compatibilité, mais elle doit être protégée : tout
 * fichier qui y touche doit porter un `catch` et se rabattre sur `cloudflare:workers`.
 */
describe("Environnement d'exécution (Astro v6)", () => {
  it('ne lit jamais locals.runtime.env sans repli', () => {
    const violations: string[] = [];

    for (const dir of ['apps/admin/src', 'apps/storefront/src', 'apps/website/src']) {
      const root = path.resolve(__dirname, '..', dir);
      if (!fs.existsSync(root)) continue;

      for (const file of walkDir(root)) {
        if (!/\.(ts|astro|svelte)$/.test(file)) continue;
        const raw = fs.readFileSync(file, 'utf-8');
        // Les commentaires mentionnent le piège : ils ne doivent pas le déclencher.
        const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(\/\/|\*).*$/gm, '');
        if (!/runtime\??\.env/.test(code)) continue;
        if (!/\bcatch\b/.test(code)) violations.push(path.relative(path.resolve(__dirname, '..'), file));
      }
    }

    expect(
      violations,
      `lecture non protégée de locals.runtime.env — passer par resolveEnv() :\n${violations.join('\n')}`
    ).toEqual([]);
  });
});

describe('Autorisation (RBAC)', () => {
  const ROOT = path.resolve(__dirname, '..');
  const SEARCH_DIRS = [path.join(ROOT, 'apps'), path.join(ROOT, 'libs')];

  function sourceFiles(): { path: string; content: string }[] {
    const out: { path: string; content: string }[] = [];
    for (const dir of SEARCH_DIRS) {
      for (const file of walkDir(dir)) {
        if (!/\.(ts|svelte|astro)$/.test(file)) continue;
        if (file.includes('node_modules') || file.includes('/.wrangler/') || file.includes('/dist/')) continue;
        out.push({ path: path.relative(ROOT, file), content: fs.readFileSync(file, 'utf-8') });
      }
    }
    return out;
  }

  const files = sourceFiles();
  /** Code de production seul : un test a le droit de forger l'en-tête pour prouver
   *  qu'il n'accorde rien (cf. apps/api/src/authz/middleware.test.ts). */
  const productionFiles = files.filter((f) => !/\.test\.ts$/.test(f.path));

  it("ne transporte plus de permissions dans un en-tête HTTP", () => {
    // `x-user-permissions` portait une décision d'autorisation au lieu d'une
    // identité : l'autorisation vivait alors dans deux bases de code, et un proxy
    // qui oublie de nettoyer les en-têtes entrants suffisait à escalader. Les seules
    // occurrences admises sont les suppressions défensives.
    const offenders = productionFiles
      .filter((f) => f.content.includes('x-user-permissions'))
      .filter((f) => !/delete\(['"]x-user-permissions['"]\)/.test(f.content))
      .map((f) => f.path);
    expect(offenders, `x-user-permissions réapparu dans :\n${offenders.join('\n')}`).toEqual([]);
  });

  it('ne réintroduit pas le test de permission à jokers', () => {
    // `hasPermission` acceptait `accounting:*` mais pas l'inverse : cette asymétrie
    // imposait des chaînes `A || B || C` à chaque point de contrôle, dont chacune
    // était un endroit où une permission pouvait être oubliée.
    const offenders = files.filter((f) => /\bhasPermission\s*\(/.test(f.content)).map((f) => f.path);
    expect(offenders, `hasPermission réapparu dans :\n${offenders.join('\n')}`).toEqual([]);
  });

  it("n'autorise aucun domaine métier à dépendre du domaine iam", () => {
    // Un domaine qui a besoin de savoir qui agit est en train de décider d'une
    // autorisation, ce qui appartient à la seule table de routes de l'API.
    const offenders = files
      .filter((f) => f.path.startsWith('libs/domains/') && !f.path.startsWith('libs/domains/iam/'))
      .filter((f) => /from ['"][^'"]*iam(\/|-ui|['"])/.test(f.content))
      .map((f) => f.path);
    expect(offenders, `dépendance vers iam dans :\n${offenders.join('\n')}`).toEqual([]);
  });

  it("n'appelle jamais createApiClient directement depuis une page admin", () => {
    // Un appel sans identité serait refusé par l'API, mais passerait sur les routes
    // ouvertes à tout compte : les pages doivent passer par createAdminApiClient.
    const offenders = files
      .filter((f) => f.path.startsWith('apps/admin/src/pages/'))
      .filter((f) => /\bcreateApiClient\s*\(/.test(f.content))
      .map((f) => f.path);
    expect(offenders, `createApiClient appelé directement dans :\n${offenders.join('\n')}`).toEqual([]);
  });
});

/**
 * La surface publique d'un domaine suit-elle son vocabulaire ?
 *
 * `shared/public.ts` est ce qu'un Worker de rendu importe : le vocabulaire seul, sans
 * faire entrer Hono ni Drizzle dans son paquet. Un type déclaré dans `shared/blocks.ts`
 * et oublié dans ce barrel ne casse **rien** au premier abord — `import type` est effacé
 * à la compilation, `tsc --noEmit` ne relit pas les fichiers `.astro`, et aucun
 * `astro check` ne tourne en intégration. L'oubli s'est produit deux fois de suite, pour
 * `ColumnsBlock` puis `EventsBlock`, et n'a été vu qu'à la lecture.
 *
 * Le contrôle porte sur les **sources** : un type TypeScript n'existe plus à
 * l'exécution, il n'y a rien à interroger autrement.
 */
describe('surface publique des domaines', () => {
  const domainsDir = path.resolve(__dirname, './domains');
  const withPublicBarrel = (fs.existsSync(domainsDir) ? fs.readdirSync(domainsDir) : []).filter(
    (domain) => fs.existsSync(path.join(domainsDir, domain, 'shared/public.ts'))
  );

  it('couvre au moins un domaine', () => {
    // Garde-fou du garde-fou : si la découverte cessait de trouver quoi que ce soit, les
    // contrôles ci-dessous passeraient sur une liste vide sans rien vérifier.
    expect(withPublicBarrel.length).toBeGreaterThan(0);
  });

  it.each(withPublicBarrel)('%s réexporte le type de chaque bloc déclaré', (domain) => {
    const blocksPath = path.join(domainsDir, domain, 'shared/blocks.ts');
    if (!fs.existsSync(blocksPath)) return;

    const declared = [
      ...fs.readFileSync(blocksPath, 'utf-8').matchAll(/^export type ([A-Za-z]+Block) =/gm)
    ].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);

    const barrel = fs.readFileSync(path.join(domainsDir, domain, 'shared/public.ts'), 'utf-8');
    const missing = declared.filter((name) => !new RegExp(`\\b${name}\\b`).test(barrel));
    expect(missing, `types absents de ${domain}/shared/public.ts : ${missing.join(', ')}`).toEqual([]);
  });
});

/**
 * L'identité affichée est celle de la requête, jamais une adresse écrite dans le code.
 *
 * Le bandeau d'usurpation se lève sur `realEmail !== email` : il suffit qu'une page
 * oublie une des deux props pour que la comparaison porte sur un repli codé en dur et
 * que le bandeau s'affiche à des comptes qui n'ont emprunté personne — ce qu'il a fait
 * en production, en proposant de « revenir » vers le compte du jeu d'essai.
 */
describe("Identité affichée (admin)", () => {
  const ROOT = path.resolve(__dirname, '..');
  const ADMIN = path.join(ROOT, 'apps/admin/src');

  const adminViews = walkDir(ADMIN)
    .filter((f) => /\.(astro|svelte)$/.test(f))
    .filter((f) => !f.includes('/dist/'))
    .map((f) => ({ path: path.relative(ROOT, f), content: fs.readFileSync(f, 'utf-8') }));

  it('passe email ET realEmail à chaque AdminLayout', () => {
    const offenders: string[] = [];
    for (const file of adminViews) {
      for (const match of file.content.matchAll(/<AdminLayout\b[^>]*>/g)) {
        const tag = match[0];
        const missing = ['email', 'realEmail'].filter(
          (prop) => !new RegExp(`(^|\\s)${prop}=`).test(tag)
        );
        if (missing.length) offenders.push(`${file.path} (manque ${missing.join(', ')})`);
      }
    }
    expect(offenders, `AdminLayout sans identité complète :\n${offenders.join('\n')}`).toEqual([]);
  });

  it("ne code en dur aucune adresse du jeu d'essai dans une vue", () => {
    // Le repli d'authentification en développement (middleware.ts) reste légitime :
    // il choisit *qui* fait la requête. Une vue, elle, ne fait qu'afficher ce choix.
    const offenders = adminViews
      .filter((f) => /@nozaybad\.fr/.test(f.content))
      .map((f) => f.path);
    expect(offenders, `adresse en dur dans :\n${offenders.join('\n')}`).toEqual([]);
  });
});

/**
 * Le lien de l'agenda vers l'actualité qui annonce un rendez-vous.
 *
 * Il ne tient qu'à une prop transmise de la page jusqu'à la ligne d'événement : un
 * écran qui oublie de la passer n'affiche pas de lien, sans rien casser ni rien dire.
 * Le rapprochement lui-même est couvert par `announcementsByEvent` ; ce test ne
 * surveille que la plomberie, qui traverse quatre composants dans deux applications.
 */
describe("Lien agenda → actualité", () => {
  const ROOT = path.resolve(__dirname, '..');

  /** Usages d'un composant dans un dossier, avec la balise ouvrante complète. */
  function usages(dir: string, component: string): { path: string; tag: string }[] {
    const found: { path: string; tag: string }[] = [];
    for (const file of walkDir(path.join(ROOT, dir))) {
      if (!/\.astro$/.test(file) || file.includes('/dist/')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      for (const match of content.matchAll(new RegExp(`<${component}\\b[^>]*>`, 'g'))) {
        found.push({ path: path.relative(ROOT, file), tag: match[0] });
      }
    }
    return found;
  }

  it("transmet l'annonce à chaque ligne d'événement de l'espace adhérent", () => {
    const offenders = [
      ...usages('apps/storefront/src', 'EventRow'),
      ...usages('apps/storefront/src', 'AgendaCard')
    ]
      .filter(({ tag }) => !/announcement[=}]/.test(tag))
      .map(({ path: file }) => file);
    expect(offenders, `ligne d'agenda sans annonce dans :\n${offenders.join('\n')}`).toEqual([]);
  });

  it("transmet les annonces au bloc agenda du site public", () => {
    const offenders = usages('apps/website/src', 'Events')
      .filter(({ tag }) => !/announcements[=}]/.test(tag))
      .map(({ path: file }) => file);
    expect(offenders, `bloc agenda sans annonces dans :\n${offenders.join('\n')}`).toEqual([]);
  });
});
