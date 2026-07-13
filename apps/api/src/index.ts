import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, or, eq, like, sql, inArray, desc } from 'drizzle-orm';
import { membersTable, seasonsTable, seasonBalancesTable, transactionsTable, bankTransactionsTable } from '../../../libs/shared/db/src/schema';


type Bindings = {
  DB: D1Database;
};

interface ParsedMember {
  licence: string;
  season: string;
  lastName: string;
  firstName: string;
  gender: 'M' | 'F';
  birthDate: string;
  email: string | null;
  phone: string | null;
  status: string;
  type: string;
}

const app = new Hono<{ Bindings: Bindings }>();

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

app.post('/members/import', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  let body: any;
  try {
    body = await c.req.parseBody();
  } catch (err) {
    return c.json({ success: false, error: 'Failed to parse request body' }, 400);
  }

  const file = body.file;
  if (!file) {
    return c.json({ success: false, error: 'Missing file field in multipart form data' }, 400);
  }

  let csvText: string;
  if (typeof file === 'string') {
    csvText = file;
  } else if (typeof file === 'object' && file !== null) {
    try {
      if ('arrayBuffer' in file && typeof (file as any).arrayBuffer === 'function') {
        const arrayBuffer = await (file as any).arrayBuffer();
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        try {
          csvText = utf8Decoder.decode(arrayBuffer);
        } catch (e) {
          const winDecoder = new TextDecoder('windows-1252');
          csvText = winDecoder.decode(arrayBuffer);
        }
      } else if ('text' in file && typeof (file as any).text === 'function') {
        csvText = await (file as any).text();
      } else {
        return c.json({ success: false, error: 'Invalid file format' }, 400);
      }
    } catch (err) {
      return c.json({ success: false, error: 'Failed to read file content' }, 400);
    }
  } else {
    return c.json({ success: false, error: 'Invalid file format' }, 400);
  }

  const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) {
    return c.json({ success: false, error: 'CSV file is empty' }, 400);
  }

  const headerLine = lines[0];
  const separator = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(separator).map(h => h.trim().replace(/^"(.*)"$/, '$1').trim());

  // Map indices directly using clean UTF-8 exact matches
  const licenceIdx = headers.findIndex(h => h === 'Licence');
  const seasonIdx = headers.findIndex(h => h === 'Saison');
  const lastNameIdx = headers.findIndex(h => h === 'Nom');
  const firstNameIdx = headers.findIndex(h => h === 'Prénom');
  const genderIdx = headers.findIndex(h => h === 'Sexe');
  const birthDateIdx = headers.findIndex(h => h === 'Date naissance' || h === 'Date de naissance');
  const emailIdx = headers.findIndex(h => h === 'Email');
  const phoneIdx = headers.findIndex(h => h === 'Téléphone' || h === 'Tél. du contact 1');
  const statusIdx = headers.findIndex(h => h === 'Statut' || h === 'Adhérent validé' || h === 'Etat de dossier' || h === 'État de dossier');
  const typeIdx = headers.findIndex(h => h === 'Type' || h === 'Tarif');

  if (licenceIdx === -1 || lastNameIdx === -1 || firstNameIdx === -1 || genderIdx === -1 || birthDateIdx === -1 || typeIdx === -1 || seasonIdx === -1) {
    return c.json({ success: false, error: 'Invalid headers. Missing required columns (Licence, Saison, Nom, Prénom, Sexe, Date naissance, Tarif/Type)' }, 400);
  }

  const validRowsMap = new Map<string, ParsedMember>();
  let errorsCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split(separator).map(col => col.trim().replace(/^"(.*)"$/, '$1').trim());

    const licence = columns[licenceIdx];
    const season = columns[seasonIdx];
    const lastName = columns[lastNameIdx];
    const firstName = columns[firstNameIdx];
    const rawGender = columns[genderIdx];
    const rawBirthDate = columns[birthDateIdx];
    const email = emailIdx !== -1 ? (columns[emailIdx] || null) : null;
    const phone = phoneIdx !== -1 ? (columns[phoneIdx] || null) : null;
    const rawStatus = statusIdx !== -1 ? (columns[statusIdx] || 'valide') : 'valide';
    const type = columns[typeIdx];

    if (!licence || !lastName || !firstName || !rawBirthDate || !type) {
      errorsCount++;
      continue;
    }

    // Map gender: H/M -> M, F -> F
    let genderStr: 'M' | 'F';
    const cleanGender = rawGender.toUpperCase();
    if (cleanGender === 'H' || cleanGender === 'M') {
      genderStr = 'M';
    } else if (cleanGender === 'F') {
      genderStr = 'F';
    } else {
      errorsCount++;
      continue;
    }

    // Parse and convert birth date: DD-MM-YYYY -> YYYY-MM-DD
    let birthDate = rawBirthDate;
    if (/^\d{2}-\d{2}-\d{4}$/.test(rawBirthDate)) {
      const parts = rawBirthDate.split('-');
      birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(rawBirthDate)) {
      errorsCount++;
      continue;
    }

    // Map status: Oui/valide -> valide, Non/suspendu -> suspendu
    let status = 'valide';
    if (rawStatus === 'Oui' || rawStatus === 'valide' || rawStatus.toLowerCase().includes('finalisé')) {
      status = 'valide';
    } else if (rawStatus === 'Non' || rawStatus === 'suspendu' || rawStatus.toLowerCase().includes('annulé')) {
      status = 'suspendu';
    }

    validRowsMap.set(`${licence}-${season}`, {
      licence,
      season,
      lastName,
      firstName,
      gender: genderStr,
      birthDate,
      email,
      phone,
      status,
      type,
    });
  }

  const db = drizzle(c.env.DB);

  // Auto-detect and populate new seasons from the import data
  const uniqueSeasons = new Set<string>();
  validRowsMap.forEach(member => uniqueSeasons.add(member.season));
  for (const seasonName of uniqueSeasons) {
    const parts = seasonName.split('-');
    const name = parts.length === 2 ? `Saison 20${parts[0]}-20${parts[1]}` : `Saison ${seasonName}`;
    await db.insert(seasonsTable)
      .values({
        id: seasonName,
        name,
        active: false,
        createdAt: new Date()
      })
      .onConflictDoNothing()
      .run();
  }

  const existingLicenceSeasons = new Set<string>();

  // Extract list of licences to query existing records
  const licenceSet = new Set<string>();
  validRowsMap.forEach(m => licenceSet.add(m.licence));
  const licencesList = Array.from(licenceSet);

  if (licencesList.length > 0) {
    const chunkSize = 80;
    for (let i = 0; i < licencesList.length; i += chunkSize) {
      const chunk = licencesList.slice(i, i + chunkSize);
      const existing = await db.select({ licence: membersTable.licence, season: membersTable.season })
        .from(membersTable)
        .where(inArray(membersTable.licence, chunk))
        .all();
      existing.forEach(m => existingLicenceSeasons.add(`${m.licence}-${m.season}`));
    }
  }

  let inserted = 0;
  let updated = 0;
  const importedAt = new Date();

  const batchPromises = Array.from(validRowsMap.values()).map(member => {
    const key = `${member.licence}-${member.season}`;
    const isUpdate = existingLicenceSeasons.has(key);
    if (isUpdate) {
      updated++;
    } else {
      inserted++;
    }

    return db.insert(membersTable)
      .values({
        licence: member.licence,
        season: member.season,
        lastName: member.lastName,
        firstName: member.firstName,
        gender: member.gender,
        birthDate: member.birthDate,
        email: member.email,
        phone: member.phone,
        status: member.status,
        type: member.type,
        importedAt,
      })
      .onConflictDoUpdate({
        target: [membersTable.licence, membersTable.season],
        set: {
          lastName: member.lastName,
          firstName: member.firstName,
          gender: member.gender,
          birthDate: member.birthDate,
          email: member.email,
          phone: member.phone,
          status: member.status,
          type: member.type,
          importedAt,
        }
      });
  });

  if (batchPromises.length > 0) {
    const batchChunkSize = 200;
    for (let i = 0; i < batchPromises.length; i += batchChunkSize) {
      const chunk = batchPromises.slice(i, i + batchChunkSize);
      await db.batch(chunk as [any, ...any[]]);
    }
  }

  return c.json({
    success: true,
    inserted,
    updated,
    errors: errorsCount,
  });
});

app.get('/members', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const search = c.req.query('search') || '';
  const gender = c.req.query('gender') || '';
  const type = c.req.query('type') || '';
  const status = c.req.query('status') || '';
  const season = c.req.query('season') || '';

  const db = drizzle(c.env.DB);
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(membersTable.firstName, `%${search}%`),
        like(membersTable.lastName, `%${search}%`),
        like(membersTable.licence, `%${search}%`)
      )
    );
  }

  if (gender) {
    conditions.push(eq(membersTable.gender, gender as 'M' | 'F'));
  }

  if (type) {
    conditions.push(eq(membersTable.type, type));
  }

  if (status) {
    conditions.push(eq(membersTable.status, status));
  }

  if (season) {
    conditions.push(eq(membersTable.season, season));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count query
  const countRes = await db.select({ count: sql<number>`count(*)` })
    .from(membersTable)
    .where(whereClause)
    .all();
  const total = countRes[0]?.count || 0;

  // Data query
  const offset = (page - 1) * limit;
  const members = await db.select()
    .from(membersTable)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .all();

  const totalPages = Math.ceil(total / limit) || 1;

  return c.json({
    success: true,
    data: members,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    }
  });
});

app.get('/members/:licence', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const licence = c.req.param('licence');
  const season = c.req.query('season') || '';
  const db = drizzle(c.env.DB);

  const conditions = [eq(membersTable.licence, licence)];
  if (season) {
    conditions.push(eq(membersTable.season, season));
  }

  const result = await db.select()
    .from(membersTable)
    .where(and(...conditions))
    .all();

  if (result.length === 0) {
    return c.json({ success: false, error: 'Member not found' }, 404);
  }

  return c.json({
    success: true,
    data: result[0],
  });
});

app.get('/seasons', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const db = drizzle(c.env.DB);
  const seasons = await db.select()
    .from(seasonsTable)
    .orderBy(desc(seasonsTable.id))
    .all();

  return c.json({
    success: true,
    data: seasons
  });
});

app.get('/seasons/:seasonId/balances', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);
  const balances = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  return c.json({ success: true, data: balances });
});

app.post('/seasons/:seasonId/balances', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const body = await c.req.json() as { accountId: 'current' | 'savings' | 'cash'; initialBalance: number }[];
  const db = drizzle(c.env.DB);

  for (const item of body) {
    await db.insert(seasonBalancesTable)
      .values({
        seasonId,
        accountId: item.accountId,
        initialBalance: item.initialBalance,
        createdAt: new Date()
      })
      .onConflictDoUpdate({
        target: [seasonBalancesTable.seasonId, seasonBalancesTable.accountId],
        set: { initialBalance: item.initialBalance }
      })
      .run();
  }

  return c.json({ success: true });
});

app.get('/transactions', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.query('season');
  if (!seasonId) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const db = drizzle(c.env.DB);
  const conditions = [eq(transactionsTable.seasonId, seasonId)];

  const accountId = c.req.query('accountId');
  if (accountId) {
    conditions.push(or(eq(transactionsTable.accountId, accountId as any), eq(transactionsTable.destinationAccountId, accountId as any)) as any);
  }

  const type = c.req.query('type');
  if (type) {
    conditions.push(eq(transactionsTable.type, type as any));
  }

  const category = c.req.query('category');
  if (category) {
    conditions.push(eq(transactionsTable.category, category));
  }

  const totalRes = await db.select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(and(...conditions))
    .get();
  const total = totalRes?.count || 0;

  const transactions = await db.select()
    .from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.id))
    .limit(limit)
    .offset(offset)
    .all();

  return c.json({
    success: true,
    data: transactions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  });
});

app.post('/transactions', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  // Valider les champs requis
  if (!body.seasonId || !body.type || !body.accountId || !body.amount || !body.date || !body.paymentMethod || !body.description) {
    return c.json({ success: false, error: 'Champs requis manquants.' }, 400);
  }

  if (body.type === 'transfert') {
    if (!body.destinationAccountId || body.accountId === body.destinationAccountId) {
      return c.json({ success: false, error: 'Le compte destinataire doit être différent du compte source.' }, 400);
    }
  } else {
    if (!body.category) {
      return c.json({ success: false, error: 'La catégorie est obligatoire pour les recettes/dépenses.' }, 400);
    }
  }

  const [inserted] = await db.insert(transactionsTable).values({
    seasonId: body.seasonId,
    type: body.type,
    accountId: body.accountId,
    destinationAccountId: body.type === 'transfert' ? body.destinationAccountId : null,
    category: body.type !== 'transfert' ? body.category : null,
    amount: Math.round(body.amount),
    date: body.date,
    paymentMethod: body.paymentMethod,
    description: body.description,
    reference: body.reference || null,
    createdAt: new Date()
  }).returning();

  return c.json({ success: true, data: inserted });
});

app.delete('/transactions/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid ID' }, 400);
  }
  const db = drizzle(c.env.DB);
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id)).run();
  return c.json({ success: true });
});

app.get('/seasons/:seasonId/reports', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);

  // Récupérer les soldes initiaux
  const balances = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  
  // Récupérer toutes les transactions de la saison
  const allTxs = await db.select().from(transactionsTable).where(eq(transactionsTable.seasonId, seasonId)).all();

  // 1. Calcul du compte de résultat (ventilé par catégorie)
  const categoryTotals: Record<string, { type: 'recette' | 'depense', total: number }> = {};
  let totalRecettes = 0;
  let totalDepenses = 0;

  for (const tx of allTxs) {
    if (tx.type === 'transfert') continue;
    
    const cat = tx.category || 'divers';
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { type: tx.type, total: 0 };
    }
    categoryTotals[cat].total += tx.amount;
    
    if (tx.type === 'recette') {
      totalRecettes += tx.amount;
    } else {
      totalDepenses += tx.amount;
    }
  }

  // 2. Calcul du bilan de trésorerie (init vs final)
  const accounts = ['current', 'savings', 'cash'] as const;
  const reportBalances = accounts.map(acc => {
    const initBal = balances.find(b => b.accountId === acc)?.initialBalance || 0;
    
    // Calculer le solde final pour ce compte
    let finalBal = initBal;
    for (const tx of allTxs) {
      if (tx.type === 'recette' && tx.accountId === acc) {
        finalBal += tx.amount;
      } else if (tx.type === 'depense' && tx.accountId === acc) {
        finalBal -= tx.amount;
      } else if (tx.type === 'transfert') {
        if (tx.accountId === acc) finalBal -= tx.amount; // Sortie du compte source
        if (tx.destinationAccountId === acc) finalBal += tx.amount; // Entrée sur compte cible
      }
    }

    return {
      accountId: acc,
      initialBalance: initBal,
      finalBalance: finalBal
    };
  });

  return c.json({
    success: true,
    data: {
      compteResultat: {
        totalRecettes,
        totalDepenses,
        netResult: totalRecettes - totalDepenses,
        categories: categoryTotals
      },
      bilanTrésorerie: reportBalances
    }
  });
});

export function parseOFX(ofxContent: string): { transactions: { fitid: string; amount: number; date: string; name: string; memo: string | null; accountId: 'current' | 'savings' }[] } {
  // 1. Détecter le compte bancaire depuis <ACCTID>
  const acctIdMatch = ofxContent.match(/<ACCTID>([^\r\n<]+)/);
  const acctId = acctIdMatch ? acctIdMatch[1].trim() : '';
  const accountId: 'current' | 'savings' = acctId === '00070007847' ? 'savings' : 'current';

  const transactions: any[] = [];
  // 2. Extraire chaque transaction de type <STMTTRN> ... </STMTTRN> (ou jusqu'au prochain bloc ou fin de balise)
  const blocks = ofxContent.split('<STMTTRN>');
  // Le premier bloc contient les en-têtes et le début du fichier, on l'ignore
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('</STMTTRN>')[0];
    
    const fitidMatch = block.match(/<FITID>([^\r\n<]+)/);
    const trnamtMatch = block.match(/<TRNAMT>([^\r\n<]+)/);
    const dtpostedMatch = block.match(/<DTPOSTED>([^\r\n<]+)/);
    const nameMatch = block.match(/<NAME>([^\r\n<]+)/);
    const memoMatch = block.match(/<MEMO>([^\r\n<]+)/);

    if (!fitidMatch || !trnamtMatch || !dtpostedMatch || !nameMatch) continue;

    const rawAmount = parseFloat(trnamtMatch[1].trim());
    const amountCents = Math.round(rawAmount * 100);

    const rawDate = dtpostedMatch[1].trim(); // Format YYYYMMDD
    const dateFormatted = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;

    transactions.push({
      fitid: fitidMatch[1].trim(),
      accountId,
      amount: amountCents,
      date: dateFormatted,
      name: nameMatch[1].trim(),
      memo: memoMatch ? memoMatch[1].trim() : null
    });
  }

  return { transactions };
}

app.post('/bank-transactions/import', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.parseBody();
  const file = body.file;
  const seasonId = body.seasonId as string;

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

  for (const tx of transactions) {
    try {
      const res = await db.insert(bankTransactionsTable)
        .values({
          fitid: tx.fitid,
          seasonId,
          accountId: tx.accountId,
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
    } catch (err) {
      // Ignorer silencieusement les erreurs de doublons si onConflictDoNothing ne suffit pas
    }
  }

  return c.json({ success: true, count: insertedCount });
});

app.get('/bank-transactions', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const status = c.req.query('status') || 'pending';
  const accountId = c.req.query('accountId');

  const db = drizzle(c.env.DB);
  const conditions = [
    eq(bankTransactionsTable.seasonId, season),
    eq(bankTransactionsTable.status, status as any)
  ];

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

app.post('/bank-transactions/:id/reconcile', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  if (body.action === 'match') {
    await db.update(bankTransactionsTable)
      .set({ status: 'reconciled', transactionId: body.transactionId })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  } else if (body.action === 'create') {
    const tx = body.transaction;
    // Insérer d'abord la transaction dans le Grand Livre
    const [newTx] = await db.insert(transactionsTable).values({
      seasonId: tx.seasonId,
      type: tx.type,
      accountId: tx.accountId,
      destinationAccountId: tx.destinationAccountId || null,
      category: tx.category || null,
      amount: Math.round(tx.amount),
      date: tx.date,
      paymentMethod: tx.paymentMethod,
      description: tx.description,
      reference: tx.reference || null,
      createdAt: new Date()
    }).returning();

    // Mettre à jour l'écriture bancaire
    await db.update(bankTransactionsTable)
      .set({ status: 'reconciled', transactionId: newTx.id })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  } else {
    return c.json({ success: false, error: 'Action invalide.' }, 400);
  }

  return c.json({ success: true });
});

app.post('/bank-transactions/:id/ignore', async (c) => {
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

export default app;



