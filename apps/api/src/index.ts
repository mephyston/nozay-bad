import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, or, eq, ne, like, sql, inArray, desc } from 'drizzle-orm';
import { membersTable, seasonsTable, seasonBalancesTable, transactionsTable, bankTransactionsTable, checkDepositsTable, checksTable } from '../../../libs/shared/db/src/schema';


function cleanName(name: string | null): string {
  if (!name) return '';
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\(.*?\)/g, "")
    .trim()
    .toLowerCase();
}

type Bindings = {
  DB: D1Database;
  AI: any;
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
  amountDue: number;
  amountReceived: number;
  amountRemaining: number;
  paid: boolean;
  parent1Name: string | null;
  parent1Email: string | null;
  parent1Phone: string | null;
  parent2Name: string | null;
  parent2Email: string | null;
  parent2Phone: string | null;
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

  const amountDueIdx = headers.findIndex(h => h === 'Montant');
  const amountReceivedIdx = headers.findIndex(h => h === 'Montant reçu');
  const amountRemainingIdx = headers.findIndex(h => h === 'Montant restant');
  const paidIdx = headers.findIndex(h => h === 'Payé');
  const parent1NameIdx = headers.findIndex(h => h === 'Nom du contact 1');
  const parent1EmailIdx = headers.findIndex(h => h === 'Email du contact 1');
  const parent1PhoneIdx = headers.findIndex(h => h === 'Tél. du contact 1');
  const parent2NameIdx = headers.findIndex(h => h === 'Nom du contact 2');
  const parent2EmailIdx = headers.findIndex(h => h === 'Email du contact 2');
  const parent2PhoneIdx = headers.findIndex(h => h === 'Tél. du contact 2');

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

    const parseAmount = (idx: number): number => {
      if (idx === -1 || !columns[idx]) return 0;
      const parsed = parseFloat(columns[idx]);
      return isNaN(parsed) ? 0 : Math.round(parsed * 100);
    };

    const amountDue = parseAmount(amountDueIdx);
    const amountReceived = parseAmount(amountReceivedIdx);
    const amountRemaining = parseAmount(amountRemainingIdx);
    const paid = paidIdx !== -1 && columns[paidIdx] === 'Oui';

    const parent1Name = parent1NameIdx !== -1 ? (columns[parent1NameIdx] || null) : null;
    const parent1Email = parent1EmailIdx !== -1 ? (columns[parent1EmailIdx] || null) : null;
    const parent1Phone = parent1PhoneIdx !== -1 ? (columns[parent1PhoneIdx] || null) : null;
    const parent2Name = parent2NameIdx !== -1 ? (columns[parent2NameIdx] || null) : null;
    const parent2Email = parent2EmailIdx !== -1 ? (columns[parent2EmailIdx] || null) : null;
    const parent2Phone = parent2PhoneIdx !== -1 ? (columns[parent2PhoneIdx] || null) : null;

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
      amountDue,
      amountReceived,
      amountRemaining,
      paid,
      parent1Name,
      parent1Email,
      parent1Phone,
      parent2Name,
      parent2Email,
      parent2Phone,
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
        amountDue: member.amountDue,
        amountReceived: member.amountReceived,
        amountRemaining: member.amountRemaining,
        paid: member.paid,
        parent1Name: member.parent1Name,
        parent1Email: member.parent1Email,
        parent1Phone: member.parent1Phone,
        parent2Name: member.parent2Name,
        parent2Email: member.parent2Email,
        parent2Phone: member.parent2Phone,
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
          amountDue: member.amountDue,
          amountReceived: member.amountReceived,
          amountRemaining: member.amountRemaining,
          paid: member.paid,
          parent1Name: member.parent1Name,
          parent1Email: member.parent1Email,
          parent1Phone: member.parent1Phone,
          parent2Name: member.parent2Name,
          parent2Email: member.parent2Email,
          parent2Phone: member.parent2Phone,
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

  const memberId = c.req.query('memberId');
  if (memberId) {
    conditions.push(eq(transactionsTable.memberId, parseInt(memberId)));
  }

  const totalRes = await db.select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(and(...conditions))
    .get();
  const total = totalRes?.count || 0;

  const transactions = await db.select({
    id: transactionsTable.id,
    seasonId: transactionsTable.seasonId,
    type: transactionsTable.type,
    accountId: transactionsTable.accountId,
    destinationAccountId: transactionsTable.destinationAccountId,
    category: transactionsTable.category,
    amount: transactionsTable.amount,
    date: transactionsTable.date,
    paymentMethod: transactionsTable.paymentMethod,
    description: transactionsTable.description,
    reference: transactionsTable.reference,
    memberId: transactionsTable.memberId,
    bankTransactionId: transactionsTable.bankTransactionId,
    memberName: sql<string | null>`members.last_name || ' ' || members.first_name`,
    memberLicence: sql<string | null>`members.licence`
  })
    .from(transactionsTable)
    .leftJoin(membersTable, eq(transactionsTable.memberId, membersTable.id))
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

  // 1. Récupérer la transaction pour vérifier les liens bankTransactionId et memberId
  const tx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).get();
  if (!tx) {
    return c.json({ success: false, error: 'Transaction non trouvée' }, 404);
  }

  // 2. Si liée à un relevé bancaire, recalculer le pointage restant
  if (tx.bankTransactionId) {
    const bankTx = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, tx.bankTransactionId)).get();
    if (bankTx) {
      // Trouver les transactions restantes pointées sur cette écriture bancaire
      const remainingTxs = await db.select()
        .from(transactionsTable)
        .where(and(
          eq(transactionsTable.bankTransactionId, tx.bankTransactionId),
          ne(transactionsTable.id, id)
        ))
        .all();
      const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Si le total restant est inférieur au montant absolu du relevé bancaire, on le repasse en 'pending'
      if (totalRemaining < Math.abs(bankTx.amount)) {
        await db.update(bankTransactionsTable)
          .set({ 
            status: 'pending', 
            transactionId: remainingTxs.length > 0 ? remainingTxs[remainingTxs.length - 1].id : null 
          })
          .where(eq(bankTransactionsTable.id, tx.bankTransactionId))
          .run();
      }
    }
  }

  // 3. Si liée à un adhérent pour une adhésion, déduire le montant reçu
  if (tx.memberId && tx.category === 'adhesions_inscriptions') {
    const member = await db.select().from(membersTable).where(eq(membersTable.id, tx.memberId)).get();
    if (member) {
      const newReceived = Math.max(0, member.amountReceived - Math.abs(tx.amount));
      const newRemaining = Math.max(0, member.amountDue - newReceived);
      const isPaid = newRemaining === 0;

      await db.update(membersTable)
        .set({
          amountReceived: newReceived,
          amountRemaining: newRemaining,
          paid: isPaid
        })
        .where(eq(membersTable.id, tx.memberId))
        .run();
    }
  }

  // 4. Supprimer la transaction du Grand Livre
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

app.post('/bank-transactions/analyze', async (c) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }

  const db = drizzle(c.env.DB);
  
  // 1. Récupérer toutes les transactions bancaires pending de la saison
  const pendingTxs = await db.select()
    .from(bankTransactionsTable)
    .where(and(
      eq(bankTransactionsTable.seasonId, season),
      eq(bankTransactionsTable.status, 'pending')
    ))
    .all();

  // 2. Récupérer tous les adhérents de la saison pour la présélection
  const members = await db.select()
    .from(membersTable)
    .where(eq(membersTable.season, season))
    .all();

  let analyzedCount = 0;

  for (const tx of pendingTxs) {
    // Déterminer la catégorie par défaut par dictionnaire simple
    let suggestedCategory = tx.amount < 0 ? 'fonctionnement_administratif' : 'adhesions_inscriptions';
    const textToLower = `${tx.name} ${tx.memo || ''}`.toLowerCase();
    
    if (textToLower.includes('ionos')) {
      suggestedCategory = 'fonctionnement_administratif';
    } else if (textToLower.includes('urssaf') || textToLower.includes('afdas')) {
      suggestedCategory = 'salaires_charges';
    } else if (textToLower.includes('salaire') || textToLower.includes('tetevuide') || textToLower.includes('meunier')) {
      suggestedCategory = 'salaires_charges';
    } else if (textToLower.includes('larde')) {
      suggestedCategory = 'materiel_club';
    } else if (textToLower.includes('ligue') || textToLower.includes('badminton')) {
      suggestedCategory = textToLower.includes('licence') ? 'licences_federation' : 'championnats';
    } else if (textToLower.includes('codep91') || textToLower.includes('comite')) {
      suggestedCategory = 'championnats';
    } else if (textToLower.includes('sumup') || textToLower.includes('buvette')) {
      suggestedCategory = 'evenements_buvettes';
    } else if (textToLower.includes('cordage') || textToLower.includes('raquette')) {
      suggestedCategory = 'cordage_vente';
    } else if (textToLower.includes('volant')) {
      suggestedCategory = 'volants';
    } else if (textToLower.includes('stage')) {
      suggestedCategory = 'stages_formations';
    } else if (textToLower.includes('versement express')) {
      suggestedCategory = 'adhesions_inscriptions';
    }

    // Présélection des candidats adhérents :
    // On filtre les membres dont le nom de famille ou prénom apparaît dans le libellé/mémo
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

    // Essayer de trouver un match déterministe parfait sur le nom + prénom de l'adhérent ou de ses parents
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
      // Appeler Workers AI (Llama 3) pour affiner le matching
      const prompt = `Tu es l'assistant comptable du club Nozay Badminton.
Opération bancaire à rapprocher :
- Libellé : "${tx.name}"
- Détails : "${tx.memo || 'Aucun'}"
- Montant : ${(tx.amount / 100).toFixed(2)} EUR (${tx.amount < 0 ? 'Débit' : 'Crédit'})

Catégories valides pour l'écriture :
- adhesions_inscriptions (cotisations, dossiers d'adhésion)
- sponsoring (partenaires)
- subventions (aides publiques)
- actions_jeunes (stages et événements jeunes)
- tournois_senior (inscriptions tournois)
- evenements_buvettes (consommations, soirées, SumUp)
- cordage_vente (achat cordage par adhérent)
- volants (achat de tubes de volants par adhérent ou achat fournisseur)
- salaires_charges (salaires entraîneurs, URSSAF)
- materiel_club (poteaux, filets, volants club)
- licences_federation (reversement FFBad)
- championnats (frais d'inscriptions des équipes du club)
- stages_formations (stages adultes ou formations d'arbitres)
- fonctionnement_administratif (frais bancaires, assurances, licences de logiciels comme Ionos)

Liste des candidats adhérents possibles :
${candidates.map(c => `- ID: ${c.id}, Nom: ${c.lastName} ${c.firstName}, Parent 1: ${c.parent1Name || 'Aucun'}, Montant Restant Dû Adhésion: ${(c.amountRemaining / 100).toFixed(2)} EUR`).join('\n')}

Instructions :
1. Associe l'adhérent (memberId et memberName) si son nom ou prénom (ou celui d'un de ses parents) apparaît clairement dans le libellé ou memo de l'opération, même si son "Montant Restant Dû Adhésion" est de 0.00 EUR (il peut s'agir d'un achat de volants, cordages, etc.).
2. Choisis la catégorie la plus adaptée parmi la liste des catégories valides ci-dessus (ex: "volants" si le motif mentionne "volants", "cordage_vente" si "cordage", etc.).

Renvoie STRICTEMENT un objet JSON sous la forme suivante (sans aucun autre texte, balises markdown ou commentaires) :
{
  "memberId": <ID de l'adhérent associé ou null>,
  "memberName": "<Nom Prénom de l'adhérent associé ou null>",
  "category": "<identifiant de la catégorie choisie>",
  "confidence": <nombre entre 0.0 et 1.0 indiquant ton niveau de certitude>,
  "reasoning": "<explication concise>"
}`;

      try {
        const aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [{ role: 'user', content: prompt }]
        });
        const textRes = aiResponse.response || aiResponse.text || '';
        // Extraire l'objet JSON de la réponse texte
        const jsonMatch = textRes.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          suggestionResult = {
            category: parsed.category || suggestedCategory,
            memberId: parsed.memberId || null,
            memberName: parsed.memberName || null,
            confidence: parsed.confidence || 0.5
          };
        }
      } catch (e) {
        // Fallback sur le premier candidat si l'IA échoue
        if (candidates.length === 1) {
          suggestionResult.memberId = candidates[0].id;
          suggestionResult.memberName = `${candidates[0].lastName} ${candidates[0].firstName}`;
          suggestionResult.confidence = 0.7;
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

app.get('/bank-transactions', async (c) => {
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

app.post('/bank-transactions/:id/reconcile', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  const bankTx = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, id)).get();
  if (!bankTx) {
    return c.json({ success: false, error: 'Écriture bancaire non trouvée.' }, 404);
  }

  const memberId = body.memberId || body.transaction?.memberId;
  let lastTxId = null;

  if (body.action === 'match') {
    await db.update(transactionsTable)
      .set({ 
        bankTransactionId: id,
        memberId: memberId || undefined
      })
      .where(eq(transactionsTable.id, body.transactionId))
      .run();
    lastTxId = body.transactionId;
  } else if (body.action === 'create') {
    const tx = body.transaction;
    // Insérer la transaction dans le Grand Livre liée à cette transaction bancaire
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
      memberId: memberId || null,
      bankTransactionId: id,
      createdAt: new Date()
    }).returning();
    lastTxId = newTx.id;
  } else {
    return c.json({ success: false, error: 'Action invalide.' }, 400);
  }

  // Calculer le montant total déjà rapproché pour cette ligne de relevé
  const linkedTxs = await db.select()
    .from(transactionsTable)
    .where(eq(transactionsTable.bankTransactionId, id))
    .all();
  const totalLinked = linkedTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Si le total rapproché est égal ou supérieur au montant absolu de la ligne bancaire, on la valide
  if (totalLinked >= Math.abs(bankTx.amount)) {
    await db.update(bankTransactionsTable)
      .set({ status: 'reconciled', transactionId: lastTxId })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  }

  if (memberId) {
    let categoryStr = null;
    if (body.action === 'create') {
      categoryStr = body.transaction?.category;
    } else if (body.action === 'match') {
      const matchedTx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, body.transactionId)).get();
      categoryStr = matchedTx ? matchedTx.category : null;
    }

    if (categoryStr === 'adhesions_inscriptions') {
      const member = await db.select().from(membersTable).where(eq(membersTable.id, memberId)).get();
      if (member) {
        const amountToApply = Math.abs(body.transaction?.amount ?? bankTx.amount);
        const newReceived = member.amountReceived + amountToApply;
        const newRemaining = Math.max(0, member.amountDue - newReceived);
        const isPaid = newRemaining === 0;

        await db.update(membersTable)
          .set({
            amountReceived: newReceived,
            amountRemaining: newRemaining,
            paid: isPaid
          })
          .where(eq(membersTable.id, memberId))
          .run();
      }
    }
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

app.post('/bank-transactions/:id/unignore', async (c) => {
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

app.post('/checks/analyze', async (c) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  try {
    const formData = await c.req.parseBody();
    const file = formData.file;
    if (!file) {
      return c.json({ success: false, error: 'Fichier image manquant.' }, 400);
    }

    let bytes: ArrayBuffer;
    if (typeof file === 'string') {
      if (file.startsWith('data:')) {
        const base64Data = file.split(',')[1];
        bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
      } else {
        bytes = new TextEncoder().encode(file).buffer;
      }
    } else if (typeof file === 'object' && file !== null) {
      if ('arrayBuffer' in file && typeof (file as any).arrayBuffer === 'function') {
        bytes = await (file as any).arrayBuffer();
      } else {
        return c.json({ success: false, error: 'Format de fichier invalide.' }, 400);
      }
    } else {
      return c.json({ success: false, error: 'Format de fichier invalide.' }, 400);
    }

    // Appeler le modèle de vision de Workers AI avec chaîne de repli en cas d'erreur de licence (UE)
    let aiRes: any;
    try {
      const model = '@cf/meta/llama-3.2-11b-vision-instruct';
      const systemPrompt = `Analyze this check image. Extract the following fields as a JSON object:
{
  "number": "string (the check number, usually 7 digits)",
  "amount": number (the check amount in EUR, e.g. 150.00)",
  "emitter": "string (the pre-printed account holder / owner name, usually printed in black text in the left or upper section, e.g. 'ANTENNE REUNION TELEVISION'. Do NOT use the handwritten beneficiary/payee name written after 'à', e.g. 'Association Sourice de l'enfant')",
  "bank": "string (the bank name, e.g. LCL, SG, Credit Agricole)",
  "date": "string (the issue date of the check in YYYY-MM-DD format, or null if not clear)"
}
Return ONLY the raw JSON object. Do not wrap it in markdown or other text.`;

      aiRes = await c.env.AI.run(model, {
        prompt: systemPrompt,
        image: [...new Uint8Array(bytes)]
      });
    } catch (llamaErr: any) {
      console.warn("Llama 3.2 vision failed, trying auto-agreement or fallback:", llamaErr);
      
      let agreed = false;
      if (llamaErr.message && (llamaErr.message.includes("submit the prompt 'agree'") || llamaErr.message.includes("5016"))) {
        try {
          console.info("Submitting prompt 'agree' to accept Meta Llama license...");
          await c.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            prompt: 'agree',
            image: [...new Uint8Array(bytes)]
          });
          agreed = true;
          
          aiRes = await c.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            prompt: `Analyze this check image. Extract the following fields as a JSON object:
{
  "number": "string (the check number, usually 7 digits)",
  "amount": number (the check amount in EUR, e.g. 150.00)",
  "emitter": "string (the pre-printed account holder / owner name, usually printed in black text in the left or upper section, e.g. 'ANTENNE REUNION TELEVISION'. Do NOT use the handwritten beneficiary/payee name written after 'à', e.g. 'Association Sourice de l'enfant')",
  "bank": "string (the bank name, e.g. LCL, SG, Credit Agricole)",
  "date": "string (the issue date of the check in YYYY-MM-DD format, or null if not clear)"
}`,
            image: [...new Uint8Array(bytes)]
          });
        } catch (agreeErr) {
          console.warn("Failed to automatically agree to Llama 3.2 terms:", agreeErr);
        }
      }

      if (!agreed || !aiRes) {
        console.warn("Falling back directly to Llava 1.5...");
        const modelLlava = '@cf/llava-hf/llava-1.5-7b-hf';
        const systemPrompt = `Identify check number (usually 7 digits), amount, pre-printed account holder name (emitter, e.g. 'ANTENNE REUNION TELEVISION'. Do NOT use the handwritten beneficiary/payee name written after 'à', e.g. 'Association Sourice de l'enfant'), bank, and issue date in YYYY-MM-DD format in this check. Output JSON: {"number":"...", "amount":150.0, "emitter":"...", "bank":"...", "date":"YYYY-MM-DD"}`;

        aiRes = await c.env.AI.run(modelLlava, {
          prompt: systemPrompt,
          image: [...new Uint8Array(bytes)]
        });
      }
    }

    let extracted: any = {};
    let textResult = '';
    if (typeof aiRes === 'string') {
      textResult = aiRes;
    } else if (aiRes && typeof aiRes === 'object') {
      if (typeof (aiRes as any).response === 'string') {
        textResult = (aiRes as any).response;
      } else if ((aiRes as any).response !== undefined && (aiRes as any).response !== null) {
        textResult = JSON.stringify((aiRes as any).response);
      } else {
        textResult = JSON.stringify(aiRes);
      }
    }
    
    // Nettoyer et parser le JSON retourné par le LLM
    try {
      const jsonMatch = textResult.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        extracted = JSON.parse(textResult);
      }
    } catch (e) {
      console.warn('Failed to parse AI check response as JSON, trying regex extraction on:', textResult);
      extracted = {};
      
      const numMatch = textResult.match(/\b\d{7}\b/);
      if (numMatch) {
        extracted.number = numMatch[0];
      } else {
        const numMatchAny = textResult.match(/n°\s*(\d+)/i) || textResult.match(/numero\s*(\d+)/i);
        if (numMatchAny) extracted.number = numMatchAny[1];
      }

      const amtMatch = textResult.match(/(\d+[\.,]\d{2})\s*€/) || textResult.match(/(\d+[\.,]\d{2})\s*eur/i) || textResult.match(/(\d+)\s*€/) || textResult.match(/montant\s*(?:de\s*)?(\d+)/i);
      if (amtMatch) {
        extracted.amount = parseFloat(amtMatch[1].replace(',', '.'));
      }

      const emitMatch = textResult.match(/émetteur\s*:\s*([A-Za-z\s\-]+)/i) || textResult.match(/de\s*([A-Z][a-z\-]+\s+[A-Z][a-z\-]+)/);
      if (emitMatch) {
        const val = emitMatch[1].trim();
        if (!/nozay/i.test(val) && !/bad/i.test(val) && !/association/i.test(val)) {
          extracted.emitter = val;
        }
      }

      const bankMatch = textResult.match(/banque\s*:\s*([A-Za-z\s]+)/i) || textResult.match(/(Société Générale|Crédit Agricole|LCL|Bred|BNP|La Banque Postale|CIC|Crédit Mutuel)/i);
      if (bankMatch) {
        extracted.bank = bankMatch[1].trim();
      }

      // Extraction de la date d'émission (format DD/MM/YYYY ou YYYY-MM-DD)
      const dateMatch = textResult.match(/(\d{2})[\/\-\s](\d{2})[\/\-\s](\d{4})/) || textResult.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      if (dateMatch) {
        if (dateMatch[3].length === 4) {
          extracted.date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        } else {
          extracted.date = dateMatch[0];
        }
      }
    }

    // Associer automatiquement à un adhérent potentiel
    let matchedMember = null;
    const db = drizzle(c.env.DB);
    const members = await db.select().from(membersTable).all();

    if (extracted.emitter) {
      const cleanEmitter = cleanName(extracted.emitter);
      
      for (const m of members) {
        const cleanLast = cleanName(m.lastName);
        const cleanFirst = cleanName(m.firstName);
        const cleanP1 = cleanName(m.parent1Name);
        const cleanP2 = cleanName(m.parent2Name);

        const hasFirstAndLast = cleanFirst && cleanLast && cleanEmitter.includes(cleanFirst) && cleanEmitter.includes(cleanLast);
        const hasParent1 = cleanP1 && cleanEmitter.includes(cleanP1);
        const hasParent2 = cleanP2 && cleanEmitter.includes(cleanP2);

        if (hasFirstAndLast || hasParent1 || hasParent2) {
          matchedMember = m;
          break;
        }
      }
    }

    return c.json({
      success: true,
      data: {
        number: extracted.number || '',
        amount: extracted.amount || 0,
        emitter: extracted.emitter || '',
        bank: extracted.bank || '',
        memberId: matchedMember ? matchedMember.id : null,
        memberName: matchedMember ? `${matchedMember.lastName} ${matchedMember.firstName}` : null
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/checks', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const status = c.req.query('status');
  const db = drizzle(c.env.DB);

  const conditions = [eq(checksTable.seasonId, season)];
  if (status) {
    conditions.push(eq(checksTable.status, status as any));
  }

  const data = await db.select({
    id: checksTable.id,
    checkDepositId: checksTable.checkDepositId,
    seasonId: checksTable.seasonId,
    number: checksTable.number,
    amount: checksTable.amount,
    emitter: checksTable.emitter,
    bank: checksTable.bank,
    memberId: checksTable.memberId,
    transactionId: checksTable.transactionId,
    status: checksTable.status,
    photoUrl: checksTable.photoUrl,
    createdAt: checksTable.createdAt,
    memberName: sql<string | null>`members.last_name || ' ' || members.first_name`,
    memberLicence: sql<string | null>`members.licence`
  })
    .from(checksTable)
    .leftJoin(membersTable, eq(checksTable.memberId, membersTable.id))
    .where(and(...conditions))
    .orderBy(desc(checksTable.createdAt))
    .all();

  return c.json({ success: true, data });
});

app.post('/checks', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  if (!body.seasonId || !body.number || !body.amount || !body.emitter) {
    return c.json({ success: false, error: 'Champs requis manquants.' }, 400);
  }

  const categoryStr = body.category || 'adhesions_inscriptions';
  const descStr = body.description || `Règlement par chèque n°${body.number} de ${body.emitter}`;

  const [newTx] = await db.insert(transactionsTable).values({
    seasonId: body.seasonId,
    type: 'recette',
    accountId: 'current',
    category: categoryStr,
    amount: body.amount,
    date: body.date || new Date().toISOString().split('T')[0],
    paymentMethod: 'cheque',
    description: descStr,
    reference: `Chèque n°${body.number}`,
    memberId: body.memberId || null,
    createdAt: new Date()
  }).returning();

  const [newCheck] = await db.insert(checksTable).values({
    seasonId: body.seasonId,
    number: body.number,
    amount: body.amount,
    emitter: body.emitter,
    bank: body.bank || null,
    memberId: body.memberId || null,
    transactionId: newTx.id,
    status: 'received',
    photoUrl: body.photoUrl || null,
    createdAt: new Date()
  }).returning();

  if (body.memberId && categoryStr === 'adhesions_inscriptions') {
    const member = await db.select().from(membersTable).where(eq(membersTable.id, body.memberId)).get();
    if (member) {
      const newReceived = member.amountReceived + body.amount;
      const newRemaining = Math.max(0, member.amountDue - newReceived);
      const isPaid = newRemaining === 0;

      await db.update(membersTable)
        .set({
          amountReceived: newReceived,
          amountRemaining: newRemaining,
          paid: isPaid
        })
        .where(eq(membersTable.id, body.memberId))
        .run();
    }
  }

  return c.json({ success: true, data: newCheck });
});

app.delete('/checks/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  const check = await db.select().from(checksTable).where(eq(checksTable.id, id)).get();
  if (!check) {
    return c.json({ success: false, error: 'Chèque non trouvé.' }, 404);
  }

  if (check.transactionId) {
    await db.update(checksTable)
      .set({ transactionId: null })
      .where(eq(checksTable.id, id))
      .run();

    const tx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, check.transactionId)).get();
    if (tx) {
      if (tx.memberId && tx.category === 'adhesions_inscriptions') {
        const member = await db.select().from(membersTable).where(eq(membersTable.id, tx.memberId)).get();
        if (member) {
          const newReceived = Math.max(0, member.amountReceived - Math.abs(tx.amount));
          const newRemaining = Math.max(0, member.amountDue - newReceived);
          const isPaid = newRemaining === 0;

          await db.update(membersTable)
            .set({
              amountReceived: newReceived,
              amountRemaining: newRemaining,
              paid: isPaid
            })
            .where(eq(membersTable.id, tx.memberId))
            .run();
        }
      }
      await db.delete(transactionsTable).where(eq(transactionsTable.id, tx.id)).run();
    }
  }

  await db.delete(checksTable).where(eq(checksTable.id, id)).run();
  return c.json({ success: true });
});

app.post('/check-deposits', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  if (!body.seasonId || !body.reference || !body.date || !body.checkIds || body.checkIds.length === 0) {
    return c.json({ success: false, error: 'Champs requis manquants.' }, 400);
  }

  const checksToDeposit = await db.select().from(checksTable).where(inArray(checksTable.id, body.checkIds)).all();
  if (checksToDeposit.length === 0) {
    return c.json({ success: false, error: 'Aucun chèque valide trouvé.' }, 400);
  }
  const totalAmount = checksToDeposit.reduce((sum, ch) => sum + ch.amount, 0);

  const [deposit] = await db.insert(checkDepositsTable).values({
    seasonId: body.seasonId,
    reference: body.reference,
    date: body.date,
    amount: totalAmount,
    status: 'deposited',
    createdAt: new Date()
  }).returning();

  await db.update(checksTable)
    .set({
      checkDepositId: deposit.id,
      status: 'deposited'
    })
    .where(inArray(checksTable.id, body.checkIds))
    .run();

  return c.json({ success: true, data: deposit });
});

app.get('/check-deposits', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const db = drizzle(c.env.DB);

  const deposits = await db.select()
    .from(checkDepositsTable)
    .where(eq(checkDepositsTable.seasonId, season))
    .orderBy(desc(checkDepositsTable.date), desc(checkDepositsTable.id))
    .all();

  return c.json({ success: true, data: deposits });
});

app.post('/check-deposits/:id/clear', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as any;
  const db = drizzle(c.env.DB);

  if (!body.bankTransactionId) {
    return c.json({ success: false, error: 'bankTransactionId requis.' }, 400);
  }

  await db.update(checkDepositsTable)
    .set({
      status: 'cleared',
      bankTransactionId: body.bankTransactionId
    })
    .where(eq(checkDepositsTable.id, id))
    .run();

  await db.update(bankTransactionsTable)
    .set({
      status: 'reconciled'
    })
    .where(eq(bankTransactionsTable.id, body.bankTransactionId))
    .run();

  return c.json({ success: true });
});

app.post('/check-deposits/:id/delete', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);

  const deposit = await db.select().from(checkDepositsTable).where(eq(checkDepositsTable.id, id)).get();
  if (!deposit) {
    return c.json({ success: false, error: 'Remise de chèques non trouvée.' }, 404);
  }

  if (deposit.bankTransactionId) {
    await db.update(bankTransactionsTable)
      .set({ status: 'pending' })
      .where(eq(bankTransactionsTable.id, deposit.bankTransactionId))
      .run();
  }

  await db.update(checksTable)
    .set({
      checkDepositId: null,
      status: 'received'
    })
    .where(eq(checksTable.checkDepositId, id))
    .run();

  await db.delete(checkDepositsTable).where(eq(checkDepositsTable.id, id)).run();
  return c.json({ success: true });
});

export default app;



