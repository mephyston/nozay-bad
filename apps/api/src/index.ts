import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { inArray } from 'drizzle-orm';
import { membersTable } from '../../libs/shared/db/src/schema';

type Bindings = {
  DB: D1Database;
};

interface ParsedMember {
  licence: string;
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
  } else if (typeof file === 'object' && file !== null && 'text' in file && typeof (file as any).text === 'function') {
    try {
      csvText = await (file as any).text();
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
  const headers = headerLine.split(separator).map(h => h.trim());

  const requiredHeaders = ['Licence', 'Nom', 'Prénom', 'Sexe', 'Date de naissance', 'Email', 'Téléphone', 'Statut', 'Type'];
  const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));
  if (missingHeaders.length > 0) {
    return c.json({ success: false, error: `Invalid headers. Missing: ${missingHeaders.join(', ')}` }, 400);
  }

  const validRowsMap = new Map<string, ParsedMember>();
  let errorsCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split(separator).map(col => col.trim().replace(/^"(.*)"$/, '$1').trim());

    // Map column values to headers by index
    const rowData: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowData[header] = columns[idx] !== undefined ? columns[idx] : '';
    });

    const licence = rowData['Licence'];
    const lastName = rowData['Nom'];
    const firstName = rowData['Prénom'];
    const genderStr = rowData['Sexe']?.toUpperCase();
    const birthDate = rowData['Date de naissance'];
    const email = rowData['Email'] || null;
    const phone = rowData['Téléphone'] || null;
    const status = rowData['Statut'] || 'valide';
    const type = rowData['Type'];

    if (!licence || !lastName || !firstName || !birthDate || !type) {
      errorsCount++;
      continue;
    }

    if (genderStr !== 'M' && genderStr !== 'F') {
      errorsCount++;
      continue;
    }

    validRowsMap.set(licence, {
      licence,
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

  const licenses = Array.from(validRowsMap.keys());
  const db = drizzle(c.env.DB);
  const existingLicences = new Set<string>();

  if (licenses.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < licenses.length; i += chunkSize) {
      const chunk = licenses.slice(i, i + chunkSize);
      const existing = await db.select({ licence: membersTable.licence })
        .from(membersTable)
        .where(inArray(membersTable.licence, chunk))
        .all();
      existing.forEach(m => existingLicences.add(m.licence));
    }
  }

  let inserted = 0;
  let updated = 0;
  const importedAt = new Date();

  const batchPromises = Array.from(validRowsMap.values()).map(member => {
    const isUpdate = existingLicences.has(member.licence);
    if (isUpdate) {
      updated++;
    } else {
      inserted++;
    }

    return db.insert(membersTable)
      .values({
        licence: member.licence,
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
        target: membersTable.licence,
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

export default app;

