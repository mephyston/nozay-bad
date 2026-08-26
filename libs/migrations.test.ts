import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';
import { ROLES, ROLE_PERMISSIONS } from './domains/iam/shared/roles';

const MIGRATIONS_DIR = path.resolve(__dirname, './shared/db/migrations');

function readStatements(file: string): string[] {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
  return sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Toutes les migrations livrées, dans l'ordre. */
const ALL_MIGRATIONS = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort();

/**
 * Rejeu intégral des migrations contre SQLite.
 *
 * Le baseline est produit par `drizzle-kit generate` depuis les modèles, mais le SQL
 * livré est ce qui s'exécute réellement sur D1 : on le rejoue plutôt que de faire
 * confiance au générateur.
 */
describe('migrations livrées', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    for (const file of ALL_MIGRATIONS) {
      for (const statement of readStatements(file)) db.exec(statement);
    }
  });

  it("s'appliquent de bout en bout sur une base vide", () => {
    const { n } = db
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .get() as { n: number };
    // Le compte exact vit dans les modèles ; ce qui est vérifié ici, c'est qu'aucune
    // instruction n'échoue et que le schéma n'est pas vide.
    expect(n).toBeGreaterThan(30);
  });

  it('sont rejouables : réappliquer le seed ne casse rien', () => {
    // Le fichier de données de référence est en `INSERT OR IGNORE` précisément pour
    // pouvoir repasser sur une base qui porte déjà ces lignes — c'est ce qui rend une
    // réinjection de sauvegarde possible.
    const seedFile = ALL_MIGRATIONS.find((f) => f.includes('seed_reference_data'));
    expect(seedFile, 'aucun fichier de données de référence trouvé').toBeDefined();
    expect(() => {
      for (const statement of readStatements(seedFile!)) db.exec(statement);
    }).not.toThrow();
  });
});

/**
 * Droits par rôle semés dans une base neuve.
 *
 * Les blocs de valeurs sont générés depuis `ROLE_PERMISSIONS`. Ce test vérifie qu'ils
 * n'en ont pas divergé depuis : sans lui, un rôle modifié en code laisserait toute
 * nouvelle base semée avec l'ancienne définition, silencieusement.
 */
describe('droits par rôle — valeurs de départ', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    for (const file of ALL_MIGRATIONS) {
      for (const statement of readStatements(file)) db.exec(statement);
    }
  });

  function seeded(role: string): string[] {
    return (
      db.prepare('SELECT permission FROM role_permissions WHERE role = ? ORDER BY permission').all(role) as {
        permission: string;
      }[]
    ).map((r) => r.permission);
  }

  it('correspond exactement au code pour chaque rôle éditable', () => {
    for (const role of ROLES) {
      if (role === 'super_admin') continue;
      expect(seeded(role), `le seed a divergé du code pour ${role}`).toEqual(
        [...ROLE_PERMISSIONS[role]].sort()
      );
    }
  });

  it("ne sème pas super_admin, qui reste calculé", () => {
    // Figé en base, il n'obtiendrait pas les permissions ajoutées par les
    // fonctionnalités futures, et perdre son droit d'édition verrouillerait tout.
    expect(seeded('super_admin')).toEqual([]);
  });

  it('refuse deux fois le même droit pour un rôle', () => {
    expect(() =>
      db.exec("INSERT INTO role_permissions (role, permission, created_at) VALUES ('membre','help:docs:read',0)")
    ).toThrow();
  });

  it('ouvre un journal des modifications, vide au départ', () => {
    const n = (db.prepare('SELECT COUNT(*) AS n FROM role_permission_log').get() as { n: number }).n;
    expect(n).toBe(0);
  });
});

/**
 * Référentiels métier.
 *
 * Les codes eux-mêmes sont vérifiés par `scripts/check-schema-integrity.js`, qui lit le
 * fichier de seed. Ici on vérifie qu'ils atterrissent bien en base — un `INSERT OR
 * IGNORE` silencieusement en échec sur une contrainte passerait sinon inaperçu.
 */
describe('données de référence', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    for (const file of ALL_MIGRATIONS) {
      for (const statement of readStatements(file)) db.exec(statement);
    }
  });

  it.each([
    ['account_classes', 'code', ['60', '512', '530']],
    ['payment_methods', 'code', ['virement', 'cheque', 'especes']],
    ['accounts', 'code', ['current', 'savings', 'cash']]
  ])('sème %s', (table, column, codes) => {
    const rows = db.prepare(`SELECT ${column} AS code FROM ${table}`).all() as { code: string }[];
    const present = rows.map((r) => r.code);
    for (const code of codes as string[]) expect(present).toContain(code);
  });

  it('désactive la catégorie des virements internes, que plus aucune règle ne consulte', () => {
    /*
     * L'inverse exact de ce que ce test vérifiait.
     *
     * Il exigeait la présence du libellé, parce que `get-season-reports` filtrait dessus : le
     * renommer aurait fait rentrer les virements dans le compte de résultat. C'était constater la
     * fragilité, pas la corriger. Un virement s'écrit maintenant en deux jambes `type='transfert'`
     * sans catégorie, la migration `0023` a désactivé celle-ci, et plus aucun agrégat ne s'y fie.
     * Elle ne subsiste que pour les écritures que l'appariement n'a pas pu convertir.
     */
    const rows = db
      .prepare("SELECT admin_label, active FROM categories WHERE lower(admin_label) LIKE '%virement%interne%'")
      .all() as { admin_label: string; active: number }[];

    for (const row of rows) expect(row.active).toBe(0);
  });

  it('sème le moyen de paiement dédié aux virements internes', () => {
    /*
     * `payment_methods.default_entry_status` détermine le statut d'une écriture à la saisie. Un
     * virement héritait de la méthode restée dans le formulaire, donc parfois d'un `in_vault`
     * dépourvu de sens que le calcul de solde ignorait sans le dire.
     */
    const row = db
      .prepare("SELECT default_entry_status FROM payment_methods WHERE code = 'virement_interne'")
      .get() as { default_entry_status: string } | undefined;

    expect(row?.default_entry_status).toBe('cleared');
  });

  it("garantit qu'un virement se tient en deux jambes, et pas une de plus", () => {
    /*
     * L'index unique est la seule moitié de l'invariant que SQLite sait tenir : « au plus une
     * jambe de chaque sens ». Que la paire soit complète et de montants égaux relève de
     * l'applicatif — mais qu'on ne puisse pas écrire deux jambes source sur le même virement doit
     * être vrai en base, sans quoi un rapprochement pourrait porter sur une moitié fantôme.
     */
    const idx = db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'internal_transfer_leg_idx'")
      .get() as { sql: string } | undefined;

    expect(idx?.sql).toContain('transfer_id');
    expect(idx?.sql).toContain('transfer_leg');
  });
});

/**
 * Le déclenchement des migrations D1 en CI n'a **aucun mécanisme dédié**. Il repose
 * entièrement sur une adjacence de chemins : `migrations/` se trouve sous le
 * `projectRoot` du projet Nx `@nba/db`, dont `api` dépend — donc toute modification
 * d'un `.sql` marque `api` comme affecté, et le job `deploy-api` joue
 * `wrangler d1 migrations apply`.
 *
 * Déplacer `migrations/` ailleurs (à la racine, par exemple, le jour où drizzle-kit est
 * reconfiguré) romprait ce lien **en silence** : la CI resterait verte, les migrations
 * ne partiraient plus, et on ne s'en apercevrait qu'au premier 500 en production.
 */
describe('couplage migrations ↔ déploiement', () => {
  const DB_LIB_DIR = path.resolve(__dirname, './shared/db');

  it('les migrations vivent sous le projectRoot du projet Nx @nba/db', () => {
    expect(fs.existsSync(path.join(DB_LIB_DIR, 'project.json'))).toBe(true);

    const relative = path.relative(DB_LIB_DIR, MIGRATIONS_DIR);
    expect(relative.startsWith('..')).toBe(false);
    expect(path.isAbsolute(relative)).toBe(false);
  });

  it('api importe @nba/db hors tests, et hérite donc de son affectation', () => {
    const apiSrc = path.resolve(__dirname, '../apps/api/src');
    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts') && !entry.name.includes('.test.')) {
          sources.push(full);
        }
      }
    };
    walk(apiSrc);

    const importsDb = sources.some((file) =>
      /from ['"]@nba\/db['"]/.test(fs.readFileSync(file, 'utf-8'))
    );
    expect(importsDb).toBe(true);
  });
});
