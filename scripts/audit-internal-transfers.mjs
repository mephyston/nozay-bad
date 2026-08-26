#!/usr/bin/env node
/**
 * Audit préalable à la bascule des virements internes vers deux jambes liées.
 *
 * Le même événement — de l'argent qui passe d'un compte du club à un autre — est
 * aujourd'hui stocké de deux façons :
 *
 *   1. une écriture `type='transfert'` portant ses deux comptes (le modèle canonique) ;
 *   2. **deux** écritures `recette`/`depense` portant la catégorie « Virements Internes »,
 *      sans rien qui les relie.
 *
 * La seconde n'est pas un héritage : c'est ce que le rapprochement bancaire fabrique
 * (`reconciliation-api.ts` ne crée jamais de `transfert`), parce qu'une écriture unique ne
 * peut pointer qu'une ligne de relevé alors qu'un virement inter-bancaire en produit deux.
 *
 * La migration `0023` convertit les deux populations. La première est déterministe. La
 * seconde ne l'est pas : rien ne dit quelle recette répond à quelle dépense. Ce script
 * apparie ce qui est appariable et **isole ce qui ne l'est pas**, pour que la décision
 * revienne au trésorier et non à une heuristique.
 *
 * **Lecture seule.** Il n'écrit rien, jamais, dans aucun environnement.
 *
 *   node scripts/audit-internal-transfers.mjs --env=local
 *   node scripts/audit-internal-transfers.mjs --env=production
 *   node scripts/audit-internal-transfers.mjs --env=production --json=/tmp/audit.json
 *
 * Après la migration, `--verify` contrôle les invariants que SQLite ne sait pas tenir : qu'un
 * virement ait exactement deux jambes, de montants égaux, sur deux comptes distincts.
 *
 *   node scripts/audit-internal-transfers.mjs --env=production --verify
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const ENV = args.env ?? 'local';

/** Fenêtre d'appariement : au-delà, deux mouvements de même montant ne sont plus la même opération. */
const WINDOW_DAYS = Number(args.window ?? 7);

const TARGETS = {
  local: { db: 'nba-db', flags: ['--local'] },
  staging: { db: 'nba-db-staging', flags: ['--remote', '--env', 'staging'] },
  production: { db: 'nba-db', flags: ['--remote'] }
};

const target = TARGETS[ENV];
if (!target) {
  console.error(`--env doit valoir ${Object.keys(TARGETS).join(', ')}`);
  process.exit(1);
}

/** Lecture D1 via wrangler : le seul chemin qui vaut en local comme à distance. */
function query(sql) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', target.db, '--config', 'apps/api/wrangler.json',
     ...target.flags, '--json', '--command', sql],
    { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }
  );
  // wrangler préfixe parfois la sortie de lignes d'information : on repart du premier `[`.
  const json = out.slice(out.indexOf('['));
  return JSON.parse(json)[0]?.results ?? [];
}

const dayNumber = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
const euros = (cents) => (cents / 100).toFixed(2).padStart(10) + ' €';

/**
 * Les invariants du modèle à deux jambes, vérifiés sur la base.
 *
 * L'index unique `(transfer_id, transfer_leg)` garantit « au plus une jambe de chaque sens », et
 * le CHECK garantit qu'une écriture de virement appartient bien à un virement. Le reste — que la
 * paire soit **complète**, de montants égaux, sur deux comptes différents — ne se contraint pas en
 * SQLite : une contrainte ne peut pas compter les lignes d'une autre table. C'est donc ici.
 */
function verify() {
  console.log(`\n=== Invariants des virements internes — environnement ${ENV} ===\n`);

  const checks = [
    {
      label: 'Tout virement a exactement deux jambes',
      sql: `SELECT it.id, it.reference, COUNT(le.id) AS n
            FROM internal_transfers it LEFT JOIN ledger_entries le ON le.transfer_id = it.id
            GROUP BY it.id HAVING n <> 2`
    },
    {
      label: 'Les deux jambes portent le même montant',
      sql: `SELECT it.id, it.reference, COUNT(DISTINCT le.amount_cents) AS montants
            FROM internal_transfers it JOIN ledger_entries le ON le.transfer_id = it.id
            GROUP BY it.id HAVING montants <> 1`
    },
    {
      label: 'Les deux jambes touchent deux comptes différents',
      sql: `SELECT it.id, it.reference, COUNT(DISTINCT le.account_id) AS comptes
            FROM internal_transfers it JOIN ledger_entries le ON le.transfer_id = it.id
            GROUP BY it.id HAVING comptes <> 2`
    },
    {
      label: 'Aucune écriture ne porte encore la catégorie héritée',
      sql: `SELECT le.id, le.date, le.description FROM ledger_entries le
            WHERE le.category_id IN (SELECT id FROM categories WHERE lower(admin_label) LIKE '%virement%interne%')`
    },
    {
      label: "Aucun virement n'a une seule jambe pointée",
      sql: `SELECT it.id, it.reference FROM internal_transfers it
            JOIN ledger_entries le ON le.transfer_id = it.id
            GROUP BY it.id
            HAVING COUNT(le.bank_statement_line_id) = 1 AND COUNT(le.id) = 2`
    }
  ];

  let failures = 0;
  for (const check of checks) {
    const rows = query(check.sql);
    if (rows.length === 0) {
      console.log(`  ✅ ${check.label}`);
    } else {
      failures += rows.length;
      console.log(`  ❌ ${check.label} — ${rows.length} cas :`);
      for (const row of rows.slice(0, 20)) console.log(`       ${JSON.stringify(row)}`);
      if (rows.length > 20) console.log(`       … et ${rows.length - 20} de plus`);
    }
  }

  console.log(failures === 0 ? '\n✅ Tous les invariants tiennent.\n' : `\n⛔ ${failures} anomalie(s).\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

function main() {
  if (args.verify) return verify();

  const accounts = query(`SELECT id, code, label FROM accounts`);
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const name = (id) => accountById.get(id)?.label ?? `#${id}`;

  /*
   * La catégorie est reconnue au libellé, comme partout ailleurs dans le dépôt — c'est
   * précisément la fragilité que la migration fait disparaître. On élargit donc la
   * reconnaissance ici, pour ne pas rater une base où elle aurait été renommée.
   */
  const [category] = query(
    `SELECT id, admin_label FROM categories
     WHERE lower(admin_label) LIKE '%virement%interne%' OR lower(adherent_label) LIKE '%virement%interne%'`
  );

  console.log(`\n=== Audit des virements internes — environnement ${ENV} ===\n`);

  // --- Population 1 : les transferts canoniques -----------------------------------
  const canonical = query(
    `SELECT le.id, le.season_id, le.date, le.amount_cents, le.account_id,
            le.destination_account_id, le.status, le.bank_statement_line_id, le.description
     FROM ledger_entries le WHERE le.type = 'transfert' ORDER BY le.date, le.id`
  );

  console.log(`— Population 1 : ${canonical.length} écriture(s) \`type='transfert'\``);
  console.log('  Conversion déterministe : une écriture → un virement + deux jambes.');
  const canonicalPointed = canonical.filter((e) => e.bank_statement_line_id !== null).length;
  if (canonicalPointed > 0) {
    console.log(`  Dont ${canonicalPointed} déjà pointée(s) : le pointage ira sur la jambe source.`);
  }

  if (!category) {
    console.log('\n— Population 2 : aucune catégorie « Virement interne » en base. Rien à apparier.');
    console.log('\nAudit terminé : la migration peut se limiter à la population 1.\n');
    return;
  }

  // --- Population 2 : les recette/dépense catégorisées ----------------------------
  const legs = query(
    `SELECT le.id, le.season_id, le.type, le.date, le.amount_cents, le.account_id,
            le.status, le.bank_statement_line_id, le.member_id, le.invoice_id, le.description
     FROM ledger_entries le WHERE le.category_id = ${category.id} ORDER BY le.date, le.id`
  );

  console.log(`\n— Population 2 : ${legs.length} écriture(s) en catégorie « ${category.admin_label} »`);

  const debits = legs.filter((e) => e.type === 'depense');
  const credits = legs.filter((e) => e.type === 'recette');

  /*
   * Appariement par candidat unique, jamais par « le plus proche ».
   *
   * Prendre le meilleur candidat quand il y en a plusieurs reviendrait à trancher à la
   * place du trésorier sur les seuls cas où la réponse n'est pas évidente. Un débit qui a
   * deux contreparties plausibles part donc en arbitrage, pas en migration.
   */
  const pairs = [];
  const ambiguous = [];
  const takenCredits = new Set();

  for (const debit of debits) {
    const candidates = credits.filter(
      (c) =>
        !takenCredits.has(c.id) &&
        c.amount_cents === debit.amount_cents &&
        c.account_id !== debit.account_id &&
        c.season_id === debit.season_id &&
        Math.abs(dayNumber(c.date) - dayNumber(debit.date)) <= WINDOW_DAYS
    );

    if (candidates.length === 1) {
      takenCredits.add(candidates[0].id);
      pairs.push({ source: debit, destination: candidates[0] });
    } else if (candidates.length > 1) {
      ambiguous.push({ entry: debit, candidates });
    }
  }

  const orphans = [
    ...debits.filter((d) => !pairs.some((p) => p.source.id === d.id) && !ambiguous.some((a) => a.entry.id === d.id)),
    ...credits.filter((c) => !takenCredits.has(c.id))
  ].sort((a, b) => a.date.localeCompare(b.date));

  console.log(`  ${pairs.length} paire(s) sans ambiguïté  → converties par la migration`);
  console.log(`  ${ambiguous.length} écriture(s) à contrepartie multiple → arbitrage requis`);
  console.log(`  ${orphans.length} orpheline(s) (aucune contrepartie) → arbitrage requis`);

  if (pairs.length > 0) {
    console.log('\n  Paires retenues :');
    for (const { source, destination } of pairs) {
      console.log(
        `    #${String(source.id).padEnd(5)} ${source.date} ${euros(source.amount_cents)}  ` +
          `${name(source.account_id)} → ${name(destination.account_id)}  (crédit #${destination.id} le ${destination.date})`
      );
    }
  }

  if (ambiguous.length > 0) {
    console.log('\n  ⚠ Contreparties multiples — à trancher avant la migration :');
    for (const { entry, candidates } of ambiguous) {
      console.log(`    #${entry.id} ${entry.date} ${euros(entry.amount_cents)} ${name(entry.account_id)} — « ${entry.description} »`);
      for (const c of candidates) {
        console.log(`        candidat #${c.id} ${c.date} ${name(c.account_id)} — « ${c.description} »`);
      }
    }
  }

  if (orphans.length > 0) {
    console.log('\n  ⚠ Sans contrepartie — soit la jambe manque, soit ce n\'est pas un virement :');
    for (const e of orphans) {
      console.log(
        `    #${String(e.id).padEnd(5)} ${e.date} ${e.type.padEnd(8)} ${euros(e.amount_cents)} ` +
          `${name(e.account_id)} — « ${e.description} »`
      );
    }
  }

  // --- Ce que la conversion ne doit pas perdre ------------------------------------
  const withMember = legs.filter((e) => e.member_id !== null);
  const withInvoice = legs.filter((e) => e.invoice_id !== null);
  if (withMember.length > 0 || withInvoice.length > 0) {
    console.log(
      `\n  ⚠ ${withMember.length} écriture(s) rattachée(s) à une adhésion et ${withInvoice.length} à une facture.`
    );
    console.log("     Un virement interne ne concerne ni l'une ni l'autre : ce rattachement est à instruire,");
    console.log('     la conversion en jambe le perdrait.');
  }

  const blocking = ambiguous.length + orphans.length;
  console.log(
    blocking === 0
      ? '\n✅ Aucun arbitrage en attente : la migration 0023 peut être appliquée.\n'
      : `\n⛔ ${blocking} cas à instruire avant d'appliquer la migration 0023.\n`
  );

  if (args.json) {
    writeFileSync(args.json, JSON.stringify({ env: ENV, canonical, pairs, ambiguous, orphans }, null, 2));
    console.log(`Rapport détaillé écrit dans ${args.json}\n`);
  }
}

main();
