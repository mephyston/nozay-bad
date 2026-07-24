import { type Db } from '@nba/db';
import { ImportMembersRepository } from './repository';
import { CsvHeadersInvalidError } from '../shared/errors';
import { ImportMembersFromCsvInput, ImportMembersFromCsvOutput } from "./dto";

interface ParsedMember {
  licence: string;
  seasonCode: string;
  lastName: string;
  firstName: string;
  gender: 'M' | 'F';
  birthDate: string;
  email: string | null;
  phone: string | null;
  status: string;
  type: string;
  amountDueCents: number;
  amountReceivedCents: number;
  amountRemainingCents: number;
  paid: boolean;
  parent1Name: string | null;
  parent1Email: string | null;
  parent1Phone: string | null;
  parent2Name: string | null;
  parent2Email: string | null;
  parent2Phone: string | null;
}

export async function importMembersFromCsv(db: Db, csvText: ImportMembersFromCsvInput): Promise<ImportMembersFromCsvOutput> {
  const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) {
    throw new CsvHeadersInvalidError('Le fichier CSV est vide.');
  }

  const headerLine = lines[0];
  const separator = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(separator).map(h => h.trim().replace(/^"(.*)"$/, '$1').trim());

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
    throw new CsvHeadersInvalidError();
  }

  const validRowsMap = new Map<string, ParsedMember>();
  let errorsCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split(separator).map(col => col.trim().replace(/^"(.*)"$/, '$1').trim());

    const licence = columns[licenceIdx];
    const seasonCode = columns[seasonIdx];
    const lastName = columns[lastNameIdx];
    const firstName = columns[firstNameIdx];
    const rawGender = columns[genderIdx];
    const rawBirthDate = columns[birthDateIdx];
    const email = emailIdx !== -1 ? (columns[emailIdx] || null) : null;
    const phone = phoneIdx !== -1 ? (columns[phoneIdx] || null) : null;
    const rawStatus = statusIdx !== -1 ? (columns[statusIdx] || 'valide') : 'valide';
    const type = columns[typeIdx];

    if (!licence || !lastName || !firstName || !rawBirthDate || !type || !seasonCode) {
      errorsCount++;
      continue;
    }

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

    let birthDate = rawBirthDate;
    if (/^\d{2}-\d{2}-\d{4}$/.test(rawBirthDate)) {
      const parts = rawBirthDate.split('-');
      birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(rawBirthDate)) {
      errorsCount++;
      continue;
    }

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

    const amountDueCents = parseAmount(amountDueIdx);
    const amountReceivedCents = parseAmount(amountReceivedIdx);
    const amountRemainingCents = parseAmount(amountRemainingIdx);
    const paid = paidIdx !== -1 && columns[paidIdx] === 'Oui';

    const parent1Name = parent1NameIdx !== -1 ? (columns[parent1NameIdx] || null) : null;
    const parent1Email = parent1EmailIdx !== -1 ? (columns[parent1EmailIdx] || null) : null;
    const parent1Phone = parent1PhoneIdx !== -1 ? (columns[parent1PhoneIdx] || null) : null;
    const parent2Name = parent2NameIdx !== -1 ? (columns[parent2NameIdx] || null) : null;
    const parent2Email = parent2EmailIdx !== -1 ? (columns[parent2EmailIdx] || null) : null;
    const parent2Phone = parent2PhoneIdx !== -1 ? (columns[parent2PhoneIdx] || null) : null;

    validRowsMap.set(`${licence}-${seasonCode}`, {
      licence,
      seasonCode,
      lastName,
      firstName,
      gender: genderStr,
      birthDate,
      email,
      phone,
      status,
      type,
      amountDueCents,
      amountReceivedCents,
      amountRemainingCents,
      paid,
      parent1Name,
      parent1Email,
      parent1Phone,
      parent2Name,
      parent2Email,
      parent2Phone,
    });
  }

  const repo = new ImportMembersRepository();

  const uniqueSeasons = new Set<string>();
  validRowsMap.forEach(member => uniqueSeasons.add(member.seasonCode));

  const seasonsToInsert = Array.from(uniqueSeasons).map(seasonCode => {
    const parts = seasonCode.split('-');
    const name = parts.length === 2 ? `Saison 20${parts[0]}-20${parts[1]}` : `Saison ${seasonCode}`;
    const startYear = parts.length === 2 ? `20${parts[0]}` : '2025';
    const endYear = parts.length === 2 ? `20${parts[1]}` : '2026';
    return {
      code: seasonCode,
      name,
      startDate: `${startYear}-09-01`,
      endDate: `${endYear}-08-31`,
      active: false,
      createdAt: new Date()
    };
  });

  await repo.insertSeasons(db, seasonsToInsert);
  const seasonIdMap = await repo.getSeasonIdMap(db, Array.from(uniqueSeasons));

  const membersArray = Array.from(validRowsMap.values());
  const licencesList = membersArray.map(m => m.licence);
  const seasonIdsList = Array.from(seasonIdMap.values());
  const existingLicenceSeasons = await repo.getExistingLicenceSeasons(db, licencesList, seasonIdsList);

  let inserted = 0;
  let updated = 0;

  membersArray.forEach(member => {
    const sId = seasonIdMap.get(member.seasonCode)!;
    const key = `${member.licence}-${sId}`;
    if (existingLicenceSeasons.has(key)) {
      updated++;
    } else {
      inserted++;
    }
  });

  const importedAt = new Date();
  const membersToUpsert = membersArray.map(m => {
    const seasonId = seasonIdMap.get(m.seasonCode)!;
    const { seasonCode, ...rest } = m;
    return {
      ...rest,
      seasonId,
      importedAt
    };
  });

  await repo.batchUpsertMembers(db, membersToUpsert);

  return {
    inserted,
    updated,
    errors: errorsCount,
  };
}
