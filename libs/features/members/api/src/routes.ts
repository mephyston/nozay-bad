import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, or, eq, like, inArray, desc, sql } from 'drizzle-orm';
import { membersTable, seasonsTable } from '@metacult/features-members-data-access';
import { Type } from '@sinclair/typebox';
import { tbValidator } from '@hono/typebox-validator';
import { AppError } from '@metacult/shared-db';

export type Bindings = {
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

export const membersRouter = new Hono<{ Bindings: Bindings }>();

const importMembersSchema = Type.Object({
  file: Type.Any()
});

membersRouter.post('/import', async (c, next) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
    throw new AppError('Payload Too Large: Le fichier dépasse la limite autorisée de 5 Mo', 413);
  }
  await next();
}, tbValidator('form', importMembersSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const { file } = c.req.valid('form');
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

membersRouter.get('/', async (c) => {
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

  const paid = c.req.query('paid');
  if (paid === 'true') {
    conditions.push(eq(membersTable.paid, true));
  } else if (paid === 'false') {
    conditions.push(eq(membersTable.paid, false));
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

membersRouter.get('/:licence', async (c) => {
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

membersRouter.get('/:id/cse-data', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  const member = await db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  if (!member) return c.json({ success: false, error: 'Membre introuvable' }, 404);
  if (!member.paid) {
    return c.json({ success: false, error: 'L\'adhérent n\'a pas entièrement réglé sa cotisation.' }, 400);
  }

  // Trouver le règlement comptable lié à ce membre
  const tx = await db.select({
    paymentMethod: sql<string>`payment_method`,
    date: sql<string>`date`
  })
    .from(sql`transactions`)
    .where(sql`member_id = ${id} AND type = 'recette'`)
    .orderBy(sql`date DESC`)
    .limit(1)
    .get() as { paymentMethod: string; date: string } | undefined;

  return c.json({
    success: true,
    data: {
      lastName: member.lastName,
      firstName: member.firstName,
      birthDate: member.birthDate,
      amount: member.amountDue,
      paymentMethod: tx ? tx.paymentMethod : 'virement',
      paymentDate: tx ? tx.date : 'date de validation',
      season: member.season
    }
  });
});
