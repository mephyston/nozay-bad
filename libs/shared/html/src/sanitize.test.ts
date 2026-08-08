import { describe, it, expect } from 'vitest';
import { sanitizeRichText, richTextToPlain, isRichTextEmpty } from './index';
import { ANNOUNCEMENT_PROFILE, CMS_PROFILE } from './profile';

/**
 * Le comportement du profil « annonce » est verrouillé par
 * `libs/domains/announcements/shared/rich-text.test.ts`, qui n'a pas bougé lors de
 * l'extraction vers cette lib. On ne le redouble pas ici : ce fichier couvre ce que
 * le profil « site public » ajoute, et les frontières entre les deux.
 */

const cms = (html: string) => sanitizeRichText(html, CMS_PROFILE);

describe('CMS_PROFILE — structure de document', () => {
  it('conserve les titres de niveau 2 à 4', () => {
    expect(cms('<h2>Section</h2><h3>Sous-section</h3><h4>Détail</h4>')).toBe(
      '<h2>Section</h2><h3>Sous-section</h3><h4>Détail</h4>'
    );
  });

  it("ramène h1 sur h2 : le h1 est le titre de la page, unique par document", () => {
    expect(cms('<h1>Titre importé</h1>')).toBe('<h2>Titre importé</h2>');
  });

  it('ramène h5 et h6 sur h4 plutôt que de les perdre', () => {
    expect(cms('<h5>Cinq</h5><h6>Six</h6>')).toBe('<h4>Cinq</h4><h4>Six</h4>');
  });

  it('conserve citations, séparateurs et figures', () => {
    expect(cms('<blockquote><p>Cité</p></blockquote><hr><figure><figcaption>Légende</figcaption></figure>')).toBe(
      '<blockquote><p>Cité</p></blockquote><hr><figure><figcaption>Légende</figcaption></figure>'
    );
  });

  it('conserve les enrichissements de texte supplémentaires', () => {
    expect(cms('<s>barré</s> <del>retiré</del> <sup>haut</sup> <sub>bas</sub>')).toBe(
      '<s>barré</s> <del>retiré</del> <sup>haut</sup> <sub>bas</sub>'
    );
  });

  it('ramène strike sur del', () => {
    expect(cms('<strike>ancien</strike>')).toBe('<del>ancien</del>');
  });
});

describe('CMS_PROFILE — tableaux (la grille tarifaire de /inscription/)', () => {
  it('conserve la structure complète', () => {
    const html = '<table><thead><tr><th>Groupe</th><th>Tarif</th></tr></thead><tbody><tr><td>Minibad</td><td>186 €</td></tr></tbody></table>';
    expect(cms(html)).toBe(html);
  });

  it('accepte colspan et rowspan numériques', () => {
    expect(cms('<table><tr><td colspan="2" rowspan="3">Fusion</td></tr></table>')).toBe(
      '<table><tr><td colspan="2" rowspan="3">Fusion</td></tr></table>'
    );
  });

  it('refuse une portée non numérique sans faire disparaître la cellule', () => {
    expect(cms('<table><tr><td colspan="alert(1)">Texte</td></tr></table>')).toBe(
      '<table><tr><td>Texte</td></tr></table>'
    );
  });
});

describe('CMS_PROFILE — images', () => {
  it('conserve une image de notre médiathèque avec ses dimensions', () => {
    expect(cms('<img src="/media/a1b2c3/800.avif" alt="L\'équipe" width="800" height="600">')).toBe(
      '<img src="/media/a1b2c3/800.avif" alt="L\'équipe" width="800" height="600" loading="lazy" decoding="async">'
    );
  });

  it('rejette une image distante en entier — ni pixel de suivi, ni contenu mixte', () => {
    expect(cms('<p>Avant</p><img src="https://evil.example/pixel.gif"><p>Après</p>')).toBe(
      '<p>Avant</p><p>Après</p>'
    );
    expect(cms('<img src="//evil.example/pixel.gif">')).toBe('');
  });

  it('rejette une image sans source', () => {
    expect(cms('<img alt="orpheline">')).toBe('');
  });

  it('ne laisse passer aucun attribut non déclaré', () => {
    expect(cms('<img src="/media/x/1.webp" onerror="alert(1)" srcset="https://evil.example/x">')).toBe(
      '<img src="/media/x/1.webp" loading="lazy" decoding="async">'
    );
  });

  it('refuse une dimension aberrante plutôt que de la recopier', () => {
    expect(cms('<img src="/media/x/1.webp" width="-5" height="99999999">')).toBe(
      '<img src="/media/x/1.webp" loading="lazy" decoding="async">'
    );
  });
});

describe('CMS_PROFILE — liens', () => {
  it('impose rel sur une ouverture dans un nouvel onglet', () => {
    expect(cms('<a href="https://ffbad.org" target="_blank">FFBaD</a>')).toBe(
      '<a href="https://ffbad.org" target="_blank" rel="noopener noreferrer">FFBaD</a>'
    );
  });

  it('ne lit jamais rel depuis l\'entrée', () => {
    expect(cms('<a href="https://x.fr" rel="me nofollow">Lien</a>')).toBe('<a href="https://x.fr">Lien</a>');
  });

  it('refuse une cible autre que _blank', () => {
    expect(cms('<a href="https://x.fr" target="_top">Lien</a>')).toBe('<a href="https://x.fr">Lien</a>');
  });

  it('ne confond pas data-href avec href', () => {
    // Le découpage se fait sur le nom entier de l'attribut : une recherche par
    // sous-chaîne aurait pris la valeur de `data-href` pour celle d'un `href`.
    expect(cms('<a data-href="https://x.fr">Texte</a>')).toBe('Texte');
  });
});

describe('CMS_PROFILE — ancres de titre', () => {
  it('conserve un identifiant simple', () => {
    expect(cms('<h2 id="tarifs-2026">Tarifs</h2>')).toBe('<h2 id="tarifs-2026">Tarifs</h2>');
  });

  it('refuse un identifiant hors de [a-z0-9-]', () => {
    expect(cms('<h2 id="Mes Tarifs">Tarifs</h2>')).toBe('<h2>Tarifs</h2>');
    expect(cms('<h2 id="x&quot; onload=&quot;alert(1)">Tarifs</h2>')).toBe('<h2>Tarifs</h2>');
  });
});

describe('CMS_PROFILE — les gardes du moteur restent en place', () => {
  it('supprime les sous-arbres dangereux avec leur contenu', () => {
    expect(cms('<h2>Avant</h2><script>alert(1)</script><p>Après</p>')).toBe('<h2>Avant</h2><p>Après</p>');
    expect(cms('<iframe src="https://evil.example"></iframe><p>Texte</p>')).toBe('<p>Texte</p>');
  });

  it('refuse toujours un schéma d\'URL dangereux', () => {
    expect(cms('<a href="javascript:alert(1)">Cliquez</a>')).toBe('Cliquez');
  });

  it('redresse une imbrication croisée', () => {
    expect(cms('<h2><strong>Titre</h2></strong>')).toBe('<h2><strong>Titre</strong></h2>');
  });

  it('est idempotent', () => {
    const once = cms('<h2 id="a">Titre</h2><img src="/media/x/1.webp" alt="A"><table><tr><td>1</td></tr></table>');
    expect(cms(once)).toBe(once);
  });
});

describe('cloisonnement des profils', () => {
  it("le profil annonce ignore tout ce que le profil site public ajoute", () => {
    expect(sanitizeRichText('<h2>Titre</h2>', ANNOUNCEMENT_PROFILE)).toBe('Titre');
    expect(sanitizeRichText('<img src="/media/x/1.webp">', ANNOUNCEMENT_PROFILE)).toBe('');
    expect(sanitizeRichText('<table><tr><td>1</td></tr></table>', ANNOUNCEMENT_PROFILE)).toBe('1');
  });

  it('le profil annonce reste celui par défaut', () => {
    expect(sanitizeRichText('<h2>Titre</h2>')).toBe('Titre');
  });
});

describe('richTextToPlain — séparation des blocs du site public', () => {
  it('sépare titres, cellules et paragraphes', () => {
    expect(richTextToPlain('<h2>Tarifs</h2><p>Voici :</p>', 300, CMS_PROFILE)).toBe('Tarifs Voici :');
    expect(
      richTextToPlain('<table><tr><td>Minibad</td><td>186 €</td></tr></table>', 300, CMS_PROFILE)
    ).toBe('Minibad 186 €');
  });

  it('traite hr comme une césure', () => {
    expect(richTextToPlain('<p>Un</p><hr><p>Deux</p>', 300, CMS_PROFILE)).toBe('Un Deux');
  });

  it("considère un contenu purement illustré comme vide — c'est au bloc, pas au texte, de porter l'image", () => {
    expect(isRichTextEmpty('<img src="/media/x/1.webp" alt="Équipe">', CMS_PROFILE)).toBe(true);
  });
});
