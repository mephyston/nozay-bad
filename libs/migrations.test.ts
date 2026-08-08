import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.resolve(__dirname, './shared/db/migrations');

function readStatements(file: string): string[] {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
  return sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Reprise de données de la migration 0012 (permissions à jokers → rôles).
 *
 * Une reprise ne se rejoue pas : elle s'exécute une fois, en production, sur des
 * comptes réels. On la vérifie donc ici en rejouant les vraies instructions SQL du
 * fichier de migration contre des comptes fictifs représentatifs, plutôt que de la
 * relire à l'œil.
 */
describe('0012_iam_roles — reprise des permissions vers des rôles', () => {
  let db: DatabaseSync;

  /** Schéma de `admin_users` tel qu'il existe juste avant 0012 (migration 0003). */
  const ADMIN_USERS_BEFORE_0012 = `
    CREATE TABLE admin_users (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      email text NOT NULL,
      name text NOT NULL,
      permissions text DEFAULT '[]' NOT NULL,
      created_at integer NOT NULL
    );
    CREATE UNIQUE INDEX admin_users_email_unique ON admin_users (email);
  `;

  function seed(email: string, permissions: string[]): void {
    db.prepare('INSERT INTO admin_users (email, name, permissions, created_at) VALUES (?, ?, ?, 0)').run(
      email,
      email.split('@')[0],
      JSON.stringify(permissions)
    );
  }

  /**
   * Compte portant l'ancien joker global.
   *
   * Les tests qui vérifient une correspondance précise en ont besoin : sans lui, le
   * filet de dernier recours promeut le plus ancien compte en super administrateur
   * et brouille l'assertion. Ce filet a son propre test.
   */
  function seedExistingSuperAdmin(): void {
    seed('boss@nozaybad.fr', ['*']);
  }

  function rolesOf(email: string): string[] {
    const rows = db
      .prepare(
        'SELECT r.role FROM admin_user_roles r JOIN admin_users u ON u.id = r.user_id WHERE u.email = ? ORDER BY r.role'
      )
      .all(email) as { role: string }[];
    return rows.map((r) => r.role);
  }

  function runMigration(): void {
    for (const statement of readStatements('0012_iam_roles.sql')) db.exec(statement);
  }

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(ADMIN_USERS_BEFORE_0012);
  });

  it('donne super_admin au porteur du joker global', () => {
    seed('boss@nozaybad.fr', ['*']);
    runMigration();
    expect(rolesOf('boss@nozaybad.fr')).toEqual(['super_admin']);
  });

  it("ne confond pas le joker global avec un joker de domaine", () => {
    seedExistingSuperAdmin();
    // `accounting:*` ne doit pas être lu comme `*` : c'est tout l'enjeu du motif
    // `'%"*"%'`, dont le caractère précédant l'étoile est un guillemet.
    seed('compta@nozaybad.fr', ['accounting:*']);
    runMigration();
    expect(rolesOf('compta@nozaybad.fr')).toEqual(['tresorier']);
  });

  it('donne tresorier sur une écriture comptable', () => {
    seedExistingSuperAdmin();
    seed('tresor@nozaybad.fr', ['accounting:invoices', 'members:read']);
    runMigration();
    expect(rolesOf('tresor@nozaybad.fr')).toContain('tresorier');
  });

  it('donne tresorier sur la gestion des notes de frais', () => {
    seedExistingSuperAdmin();
    seed('frais@nozaybad.fr', ['expenses:validate']);
    runMigration();
    expect(rolesOf('frais@nozaybad.fr')).toEqual(['tresorier']);
  });

  it("ne promeut pas en tresorier sur une simple lecture comptable", () => {
    seedExistingSuperAdmin();
    // Le cas réel qui a motivé le resserrement : `accounting:reports` est une
    // lecture, et `tresorier` ouvrirait le grand livre en écriture.
    seed('coach@nozaybad.fr', ['accounting:reports', 'shop:products', 'members:read']);
    runMigration();
    expect(rolesOf('coach@nozaybad.fr')).toEqual(['secretaire']);
  });

  it('donne secretaire sur les adhérents, la communication ou la boutique', () => {
    seedExistingSuperAdmin();
    seed('secret@nozaybad.fr', ['members:*', 'notifications:read']);
    runMigration();
    expect(rolesOf('secret@nozaybad.fr')).toEqual(['secretaire']);
  });

  it('donne president sur la gestion des accès', () => {
    seedExistingSuperAdmin();
    seed('presi@nozaybad.fr', ['iam:*']);
    runMigration();
    expect(rolesOf('presi@nozaybad.fr')).toContain('president');
  });

  it('cumule les rôles quand les anciens droits couvraient plusieurs métiers', () => {
    seedExistingSuperAdmin();
    seed('cumul@nozaybad.fr', ['accounting:*', 'members:*', 'iam:*']);
    runMigration();
    expect(rolesOf('cumul@nozaybad.fr')).toEqual(['president', 'secretaire', 'tresorier']);
  });

  it('désigne un super administrateur si la reprise n’en a produit aucun', () => {
    // Sans ce filet, une base dont aucun compte ne portait le joker global se
    // retrouverait sans personne pouvant attribuer de rôle : la gestion des accès
    // serait close définitivement, sans recours depuis l'interface.
    seed('ancien@nozaybad.fr', ['members:read']);
    seed('recent@nozaybad.fr', ['shop:products']);
    runMigration();

    expect(rolesOf('ancien@nozaybad.fr')).toContain('super_admin');
    expect(rolesOf('recent@nozaybad.fr')).not.toContain('super_admin');
  });

  it("n'en désigne qu'un seul, et seulement en dernier recours", () => {
    seed('boss@nozaybad.fr', ['*']);
    seed('autre@nozaybad.fr', ['members:read']);
    runMigration();

    const supers = (db.prepare(
      "SELECT COUNT(*) AS n FROM admin_user_roles WHERE role = 'super_admin'"
    ).get() as { n: number }).n;
    expect(supers).toBe(1);
    expect(rolesOf('boss@nozaybad.fr')).toEqual(['super_admin']);
  });

  it('ne laisse aucun compte sans rôle', () => {
    seedExistingSuperAdmin();
    // Sans ce filet, un compte aux droits vides perdrait tout accès — y compris le
    // tableau de bord — sans que personne ne l'ait décidé.
    seed('vide@nozaybad.fr', []);
    seed('inconnu@nozaybad.fr', ['quelque:chose:dautre']);
    runMigration();
    expect(rolesOf('vide@nozaybad.fr')).toEqual(['membre']);
    expect(rolesOf('inconnu@nozaybad.fr')).toEqual(['membre']);
  });

  it("n'ajoute pas « membre » à un compte qui a déjà un rôle", () => {
    seed('boss@nozaybad.fr', ['*']);
    runMigration();
    expect(rolesOf('boss@nozaybad.fr')).not.toContain('membre');
  });

  it('est idempotente sur la partie reprise (INSERT OR IGNORE)', () => {
    seed('boss@nozaybad.fr', ['*']);
    runMigration();
    // Rejouer uniquement les INSERT : les ALTER/CREATE ne sont pas rejouables, mais
    // l'unicité (user_id, role) doit absorber une reprise relancée à la main.
    for (const statement of readStatements('0012_iam_roles.sql')) {
      if (statement.toUpperCase().startsWith('INSERT')) db.exec(statement);
    }
    expect(rolesOf('boss@nozaybad.fr')).toEqual(['super_admin']);
  });

  it('supprime les rôles avec le compte (ON DELETE CASCADE)', () => {
    seed('boss@nozaybad.fr', ['*']);
    runMigration();
    db.exec('PRAGMA foreign_keys = ON');
    db.prepare('DELETE FROM admin_users WHERE email = ?').run('boss@nozaybad.fr');
    const remaining = db.prepare('SELECT COUNT(*) AS n FROM admin_user_roles').get() as { n: number };
    expect(remaining.n).toBe(0);
  });
});
