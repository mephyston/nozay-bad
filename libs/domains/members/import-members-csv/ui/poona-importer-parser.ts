import { REQUIRED_HEADERS } from './poona-importer-types';

export interface ParseCsvResult {
  separator: string;
  totalRows: number;
  csvPreview: any[];
  error?: string;
}

export function parseCsvContent(text: string): ParseCsvResult {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) {
    return { separator: ';', totalRows: 0, csvPreview: [], error: 'Le fichier CSV est vide.' };
  }

  const headerLine = lines[0];
  const sep = headerLine.includes(';') ? ';' : ',';

  const headers = headerLine.split(sep).map(h => h.trim().replace(/^"(.*)"$/, '$1').trim().toLowerCase());

  const missing = REQUIRED_HEADERS.filter(req =>
    !headers.includes(req.toLowerCase()) &&
    !(req === 'Date naissance' && headers.includes('date de naissance')) &&
    !(req === 'Type' && headers.includes('tarif')) &&
    !(req === 'Prénom' && headers.includes('prenom'))
  );

  if (missing.length > 0) {
    return { separator: sep, totalRows: 0, csvPreview: [], error: `En-têtes obligatoires manquants : ${missing.join(', ')}` };
  }

  const totalRows = lines.length - 1;
  const previewRows: any[] = [];
  const licenceIdx = headers.findIndex(h => h === 'licence');
  const seasonIdx = headers.findIndex(h => h === 'saison');
  const lastNameIdx = headers.findIndex(h => h === 'nom');
  const firstNameIdx = headers.findIndex(h => h === 'prénom' || h === 'prenom');
  const genderIdx = headers.findIndex(h => h === 'sexe');
  const birthDateIdx = headers.findIndex(h => h === 'date naissance' || h === 'date de naissance');
  const typeIdx = headers.findIndex(h => h === 'type' || h === 'tarif');

  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const columns = lines[i].split(sep).map(col => col.trim().replace(/^"(.*)"$/, '$1').trim());
    previewRows.push({
      licence: columns[licenceIdx] || '',
      season: columns[seasonIdx] || '',
      lastName: columns[lastNameIdx] || '',
      firstName: columns[firstNameIdx] || '',
      gender: columns[genderIdx] || '',
      birthDate: columns[birthDateIdx] || '',
      type: columns[typeIdx] || ''
    });
  }

  return { separator: sep, totalRows, csvPreview: previewRows };
}
