import { describe, it, expect } from 'vitest';
import {
  normaliseCheckNumber,
  parseFrenchAmountWords,
  parseAmountFigures,
  chooseAmountCents,
  normaliseIssueDate,
  pickEmitter,
  looksLikeClub
} from './extraction';

/** Les formes du club de test, telles que `clubNameVariants` les produirait. */
const FORMES = ['nozay badminton association', 'nozay badminton', 'nba 91', 'nba', 'nba91'];

const TODAY = new Date('2026-09-08T12:00:00Z');

describe('normaliseCheckNumber', () => {
  it('garde les sept chiffres du numéro, zéros de tête compris', () => {
    expect(normaliseCheckNumber('0012345')).toBe('0012345');
    expect(normaliseCheckNumber('N° 2512612')).toBe('2512612');
  });

  it('isole le premier bloc de la ligne CMC7 quand le modèle rend toute la ligne', () => {
    // Numéro, puis code banque et guichet, puis compte : seul le premier est le chèque.
    expect(normaliseCheckNumber('2512612 30004 00812 00012345678')).toBe('2512612');
    expect(normaliseCheckNumber('251 2612')).toBe('2512612');
  });

  it('tolère un numéro de six ou huit chiffres, mais jamais un compte', () => {
    expect(normaliseCheckNumber('123456')).toBe('123456');
    expect(normaliseCheckNumber('00012345678')).toBe('');
    expect(normaliseCheckNumber('')).toBe('');
  });
});

describe('parseFrenchAmountWords', () => {
  it('lit les formes courantes de la ligne en lettres', () => {
    expect(parseFrenchAmountWords('cent cinquante')).toBe(15000);
    expect(parseFrenchAmountWords('Cent cinquante euros')).toBe(15000);
    expect(parseFrenchAmountWords('deux cents')).toBe(20000);
    expect(parseFrenchAmountWords('mille deux cent trente-cinq euros')).toBe(123500);
    expect(parseFrenchAmountWords('quatre-vingt-dix')).toBe(9000);
    expect(parseFrenchAmountWords('soixante-quinze euros et vingt centimes')).toBe(7520);
    expect(parseFrenchAmountWords('vingt et un euros')).toBe(2100);
    expect(parseFrenchAmountWords('cent euros 50')).toBe(10050);
  });

  it('rend null sur un texte qui n’est pas un nombre', () => {
    expect(parseFrenchAmountWords('')).toBeNull();
    expect(parseFrenchAmountWords('illisible')).toBeNull();
    expect(parseFrenchAmountWords(null)).toBeNull();
  });
});

describe('parseAmountFigures', () => {
  it('lit la case en chiffres avec virgule, point, euro ou espace', () => {
    expect(parseAmountFigures('150,00')).toBe(15000);
    expect(parseAmountFigures('150.00')).toBe(15000);
    expect(parseAmountFigures('150 € 00')).toBe(15000);
    expect(parseAmountFigures('150')).toBe(15000);
    expect(parseAmountFigures('1 250,50')).toBe(125050);
    expect(parseAmountFigures('42,5')).toBe(4250);
    expect(parseAmountFigures('75 EUR')).toBe(7500);
  });

  it('accepte un nombre déjà décodé, en euros', () => {
    expect(parseAmountFigures(150)).toBe(15000);
    expect(parseAmountFigures(42.5)).toBe(4250);
    expect(parseAmountFigures(0)).toBeNull();
  });
});

describe('chooseAmountCents', () => {
  it('fait foi aux lettres quand elles divergent des chiffres', () => {
    // La virgule manuscrite de la case se lit mal ; « cent cinquante » ne se lit pas mal.
    expect(chooseAmountCents('1500,0', 'cent cinquante euros')).toBe(15000);
  });

  it('se rabat sur les chiffres quand les lettres manquent, et sur zéro sans rien', () => {
    expect(chooseAmountCents('42,50', null)).toBe(4250);
    expect(chooseAmountCents(null, 'illisible')).toBe(0);
  });
});

describe('normaliseIssueDate', () => {
  it('lit les formes manuscrites courantes, siècle sous-entendu', () => {
    expect(normaliseIssueDate('05/09/26', TODAY)).toBe('2026-09-05');
    expect(normaliseIssueDate('5-9-2026', TODAY)).toBe('2026-09-05');
    expect(normaliseIssueDate('05.09.26', TODAY)).toBe('2026-09-05');
    expect(normaliseIssueDate('5 septembre 2026', TODAY)).toBe('2026-09-05');
    expect(normaliseIssueDate('1er sept. 26', TODAY)).toBe('2026-09-01');
    expect(normaliseIssueDate('2026-09-05', TODAY)).toBe('2026-09-05');
  });

  it('rejette une date à plus d’un an du jour de lecture', () => {
    // Un « 26 » manuscrit lu « 20 » : mieux vaut aucune date qu'une recette datée de 2020.
    expect(normaliseIssueDate('05/09/20', TODAY)).toBeNull();
    expect(normaliseIssueDate('05/09/2030', TODAY)).toBeNull();
  });

  it('rejette une date impossible ou illisible', () => {
    expect(normaliseIssueDate('31/02/26', TODAY)).toBeNull();
    expect(normaliseIssueDate('le', TODAY)).toBeNull();
    expect(normaliseIssueDate(null, TODAY)).toBeNull();
  });
});

describe('pickEmitter', () => {
  it('retient le titulaire imprimé, jamais le club bénéficiaire', () => {
    expect(pickEmitter('M OU MME JEAN DUPONT', 'Nozay Badminton', FORMES)).toBe('M OU MME JEAN DUPONT');
    expect(pickEmitter('Nozay Badminton Association', 'Nozay Badminton', FORMES)).toBe('');
    expect(pickEmitter('NBA 91', null, FORMES)).toBe('');
  });

  it('reprend le bénéficiaire quand le modèle a interverti les deux : le club est toujours le bénéficiaire', () => {
    expect(pickEmitter('Nozay Badminton', 'Marie Durand', FORMES)).toBe('Marie Durand');
    expect(pickEmitter('', 'Nozay Badminton', FORMES)).toBe('');
    expect(pickEmitter('', '')).toBe('');
  });

  it('reconnaît les formes du club, génériques ou propres au club', () => {
    expect(looksLikeClub('ASSOCIATION NOZAY BAD')).toBe(true);
    expect(looksLikeClub('NBA 91', FORMES)).toBe(true);
    expect(looksLikeClub('NBA 91')).toBe(false); // sans les formes du club, le sigle seul ne dit rien
    expect(looksLikeClub('Jean Dupont', FORMES)).toBe(false);
  });
});
