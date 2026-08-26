import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Mandatory Reference Data Business Codes required by application domain logic
//
// N.B. : on ne liste QUE ce dont le code a réellement besoin, pas un miroir du seed.
// La liste précédente recopiait toute la nomenclature comptable ; le jour où le seed
// a été réécrit, ce contrôle est devenu rouge en permanence sans rien protéger.
const REQUIRED_REFERENCE_CODES = {
  /*
   * « Virements Internes » n'est plus requis.
   *
   * Le code n'en dépend plus : un virement s'écrit en deux jambes `type='transfert'`, sans
   * catégorie — le CHECK de `ledger_entries` l'interdit. La catégorie ne subsiste que pour lire
   * les écritures que la migration `0023` n'a pas pu apparier, et la migration l'a désactivée.
   * L'exiger ici reviendrait à figer une donnée en voie de disparition.
   */
  categories: [],
  account_classes: ['60', '61', '62', '63', '64', '65', '70', '74', '75', '512', '517', '530'],
  accounts: ['current', 'savings', 'cash'],
  // Doit couvrir `paymentMethodsList` (libs/domains/shop/.../catalog-types.ts).
  payment_methods: ['virement', 'cheque', 'especes', 'cb', 'labaz', 'ancv', 'pass_sport', 'ticket_loisir', 'up_loisir']
};


/**
 * 1. Resolution of Drizzle Schema Glob (drizzle.config.ts)
 */
function checkSchemaResolution() {
  if (process.argv.includes('--test-fail-1')) {
    throw new Error('[schema-resolution] ÉCHEC SIMULÉ : Le glob de drizzle.config.ts ne résout aucun fichier (0 fichier trouvé).');
  }

  const configPath = path.join(ROOT_DIR, 'libs/shared/db/drizzle.config.ts');

  if (!fs.existsSync(configPath)) {
    throw new Error(`[schema-resolution] drizzle.config.ts non trouvé à ${configPath}`);
  }

  const content = fs.readFileSync(configPath, 'utf8');
  const schemaMatch = content.match(/schema:\s*['"]([^'"]+)['"]/);
  if (!schemaMatch) {
    throw new Error('[schema-resolution] Option "schema" absente dans drizzle.config.ts');
  }

  const schemaGlobPattern = schemaMatch[1];
  
  // Resolve schema files manually by walking libs directory for schema.ts
  const resolvedFiles = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === 'schema.ts') {
        resolvedFiles.push(path.relative(ROOT_DIR, fullPath));
      }
    }
  }

  walk(path.join(ROOT_DIR, 'libs'));

  if (resolvedFiles.length === 0) {
    throw new Error(`[schema-resolution] ÉCHEC : Le glob "${schemaGlobPattern}" de drizzle.config.ts ne résout aucun fichier (0 fichier trouvé).`);
  }

  console.log(`  ✓ 1. Résolution de schéma : ${resolvedFiles.length} fichier(s) schema.ts résolu(s) (${resolvedFiles.join(', ')})`);
  return resolvedFiles;
}

/**
 * 2. Single Table Declaration Source (Unicité des définitions de tables)
 */
function checkTableUniqueness(schemaFiles) {
  if (process.argv.includes('--test-fail-2')) {
    console.error('\n❌ [table-uniqueness] ÉCHEC : Table(s) physique(s) déclarée(s) dans plusieurs schema.ts !');
    console.error('  - Table "seasons" déclarée dans :\n    • libs/domains/members/shared/schema.ts\n    • libs/domains/accounting/shared/schema.ts');
    throw new Error('[table-uniqueness] Toute table doit être déclarée dans un seul schema.ts propriétaire.');
  }

  const tableDeclarations = new Map(); // tableName -> Set<filePath>


  for (const relPath of schemaFiles) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Match sqliteTable('table_name', ...) declarations
    const tableMatches = content.matchAll(/sqliteTable\s*\(\s*['"]([^'"]+)['"]/g);
    for (const match of tableMatches) {
      const tableName = match[1];
      if (!tableDeclarations.has(tableName)) {
        tableDeclarations.set(tableName, new Set());
      }
      tableDeclarations.get(tableName).add(relPath);
    }
  }

  const duplicateTables = [];
  for (const [tableName, files] of tableDeclarations.entries()) {
    if (files.size > 1) {
      duplicateTables.push({ tableName, files: Array.from(files) });
    }
  }

  if (duplicateTables.length > 0) {
    console.error('\n❌ [table-uniqueness] ÉCHEC : Table(s) physique(s) déclarée(s) dans plusieurs schema.ts !');
    duplicateTables.forEach(item => {
      console.error(`  - Table "${item.tableName}" déclarée dans :`);
      item.files.forEach(f => console.error(`    • ${f}`));
    });
    throw new Error('[table-uniqueness] Toute table doit être déclarée dans un seul schema.ts propriétaire. Utilisez "export { ... } from \'...\'" pour réexporter.');
  }

  console.log(`  ✓ 2. Unicité des tables : ${tableDeclarations.size} table(s) vérifiée(s), 0 duplication.`);
}

/**
 * 3. Schema Drift Check (Dérive du schéma)
 */
function checkSchemaDrift() {
  if (process.argv.includes('--test-fail-3')) {
    throw new Error('[schema-drift] ÉCHEC SIMULÉ : Dérive détectée ! drizzle-kit a généré la migration non vide "0002_new_column.sql".');
  }

  const migrationsDir = path.join(ROOT_DIR, 'libs/shared/db/migrations');

  const existingFiles = new Set(fs.readdirSync(migrationsDir));

  try {
    // Run drizzle-kit generate from ROOT_DIR
    execSync('npx drizzle-kit generate --config=libs/shared/db/drizzle.config.ts', {
      cwd: ROOT_DIR,
      stdio: 'pipe'
    });


    // Check for newly generated migration files
    const currentFiles = fs.readdirSync(migrationsDir);
    const newFiles = currentFiles.filter(f => !existingFiles.has(f));

    let hasNonEmptyDiff = false;
    let newMigrationName = '';

    for (const f of newFiles) {
      const filePath = path.join(migrationsDir, f);
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (content.length > 0) {
        hasNonEmptyDiff = true;
        newMigrationName = f;
      }
      // Clean up newly generated file
      fs.unlinkSync(filePath);
    }

    if (hasNonEmptyDiff) {
      throw new Error(`[schema-drift] ÉCHEC : Dérive détectée entre les modèles Drizzle et les migrations ! drizzle-kit a généré la migration non vide "${newMigrationName}".`);
    }

    console.log('  ✓ 3. Dérive de schéma : Aucune dérive entre les modèles Drizzle et les migrations SQL.');
  } catch (err) {
    if (err.message.includes('[schema-drift]')) throw err;
    throw new Error(`[schema-drift] Échec lors de la vérification de dérive : ${err.message}`);
  }
}

/**
 * 4. Constraint Loss Safeguard (Perte de contraintes)
 */
function checkConstraintLoss() {
  if (process.argv.includes('--test-fail-4')) {
    throw new Error('[constraint-loss] ÉCHEC SIMULÉ : Diminution des clés étrangères détectée ! Attendus minimum 6, trouvés 4.');
  }

  const baselinePath = path.join(ROOT_DIR, 'libs/shared/db/migrations/0000_baseline.sql');

  if (!fs.existsSync(baselinePath)) {
    throw new Error(`[constraint-loss] 0000_baseline.sql non trouvé à ${baselinePath}`);
  }

  const content = fs.readFileSync(baselinePath, 'utf8');

  // Count FOREIGN KEY, UNIQUE, and CHECK occurrences in baseline
  const fkMatches = (content.match(/FOREIGN KEY|REFERENCES/gi) || []).length;
  const uniqueMatches = (content.match(/UNIQUE/gi) || []).length;
  const checkMatches = (content.match(/CHECK\s*\(/gi) || []).length;

  // Seuils relevés au niveau réellement atteint par le baseline, moins une marge.
  // À 6, ce contrôle était décoratif : il aurait laissé passer la perte de trente
  // clés étrangères. Les FK sont volontairement intra-domaine (VSA, pas de SQL
  // inter-domaines), donc ce plancher ne doit monter qu'avec de vraies additions.
  const MIN_FK_COUNT = 60;
  const MIN_UNIQUE_COUNT = 40;
  const MIN_CHECK_COUNT = 2;

  // Check for override tag in recent git commit message
  let allowExemption = false;
  try {
    const commitMsg = execSync('git log -1 --pretty=%B', { cwd: ROOT_DIR, stdio: 'pipe' }).toString();
    if (commitMsg.includes('[allow-constraint-loss]')) {
      allowExemption = true;
      console.log('  ⚠️ Dérogation [allow-constraint-loss] détectée dans le message de commit.');
    }
  } catch {
    // Ignore git command error if not in git repo
  }

  if (!allowExemption) {
    if (fkMatches < MIN_FK_COUNT) {
      throw new Error(`[constraint-loss] ÉCHEC : Diminution des clés étrangères détectée ! Attendus minimum ${MIN_FK_COUNT}, trouvés ${fkMatches}.`);
    }
    if (uniqueMatches < MIN_UNIQUE_COUNT) {
      throw new Error(`[constraint-loss] ÉCHEC : Diminution des contraintes d'unicité détectée ! Attendus minimum ${MIN_UNIQUE_COUNT}, trouvés ${uniqueMatches}.`);
    }
    if (checkMatches < MIN_CHECK_COUNT) {
      throw new Error(`[constraint-loss] ÉCHEC : Diminution des contraintes CHECK détectée ! Attendus minimum ${MIN_CHECK_COUNT}, trouvés ${checkMatches}.`);
    }
  }

  console.log(`  ✓ 4. Perte de contraintes : ${fkMatches} FK, ${uniqueMatches} UNIQUE, ${checkMatches} CHECK vérifiés.`);
}

/**
 * 5. Reference Data Alignment (Données de référence)
 */
function checkReferenceData() {
  if (process.argv.includes('--test-fail-5')) {
    console.error('\n❌ [reference-data] ÉCHEC SIMULÉ : Code(s) métier de référence manquant(s) dans 0001_seed_reference_data.sql !');
    console.error('  - Table "categories" : code "virements_internes" manquant');
    throw new Error('[reference-data] Tout code métier requis par l\'application doit figurer dans les données de référence.');
  }

  const seedPath = path.join(ROOT_DIR, 'libs/shared/db/migrations/0001_seed_reference_data.sql');

  if (!fs.existsSync(seedPath)) {
    throw new Error(`[reference-data] 0001_seed_reference_data.sql non trouvé à ${seedPath}`);
  }

  const seedSql = fs.readFileSync(seedPath, 'utf8');
  const missingCodes = [];

  for (const [table, codes] of Object.entries(REQUIRED_REFERENCE_CODES)) {
    for (const code of codes) {
      if (!seedSql.includes(code)) {
        missingCodes.push({ table, code });
      }
    }
  }

  if (missingCodes.length > 0) {
    console.error('\n❌ [reference-data] ÉCHEC : Code(s) métier de référence manquant(s) dans 0001_seed_reference_data.sql !');
    missingCodes.forEach(item => {
      console.error(`  - Table "${item.table}" : code "${item.code}" manquant`);
    });
    throw new Error('[reference-data] Tout code métier requis par l\'application doit figurer dans les données de référence.');
  }

  console.log(`  ✓ 5. Données de référence : Tous les codes métiers requis sont présents dans 0001_seed_reference_data.sql.`);
}

/**
 * 6. Le virement interne ne se reconnaît plus à un libellé de catégorie.
 *
 * C'était la fragilité centrale de l'ancien modèle : l'exclusion des virements du compte de
 * résultat tenait à `adminLabel.startsWith('Virements Internes')`, sur une catégorie que l'écran
 * de configuration laisse renommer. La renommer en minuscules aurait fait remonter tous ces
 * mouvements en produits et en charges, sans le moindre message.
 *
 * La règle vit désormais dans `shared/entry-classification.ts`, et nulle part ailleurs. Ce
 * contrôle interdit qu'elle soit réécrite ailleurs, sous quelque forme que ce soit.
 */
function checkInternalTransferRule() {
  if (process.argv.includes('--test-fail-6')) {
    throw new Error("[internal-transfers] ÉCHEC SIMULÉ : reconnaissance d'un virement par libellé de catégorie.");
  }

  const OWNER = path.join('libs', 'domains', 'accounting', 'shared', 'entry-classification.ts');
  const offenders = [];

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.astro') continue;
        walk(full);
        continue;
      }
      if (!/\.(ts|svelte|astro)$/.test(entry.name)) continue;

      const relative = path.relative(ROOT_DIR, full);
      // Le module propriétaire de la règle, et le script d'audit qui lit l'historique.
      if (relative === OWNER || relative.includes('audit-internal-transfers')) continue;
      // `ai-knowledge.ts` recopie le centre d'aide : c'est de la documentation, pas une règle.
      if (relative.endsWith('ai-knowledge.ts')) continue;

      const content = fs.readFileSync(full, 'utf8');
      if (/(startsWith|includes)\(\s*['"`]Virements? [Ii]nternes?/.test(content)) {
        offenders.push(relative);
      }
    }
  };

  walk(path.join(ROOT_DIR, 'libs'));
  walk(path.join(ROOT_DIR, 'apps'));

  if (offenders.length > 0) {
    console.error("\n❌ [internal-transfers] ÉCHEC : un virement interne est reconnu à son libellé de catégorie.");
    offenders.forEach((f) => console.error(`  - ${f}`));
    console.error(`\n  La règle appartient à ${OWNER} (affectsProfitAndLoss) : renommer la catégorie`);
    console.error("  depuis l'écran de configuration ferait sinon remonter les virements au compte de résultat.");
    throw new Error('[internal-transfers] La qualification d\'un virement ne doit dépendre d\'aucun libellé.');
  }

  console.log('  ✓ 6. Virements internes : la règle vit dans entry-classification.ts, et nulle part ailleurs.');
}

function main() {
  console.log('🔍 Exécution des contrôles d\'intégrité de schéma (PROMPT 14)...\n');

  try {
    const schemaFiles = checkSchemaResolution();
    checkTableUniqueness(schemaFiles);
    checkSchemaDrift();
    checkConstraintLoss();
    checkReferenceData();
    checkInternalTransferRule();

    console.log('\n✅ [schema-check] TOUS LES CONTRÔLES DE SCHÉMA ONT RÉUSSI AVEC SUCCÈS !\n');
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Erreur de contrôle de schéma : ${err.message}\n`);
    process.exit(1);
  }
}

main();
