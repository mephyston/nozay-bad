import { describe, it, expect } from 'vitest';
import { sanitizeRichText, richTextToPlain, isRichTextEmpty } from './rich-text';

describe('sanitizeRichText — balisage conservé', () => {
  it('conserve la mise en forme autorisée', () => {
    const html = '<p>Le tournoi a lieu <strong>samedi</strong>, en <em>simple</em> et <u>double</u>.</p>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('conserve les listes', () => {
    const html = '<ul><li>Volants</li><li>Cordages</li></ul><ol><li>Premier</li></ol>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('conserve les sauts de ligne sans exiger de fermeture', () => {
    expect(sanitizeRichText('<p>Ligne 1<br>Ligne 2</p>')).toBe('<p>Ligne 1<br>Ligne 2</p>');
    expect(sanitizeRichText('<p>Ligne 1<br/>Ligne 2</p>')).toBe('<p>Ligne 1<br>Ligne 2</p>');
  });

  it("ramène le balisage de présentation d'execCommand au balisage sémantique", () => {
    expect(sanitizeRichText('<b>gras</b> et <i>italique</i>')).toBe('<strong>gras</strong> et <em>italique</em>');
    expect(sanitizeRichText('<div>Un paragraphe</div>')).toBe('<p>Un paragraphe</p>');
  });
});

describe('sanitizeRichText — balisage rejeté', () => {
  it('supprime un script avec son contenu', () => {
    expect(sanitizeRichText('<p>Avant</p><script>alert(1)</script><p>Après</p>')).toBe(
      '<p>Avant</p><p>Après</p>'
    );
  });

  it('supprime un script non fermé sans rien laisser derrière', () => {
    expect(sanitizeRichText('<p>Avant</p><script>alert(1)')).toBe('<p>Avant</p>');
  });

  it('supprime les styles, iframes et svg avec leur contenu', () => {
    expect(sanitizeRichText('<style>body{display:none}</style><p>Texte</p>')).toBe('<p>Texte</p>');
    expect(sanitizeRichText('<iframe src="https://evil.example"></iframe><p>Texte</p>')).toBe('<p>Texte</p>');
    expect(sanitizeRichText('<svg><script>alert(1)</script></svg><p>Texte</p>')).toBe('<p>Texte</p>');
  });

  it('déballe une balise inconnue en conservant son texte', () => {
    expect(sanitizeRichText('<span style="color:red">Rouge</span>')).toBe('Rouge');
    expect(sanitizeRichText('<div class="x"><h1>Titre</h1></div>')).toBe('<p>Titre</p>');
  });

  it('retire tout attribut, y compris les gestionnaires d\'événements', () => {
    expect(sanitizeRichText('<p onclick="alert(1)">Texte</p>')).toBe('<p>Texte</p>');
    expect(sanitizeRichText('<strong onmouseover=alert(1)>Gras</strong>')).toBe('<strong>Gras</strong>');
  });

  it('supprime commentaires et déclarations', () => {
    expect(sanitizeRichText('<!-- caché --><p>Texte</p>')).toBe('<p>Texte</p>');
    expect(sanitizeRichText('<!DOCTYPE html><p>Texte</p>')).toBe('<p>Texte</p>');
  });
});

describe('sanitizeRichText — liens', () => {
  it('conserve un lien https, http, mailto ou relatif', () => {
    expect(sanitizeRichText('<a href="https://nozaybad.fr">Site</a>')).toBe(
      '<a href="https://nozaybad.fr">Site</a>'
    );
    expect(sanitizeRichText('<a href="http://nozaybad.fr">Site</a>')).toBe(
      '<a href="http://nozaybad.fr">Site</a>'
    );
    expect(sanitizeRichText('<a href="mailto:bureau@nozaybad.fr">Écrire</a>')).toBe(
      '<a href="mailto:bureau@nozaybad.fr">Écrire</a>'
    );
    expect(sanitizeRichText('<a href="/boutique">Boutique</a>')).toBe('<a href="/boutique">Boutique</a>');
  });

  it('retire le lien mais garde le libellé quand le schéma est refusé', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">Cliquez</a>')).toBe('Cliquez');
    expect(sanitizeRichText('<a href="data:text/html,<script>">Cliquez</a>')).toBe('Cliquez');
    expect(sanitizeRichText('<a href="vbscript:msgbox">Cliquez</a>')).toBe('Cliquez');
  });

  it('démasque un schéma dissimulé par des entités ou des caractères de contrôle', () => {
    expect(sanitizeRichText('<a href="java&#115;cript:alert(1)">Cliquez</a>')).toBe('Cliquez');
    expect(sanitizeRichText('<a href="java\nscript:alert(1)">Cliquez</a>')).toBe('Cliquez');
    expect(sanitizeRichText('<a href="  JaVaScRiPt:alert(1)">Cliquez</a>')).toBe('Cliquez');
  });

  it('refuse une URL protocole-relative, qui pointerait vers un domaine tiers', () => {
    expect(sanitizeRichText('<a href="//evil.example/x">Cliquez</a>')).toBe('Cliquez');
  });

  it('refuse un lien sans href', () => {
    expect(sanitizeRichText('<a>Texte</a>')).toBe('Texte');
  });

  it('échappe les guillemets pour empêcher la sortie de l\'attribut', () => {
    const out = sanitizeRichText('<a href=\'https://x.fr/?a="onmouseover=alert(1)\'>Lien</a>');
    expect(out).toContain('&quot;');
    expect(out).not.toContain('onmouseover=alert(1)>');
  });
});

describe('sanitizeRichText — robustesse', () => {
  it('échappe un chevron isolé dans le texte', () => {
    expect(sanitizeRichText('<p>5 &lt; 10 et a > b</p>')).toBe('<p>5 &lt; 10 et a &gt; b</p>');
  });

  it('ne double pas les entités déjà encodées', () => {
    expect(sanitizeRichText('<p>Volants &amp; cordages</p>')).toBe('<p>Volants &amp; cordages</p>');
  });

  it('ferme les balises laissées ouvertes', () => {
    expect(sanitizeRichText('<p>Texte')).toBe('<p>Texte</p>');
    expect(sanitizeRichText('<ul><li>Un')).toBe('<ul><li>Un</li></ul>');
  });

  it('ignore une fermeture orpheline', () => {
    expect(sanitizeRichText('Texte</strong>')).toBe('Texte');
  });

  it('redresse une imbrication croisée', () => {
    expect(sanitizeRichText('<strong><em>Texte</strong></em>')).toBe('<strong><em>Texte</em></strong>');
  });

  it('accepte une chaîne vide', () => {
    expect(sanitizeRichText('')).toBe('');
  });

  it('est idempotent', () => {
    const messy = '<div><span>Bonjour</span> <b>tous</b><script>alert(1)</script>';
    const once = sanitizeRichText(messy);
    expect(sanitizeRichText(once)).toBe(once);
  });
});

describe('richTextToPlain', () => {
  it('retire le balisage et normalise les espaces', () => {
    expect(richTextToPlain('<p>Le tournoi a lieu <strong>samedi</strong>.</p>', 300)).toBe(
      'Le tournoi a lieu samedi.'
    );
  });

  it('sépare les blocs pour ne pas recoller les mots', () => {
    expect(richTextToPlain('<ul><li>Volants</li><li>Cordages</li></ul>', 300)).toBe('Volants Cordages');
    expect(richTextToPlain('<p>Fin</p><p>Début</p>', 300)).toBe('Fin Début');
  });

  it('décode les entités', () => {
    expect(richTextToPlain('<p>Volants &amp; cordages</p>', 300)).toBe('Volants & cordages');
  });

  it('tronque sur un mot entier en signalant la coupe', () => {
    const out = richTextToPlain('<p>Le tournoi interne aura lieu samedi prochain</p>', 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith('…')).toBe(true);
    expect(out).toBe('Le tournoi interne…');
  });

  it('ne tronque pas un texte assez court', () => {
    expect(richTextToPlain('<p>Court</p>', 300)).toBe('Court');
  });
});

describe('isRichTextEmpty', () => {
  it('reconnaît un contenu sans texte visible', () => {
    expect(isRichTextEmpty('')).toBe(true);
    expect(isRichTextEmpty('<p></p>')).toBe(true);
    expect(isRichTextEmpty('<p>   </p><br>')).toBe(true);
  });

  it('reconnaît un contenu porteur de texte', () => {
    expect(isRichTextEmpty('<p>Texte</p>')).toBe(false);
  });
});
