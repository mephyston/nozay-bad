import { describe, it, expect } from 'vitest';
import { obfuscateEmails } from './obfuscate-emails';

/**
 * La propriété qui compte tient en une phrase : **plus aucune adresse lisible ne doit
 * subsister dans la sortie**. Le reste — la forme de l'enveloppe, le choix de
 * l'encodage — n'est qu'un moyen, et peut changer sans casser ces tests.
 */
const decode = (base64: string) => Buffer.from(base64, 'base64').toString('binary');
const dataOf = (html: string) => [...html.matchAll(/data-eml="([^"]+)"/g)].map((m) => decode(m[1]));

/** Ce que cherche un moissonneur : une arobase entourée de mots. */
const HARVESTABLE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/;

describe('obfuscateEmails', () => {
  it('retire du texte toute adresse moissonnable, en gardant le sens pour un humain', () => {
    const out = obfuscateEmails('<p>Écrivez à contact@nozaybad.fr pour toute question.</p>');
    expect(HARVESTABLE.test(out)).toBe(false);
    expect(out).toContain('contact [arobase] nozaybad.fr');
    expect(dataOf(out)).toEqual(['contact@nozaybad.fr']);
  });

  it('neutralise le href d’un lien mailto — le plus facile à moissonner', () => {
    const out = obfuscateEmails('<p><a href="mailto:contact@nozaybad.fr">Nous écrire</a></p>');
    expect(HARVESTABLE.test(out)).toBe(false);
    expect(out).toContain('href="#"');
    // Le libellé choisi par le rédacteur est conservé tel quel.
    expect(out).toContain('>Nous écrire<');
    expect(dataOf(out)).toEqual(['contact@nozaybad.fr']);
  });

  it("traite le lien dont le libellé est l'adresse elle-même", () => {
    const out = obfuscateEmails('<a href="mailto:a@b.fr">a@b.fr</a>');
    expect(HARVESTABLE.test(out)).toBe(false);
    expect(dataOf(out)).toEqual(['a@b.fr', 'a@b.fr']);
  });

  it('laisse le paramètre de sujet hors de l’adresse encodée', () => {
    const out = obfuscateEmails('<a href="mailto:c@d.fr?subject=Bonjour">Écrire</a>');
    expect(dataOf(out)).toEqual(['c@d.fr']);
  });

  it('ne mord pas sur la ponctuation qui suit', () => {
    const out = obfuscateEmails('<p>Contact : a@b.fr.</p>');
    expect(dataOf(out)).toEqual(['a@b.fr']);
    expect(out).toContain('</span>.</p>');
  });

  it('traite plusieurs adresses, dans le texte comme dans les liens', () => {
    const out = obfuscateEmails(
      '<p>a@b.fr et <a href="mailto:c@d.fr">c</a> et e@f.fr</p>'
    );
    expect(HARVESTABLE.test(out)).toBe(false);
    expect(dataOf(out)).toEqual(['a@b.fr', 'c@d.fr', 'e@f.fr']);
  });

  it('ne touche ni aux attributs ni aux adresses de médias', () => {
    const html = '<img src="/media/x/1.webp" alt="Équipe"><a href="/inscription/">S’inscrire</a>';
    expect(obfuscateEmails(html)).toBe(html);
  });

  it('rend l’entrée telle quelle quand il n’y a rien à cacher', () => {
    const html = '<p>Rien à signaler.</p>';
    expect(obfuscateEmails(html)).toBe(html);
    expect(obfuscateEmails('')).toBe('');
  });

  it('est idempotent : un second passage ne réencode pas ce qui est déjà caché', () => {
    const once = obfuscateEmails('<p>a@b.fr</p>');
    expect(obfuscateEmails(once)).toBe(once);
  });
});
