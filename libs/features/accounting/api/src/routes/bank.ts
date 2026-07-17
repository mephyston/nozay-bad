import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, desc, sql } from 'drizzle-orm';
import {
  transactionsTable,
  bankTransactionsTable
} from '@metacult/features-accounting-data-access';
import {
  membersTable
} from '@metacult/features-members-data-access';
import { AppError } from '@metacult/shared-db';
import { cleanName, parseOFX, reconcileBankTxInternal } from '../helpers';
import type { Bindings } from '../routes';

export const bankRouter = new Hono<{ Bindings: Bindings }>();

bankRouter.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const status = c.req.query('status');
  const accountId = c.req.query('accountId');

  const db = drizzle(c.env.DB);
  const conditions = [
    eq(bankTransactionsTable.seasonId, season)
  ];

  if (status) {
    conditions.push(eq(bankTransactionsTable.status, status as any));
  }

  if (accountId) {
    conditions.push(eq(bankTransactionsTable.accountId, accountId as any));
  }

  const data = await db.select()
    .from(bankTransactionsTable)
    .where(and(...conditions))
    .orderBy(desc(bankTransactionsTable.date), desc(bankTransactionsTable.id))
    .all();

  return c.json({ success: true, data });
});

bankRouter.post('/import', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.parseBody();
  const file = body.file;
  const seasonId = body.seasonId as string;
  const forcedAccountId = body.accountId as string;

  if (!file || !seasonId) {
    return c.json({ success: false, error: 'Fichier et saison obligatoires.' }, 400);
  }

  let content: string;
  if (typeof file === 'string') {
    content = file;
  } else if (typeof file === 'object' && file !== null) {
    if ('text' in file && typeof (file as any).text === 'function') {
      content = await (file as any).text();
    } else if ('arrayBuffer' in file && typeof (file as any).arrayBuffer === 'function') {
      const arrayBuffer = await (file as any).arrayBuffer();
      const utf8Decoder = new TextDecoder('utf-8');
      content = utf8Decoder.decode(arrayBuffer);
    } else {
      return c.json({ success: false, error: 'Format de fichier invalide.' }, 400);
    }
  } else {
    return c.json({ success: false, error: 'Format de fichier invalide.' }, 400);
  }

  const { transactions } = parseOFX(content);
  if (transactions.length === 0) {
    return c.json({ success: true, count: 0 });
  }

  const db = drizzle(c.env.DB);
  let insertedCount = 0;

  try {
    await db.transaction(async (txDb) => {
      for (const tx of transactions) {
        const targetAccount = (forcedAccountId && forcedAccountId !== 'auto') 
          ? (forcedAccountId as 'current' | 'savings') 
          : tx.accountId;

        const res = await txDb.insert(bankTransactionsTable)
          .values({
            fitid: tx.fitid,
            seasonId,
            accountId: targetAccount,
            amount: tx.amount,
            date: tx.date,
            name: tx.name,
            memo: tx.memo,
            status: 'pending',
            createdAt: new Date()
          })
          .onConflictDoNothing()
          .run();
        
        const changes = res?.meta?.changes ?? 0;
        if (changes > 0) {
          insertedCount++;
        }
      }
    });
  } catch (err: any) {
    if (err.message && err.message.includes('begin')) {
      // Fallback: run sequentially without transaction (for D1/Wrangler local limitations)
      insertedCount = 0;
      for (const tx of transactions) {
        const targetAccount = (forcedAccountId && forcedAccountId !== 'auto') 
          ? (forcedAccountId as 'current' | 'savings') 
          : tx.accountId;

        const res = await db.insert(bankTransactionsTable)
          .values({
            fitid: tx.fitid,
            seasonId,
            accountId: targetAccount,
            amount: tx.amount,
            date: tx.date,
            name: tx.name,
            memo: tx.memo,
            status: 'pending',
            createdAt: new Date()
          })
          .onConflictDoNothing()
          .run();
        
        const changes = res?.meta?.changes ?? 0;
        if (changes > 0) {
          insertedCount++;
        }
      }
    } else {
      return c.json({ success: false, error: "Erreur lors de l'insertion en base : " + err.message }, 500);
    }
  }

  return c.json({ success: true, count: insertedCount });
});

bankRouter.post('/analyze', async (c) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const singleId = c.req.query('id');

  const db = drizzle(c.env.DB);
  
  const conditions = [
    eq(bankTransactionsTable.seasonId, season),
    eq(bankTransactionsTable.status, 'pending')
  ];
  if (singleId) {
    conditions.push(eq(bankTransactionsTable.id, parseInt(singleId)));
  }

  // 1. Récupérer toutes les transactions bancaires pending de la saison
  const pendingTxs = await db.select()
    .from(bankTransactionsTable)
    .where(and(...conditions))
    .all();

  // 2. Récupérer tous les adhérents de la saison pour la présélection
  const members = await db.select()
    .from(membersTable)
    .where(eq(membersTable.season, season))
    .all();

  // 3. Récupérer des rapprochements passés validés pour entraîner l'IA (Few-shot learning)
  const pastReconciled = await db.select({
    fitid: bankTransactionsTable.fitid,
    name: bankTransactionsTable.name,
    memo: bankTransactionsTable.memo,
    amount: bankTransactionsTable.amount,
    category: transactionsTable.category,
    memberLastName: membersTable.lastName,
    memberFirstName: membersTable.firstName
  })
  .from(bankTransactionsTable)
  .innerJoin(transactionsTable, eq(transactionsTable.bankTransactionId, bankTransactionsTable.id))
  .leftJoin(membersTable, eq(membersTable.id, transactionsTable.memberId))
  .where(eq(bankTransactionsTable.status, 'reconciled'))
  .orderBy(desc(bankTransactionsTable.id))
  .limit(20)
  .all();

  let examplesPrompt = "";
  if (pastReconciled.length > 0) {
    examplesPrompt = "\nVoici des exemples récents de rapprochements réels déjà validés par le trésorier (sers-toi en comme référence) :\n";
    for (const ex of pastReconciled) {
      const memberName = ex.memberLastName ? `${ex.memberLastName} ${ex.memberFirstName}` : "Aucun";
      const catLabel = ex.category ? String(ex.category) : "Inconnue";
      examplesPrompt += `- Libellé bancaire : "${ex.name}" | Mémo : "${ex.memo || ''}" | Montant : ${(ex.amount / 100).toFixed(2)} EUR | Catégorie attribuée : ${catLabel} | Adhérent lié : ${memberName}\n`;
    }
    examplesPrompt += "\nSers-toi de ces exemples historiques pour orienter ton choix de catégorie ou de membre si l'opération à rapprocher est similaire.\n";
  }

  // 4. Récupérer tous les produits actifs pour le matching par montant via SQL brut
  const activeProducts = await db.all(sql`
    SELECT id, name, category, price, stock, active, created_at as createdAt 
    FROM products WHERE active = 1
  `) as { id: number; name: string; category: string; price: number; stock: number; active: boolean; createdAt: number }[];

  function getProductAccountingCategory(prodCat: string): number {
    if (prodCat === 'shuttlecock') return 8; // Volants
    if (prodCat === 'string') return 7; // Cordages
    return 10; // Autre/Matériel
  }

  const productsPrompt = activeProducts.map(p => {
    const accCat = getProductAccountingCategory(p.category);
    return `- Produit : "${p.name}" | Prix : ${(p.price / 100).toFixed(2)} EUR | Catégorie Comptable associée : ${accCat}`;
  }).join('\n');

  let analyzedCount = 0;

  // Category integer ID mapping
  const CAT_ADHESIONS = 1;
  const CAT_SPONSORING = 2;
  const CAT_SUBVENTIONS = 3;
  const CAT_ACTIONS_JEUNES = 4;
  const CAT_TOURNOIS_SENIOR = 5;
  const CAT_EVENEMENTS_BUVETTES = 6;
  const CAT_CORDAGE_VENTE = 7;
  const CAT_VOLANTS = 8;
  const CAT_SALAIRES_CHARGES = 9;
  const CAT_MATERIEL_CLUB = 10;
  const CAT_LICENCES_FEDERATION = 11;
  const CAT_CHAMPIONNATS = 12;
  const CAT_STAGES_FORMATIONS = 13;
  const CAT_FONCTIONNEMENT_ADMIN = 14;
  const CAT_VIREMENTS_INTERNES = 15;

  for (const tx of pendingTxs) {
    // Déterminer la catégorie par défaut par dictionnaire simple
    let suggestedCategory = tx.amount < 0 ? CAT_FONCTIONNEMENT_ADMIN : CAT_ADHESIONS;
    
    // Tenter de faire correspondre par tarif produit d'abord (fallback de montant exact ou multiple de 15€ ou 31.50€)
    const absAmount = Math.abs(tx.amount);
    const matchingProduct = activeProducts.find(p => {
      if (p.price === absAmount) return true;
      if (p.category === 'shuttlecock' && absAmount % p.price === 0 && absAmount <= p.price * 4) return true;
      if (p.category === 'string' && absAmount % p.price === 0 && absAmount <= p.price * 4) return true;
      return false;
    });
    if (matchingProduct) {
      suggestedCategory = getProductAccountingCategory(matchingProduct.category);
    }

    const textToLower = `${tx.name} ${tx.memo || ''}`.toLowerCase();
    
    if (
      /\b\d{20,}\b/.test(textToLower) || 
      textToLower.includes('virement interne') || 
      textToLower.includes('virmt interne') ||
      textToLower.includes('de: nozay badminton') ||
      textToLower.includes('de: nozay bad') ||
      textToLower.includes('de: nba') ||
      textToLower.includes('pour: nozay badminton') ||
      textToLower.includes('pour: nozay bad') ||
      textToLower.includes('pour: nba') ||
      (textToLower.includes('nozay badminton') && textToLower.includes('recharge'))
    ) {
      suggestedCategory = CAT_VIREMENTS_INTERNES;
    } else if (
      textToLower.includes('adhesion') || 
      textToLower.includes('cotisation') || 
      (textToLower.includes('inscription') && !textToLower.includes('tournoi') && !textToLower.includes('ebad')) ||
      (textToLower.includes('licence') && tx.amount > 0) ||
      (textToLower.includes('licences') && tx.amount > 0)
    ) {
      suggestedCategory = CAT_ADHESIONS;
    } else if (textToLower.includes('ionos')) {
      suggestedCategory = CAT_FONCTIONNEMENT_ADMIN;
    } else if (textToLower.includes('urssaf') || textToLower.includes('afdas')) {
      suggestedCategory = CAT_SALAIRES_CHARGES;
    } else if (
      textToLower.includes('deplacement jeune') || 
      textToLower.includes('deplacement jeunes') || 
      textToLower.includes('accompagnement jeune') || 
      textToLower.includes('accompagnement jeunes') || 
      textToLower.includes('tournoi jeune') ||
      textToLower.includes('tournoi jeunes') ||
      (
        (textToLower.includes('deplacement') || textToLower.includes('déplacement') || textToLower.includes('deplacements') || textToLower.includes('déplacements')) &&
        (
          textToLower.includes('jeune') || 
          textToLower.includes('jeunes') || 
          textToLower.includes('minibad') || 
          textToLower.includes('minibadminton') || 
          textToLower.includes('poussin') || 
          textToLower.includes('benjamin') || 
          textToLower.includes('minime') || 
          textToLower.includes('cadet') || 
          textToLower.includes('junior') || 
          textToLower.includes('toussaint') || 
          textToLower.includes('paques') || 
          textToLower.includes('pâques') || 
          textToLower.includes('noel') || 
          textToLower.includes('noël') || 
          textToLower.includes('fevrier') || 
          textToLower.includes('février') || 
          textToLower.includes('avril') || 
          textToLower.includes('printemps') || 
          textToLower.includes('hiver') || 
          textToLower.includes('hivers')
        )
      ) ||
      (
        (textToLower.includes('stage') || textToLower.includes('stg')) &&
        (
          textToLower.includes('jeune') || 
          textToLower.includes('jeunes') || 
          textToLower.includes('minibad') || 
          textToLower.includes('minibadminton') || 
          textToLower.includes('poussin') || 
          textToLower.includes('benjamin') || 
          textToLower.includes('minime') || 
          textToLower.includes('cadet') || 
          textToLower.includes('junior') || 
          textToLower.includes('toussaint') || 
          textToLower.includes('paques') || 
          textToLower.includes('pâques') || 
          textToLower.includes('noel') || 
          textToLower.includes('noël') || 
          textToLower.includes('fevrier') || 
          textToLower.includes('février') || 
          textToLower.includes('avril') || 
          textToLower.includes('printemps') || 
          textToLower.includes('hiver') || 
          textToLower.includes('hivers') ||
          textToLower.includes('juillet') ||
          textToLower.includes('aout') ||
          textToLower.includes('août')
        )
      ) ||
      textToLower.includes('toussaint') ||
      textToLower.includes('paques') ||
      textToLower.includes('pâques') ||
      textToLower.includes('noel') ||
      textToLower.includes('noël') ||
      textToLower.includes('minibad') ||
      textToLower.includes('minibadminton') ||
      textToLower.includes('airbnb') ||
      textToLower.includes('air bnb')
    ) {
      suggestedCategory = CAT_ACTIONS_JEUNES;
    } else if (
      textToLower.includes('ebad') || 
      textToLower.includes('e-bad') || 
      textToLower.includes('portefeuille ebad') || 
      textToLower.includes('portefeuille e-bad') ||
      textToLower.includes('blackminton') ||
      (textToLower.includes('tournoi') && !textToLower.includes('jeune'))
    ) {
      suggestedCategory = CAT_TOURNOIS_SENIOR;
    } else if (textToLower.includes('larde')) {
      if (textToLower.includes('cordage')) {
        suggestedCategory = CAT_CORDAGE_VENTE;
      } else if (textToLower.includes('volant')) {
        suggestedCategory = CAT_VOLANTS;
      } else {
        suggestedCategory = CAT_MATERIEL_CLUB;
      }
    } else if (textToLower.includes('ligue') || textToLower.includes('badminton')) {
      suggestedCategory = textToLower.includes('licence') ? CAT_LICENCES_FEDERATION : CAT_CHAMPIONNATS;
    } else if (
      textToLower.includes('codep91') || 
      textToLower.includes('comite') ||
      /\b(icr|icd|icp)\b/.test(textToLower) ||
      textToLower.includes('interclub') ||
      textToLower.includes('interclubs')
    ) {
      suggestedCategory = CAT_CHAMPIONNATS;
    } else if (textToLower.includes('sumup') || textToLower.includes('buvette')) {
      suggestedCategory = CAT_EVENEMENTS_BUVETTES;
    } else if (textToLower.includes('cordage') || textToLower.includes('raquette')) {
      suggestedCategory = CAT_CORDAGE_VENTE;
    } else if (textToLower.includes('volant')) {
      suggestedCategory = CAT_VOLANTS;
    } else if (textToLower.includes('stage')) {
      suggestedCategory = CAT_STAGES_FORMATIONS;
    } else if (
      (textToLower.includes('licence') && tx.amount < 0) ||
      (textToLower.includes('licences') && tx.amount < 0)
    ) {
      suggestedCategory = CAT_LICENCES_FEDERATION;
    } else if (textToLower.includes('salaire') || textToLower.includes('tetevuide') || textToLower.includes('meunier')) {
      suggestedCategory = CAT_SALAIRES_CHARGES;
    } else if (textToLower.includes('versement express')) {
      suggestedCategory = CAT_ADHESIONS;
    }

    // Présélection des candidats adhérents :
    const textToSearch = `${tx.name} ${tx.memo || ''}`.toLowerCase();
    const candidates = members.filter(m => {
      const cleanLast = cleanName(m.lastName);
      const cleanFirst = cleanName(m.firstName);
      const cleanP1 = cleanName(m.parent1Name);
      const cleanP2 = cleanName(m.parent2Name);

      const matchesLastName = cleanLast && textToSearch.includes(cleanLast);
      const matchesFirstName = cleanFirst && textToSearch.includes(cleanFirst);
      const matchesParent1 = cleanP1 && textToSearch.includes(cleanP1);
      const matchesParent2 = cleanP2 && textToSearch.includes(cleanP2);
      const matchesAmount = Math.abs(m.amountRemaining) === Math.abs(tx.amount);
      
      return matchesLastName || matchesFirstName || matchesParent1 || matchesParent2 || matchesAmount;
    }).slice(0, 5); // Max 5 candidats pour rester rapide

    // Essayer de trouver un match déterministe parfait
    let exactCandidate: typeof members[0] | null = null;
    const textNormalized = textToSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    for (const m of candidates) {
      const firstNorm = cleanName(m.firstName);
      const lastNorm = cleanName(m.lastName);
      const p1Norm = cleanName(m.parent1Name);
      const p2Norm = cleanName(m.parent2Name);
      
      const hasFirstAndLast = firstNorm && lastNorm && textNormalized.includes(firstNorm) && textNormalized.includes(lastNorm);
      const hasParent1 = p1Norm && textNormalized.includes(p1Norm);
      const hasParent2 = p2Norm && textNormalized.includes(p2Norm);

      if (hasFirstAndLast || hasParent1 || hasParent2) {
        exactCandidate = m;
        break;
      }
    }

    let suggestionResult = {
      category: suggestedCategory,
      memberId: exactCandidate ? exactCandidate.id : null as number | null,
      memberName: exactCandidate ? `${exactCandidate.lastName} ${exactCandidate.firstName}` : null as string | null,
      confidence: exactCandidate ? 0.9 : 0.5
    };

    if (candidates.length > 0) {
      // Appeler Workers AI (Llama 3)
      const prompt = `Tu es l'assistant comptable du club Nozay Badminton.
Opération bancaire à rapprocher :
- Libellé : "${tx.name}"
- Détails : "${tx.memo || 'Aucun'}"
- Montant : ${(tx.amount / 100).toFixed(2)} EUR (${tx.amount < 0 ? 'Débit' : 'Crédit'})

Catégories valides pour l'écriture :
- 1 (adhesions_inscriptions : cotisations, dossiers d'adhésion)
- 2 (sponsoring : partenaires)
- 3 (subventions : aides publiques)
- 4 (actions_jeunes : stages et événements jeunes)
- 5 (tournois_senior : inscriptions tournois)
- 6 (evenements_buvettes : consommations, soirées, SumUp)
- 7 (cordage_vente : achat cordage par adhérent ou achat de bobines/fournitures de cordages auprès d'un fournisseur)
- 8 (volants : achat de tubes de volants par adhérent ou achat fournisseur)
- 9 (salaires_charges : salaires entraîneurs, URSSAF)
- 10 (materiel_club : poteaux, filets, volants club - hors cordages)
- 11 (licences_federation : reversement FFBad)
- 12 (championnats : frais d'inscriptions des équipes du club, volants interclubs, repas/courses d'interclubs comme icr, icd, icp)
- 13 (stages_formations : stages adultes ou formations d'arbitres)
- 14 (fonctionnement_administratif : frais bancaires, assurances, licences)
- 15 (virements_internes : virements de compte à compte du club, transit de trésorerie)
${examplesPrompt}

Tarifs des produits de la boutique (si le montant correspond exactement, sers-toi en pour déduire la catégorie) :
${productsPrompt}

Liste des candidats adhérents possibles :
${candidates.map(c => `- ID: ${c.id}, Nom: ${c.lastName} ${c.firstName}, Parent 1: ${c.parent1Name || 'Aucun'}, Montant Restant Dû Adhésion: ${(c.amountRemaining / 100).toFixed(2)} EUR`).join('\n')}

Instructions :
1. Associe l'adhérent (memberId et memberName) si son nom ou prénom (ou celui d'un de ses parents) apparaît clairement dans le libellé ou memo de l'opération, même si son "Montant Restant Dû Adhésion" est de 0.00 EUR (il peut s'agir d'un achat de volants, cordages, etc.).
2. Choisis la catégorie la plus adaptée parmi la liste des catégories valides ci-dessus (ex: renvoie 8 si le motif mentionne "volants", 7 si "cordage", etc.).
3. Si le libellé bancaire ou le mémo est composé principalement d'une longue suite de chiffres (plus de 20 chiffres d'affilée), il s'agit d'un virement interne de compte à compte. Associe impérativement la catégorie 15 et aucun adhérent (memberId = null).
4. Si le montant correspond exactement au tarif d'un produit (par exemple 31.50 EUR pour les volants) ou à un multiple entier de celui-ci (comme 63.00 EUR pour 2 boîtes de volants, ou 30.00 EUR pour 2 cordages), et qu'il n'y a pas d'autre indication de catégorie dans le texte, choisis la catégorie associée à ce produit. Si le texte mentionne explicitement "adhesion", "cotisation" ou "inscription", choisis impérativement la catégorie 1 (adhesions_inscriptions), même si le montant correspond à un produit.
5. Si le libellé bancaire ou le mémo mentionne des déplacements, tournois, accompagnements pour les jeunes (ex: "deplacement jeune", "tournoi jeune") ou des stages de vacances scolaires ou d'entraînement pour jeunes/catégories jeunes (ex: "minibad", "stage minibad", "toussaint", "paques", "pâques", "stage février", "stage toussaint", "stg paques", "stage d'hiver", "stage de pâques", "stage de printemps", "stage jeunes", "course stage hivers") ou des frais d'hébergement/logement liés à ces déplacements pour les jeunes ou parents accompagnateurs (ex: "airbnb", "air bnb"), choisis impérativement la catégorie 4 (actions_jeunes) au lieu de la catégorie 9 (salaires_charges) ou 13 (stages_formations).
6. Si le libellé bancaire ou le mémo mentionne l'application "ebad" (ex: "ebad", "e-bad", "portefeuille ebad", "portefeuille e-bad") ou des tournois/événements adultes comme "blackminton", ou des inscriptions à des tournois adultes/seniors (sans mention de jeunes), choisis impérativement la catégorie 5 (tournois_senior).

Renvoie STRICTEMENT un objet JSON sous la forme suivante (sans aucun autre texte, balises markdown ou commentaires) :
{
  "memberId": <ID de l'adhérent associé ou null>,
  "memberName": "<Nom Prénom de l'adhérent associé ou null>",
  "category": <ID entier de la catégorie choisie>,
  "confidence": <nombre entre 0.0 et 1.0 indiquant ton niveau de certitude>,
  "reasoning": "<explication concise>"
}`;

      try {
        const aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [{ role: 'user', content: prompt }]
        });
        const textRes = aiResponse.response || aiResponse.text || '';
        const jsonMatch = textRes.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          suggestionResult = {
            category: parsed.category ? Number(parsed.category) : suggestedCategory,
            memberId: parsed.memberId || null,
            memberName: parsed.memberName || null,
            confidence: parsed.confidence || 0.5
          };
        }
      } catch (e) {
        if (candidates.length === 1) {
          suggestionResult.memberId = candidates[0].id;
          suggestionResult.memberName = `${candidates[0].lastName} ${candidates[0].firstName}`;
          suggestionResult.confidence = 0.7;
        }
      }
    }

    // Post-process : Rediriger les stages (13) et tournois (5) des mineurs vers Actions Jeunes (4)
    if (suggestionResult.memberId) {
      const matchedMember = members.find(m => m.id === suggestionResult.memberId);
      if (matchedMember && matchedMember.birthDate) {
        const birthYear = new Date(matchedMember.birthDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        if (age <= 18) {
          if (suggestionResult.category === CAT_STAGES_FORMATIONS || suggestionResult.category === CAT_TOURNOIS_SENIOR) {
            suggestionResult.category = CAT_ACTIONS_JEUNES;
          }
        }
      }
    }

    // Sauvegarder la suggestion en base de données
    await db.update(bankTransactionsTable)
      .set({ aiSuggestions: JSON.stringify(suggestionResult) })
      .where(eq(bankTransactionsTable.id, tx.id))
      .run();
    
    analyzedCount++;
  }

  return c.json({ success: true, count: analyzedCount });
});

bankRouter.post('/reconcile-bulk', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json() as any;
  const requests = body.requests;
  if (!requests || !Array.isArray(requests)) {
    return c.json({ success: false, error: 'Missing requests array.' }, 400);
  }

  const db = drizzle(c.env.DB);

  try {
    let count = 0;
    await db.transaction(async (tx) => {
      for (const req of requests) {
        const result = await reconcileBankTxInternal(tx, req.btId, req);
        if (!result.success) {
          throw new AppError(result.error || 'Matching operation failed', result.status || 400);
        }
        count++;
      }
    });

    return c.json({ success: true, count });
  } catch (err: any) {
    if (err.message && err.message.includes('begin')) {
      try {
        let count = 0;
        for (const req of requests) {
          const result = await reconcileBankTxInternal(db, req.btId, req);
          if (!result.success) {
            throw new AppError(result.error || 'Matching operation failed', result.status || 400);
          }
          count++;
        }
        return c.json({ success: true, count });
      } catch (innerErr: any) {
        if (innerErr instanceof AppError) throw innerErr;
        return c.json({ success: false, error: innerErr.message }, 400);
      }
    }
    if (err instanceof AppError) {
      throw err;
    }
    return c.json({ success: false, error: err.message }, 400);
  }
});

bankRouter.post('/:id/reconcile', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  try {
    await db.transaction(async (tx) => {
      const result = await reconcileBankTxInternal(tx, id, body);
      if (!result.success) {
        throw new AppError(result.error || 'Reconciliation failed', result.status || 400);
      }
    });
    return c.json({ success: true });
  } catch (err: any) {
    if (err.message && err.message.includes('begin')) {
      const result = await reconcileBankTxInternal(db, id, body);
      if (!result.success) {
        throw new AppError(result.error || 'Reconciliation failed', result.status || 400);
      }
      return c.json({ success: true });
    }
    if (err instanceof AppError) {
      throw err;
    }
    return c.json({ success: false, error: err.message }, err.status || 400);
  }
});

bankRouter.post('/:id/ignore', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  await db.update(bankTransactionsTable)
    .set({ status: 'ignored' })
    .where(eq(bankTransactionsTable.id, id))
    .run();

  return c.json({ success: true });
});

bankRouter.post('/:id/unignore', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  await db.update(bankTransactionsTable)
    .set({ status: 'pending' })
    .where(eq(bankTransactionsTable.id, id))
    .run();

  return c.json({ success: true });
});
