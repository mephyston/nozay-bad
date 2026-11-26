// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { groupByMonth, parseReleaseNotes } from './release-notes';

const SAMPLE = `<!-- généré -->

# Nouveautés

## v2.90.1 — 2026-11-26

### Bug Fixes

* **buvette:** une commande que la carte ne couvre pas se recharge sans être perdue ([f826e52](https://github.com/o/r/commit/f826e525c80edf4cbe2bd58f3ecd53f7dd0f9a57))
* **ci:** ne plus faire commenter les issues ([c02ce36](https://github.com/o/r/commit/c02ce36))

## v2.90.0 — 2026-11-25

### Features

* **indiv:** les séances individuelles s'affichent dans l'espace adhérent ([9847c2f](https://github.com/o/r/commit/9847c2f))
* **shop,storefront:** commander pour un autre adhérent du foyer ([#38](https://github.com/o/r/issues/38)) ([5010cf0](https://github.com/o/r/commit/5010cf0))

### Performance Improvements

* **accounting:** le grand livre s'ouvre plus vite ([1234567](https://github.com/o/r/commit/1234567))

## v2.88.0 — 2026-10-30

### Bug Fixes

* **buvette:** une commande que la carte ne couvre pas se recharge sans être perdue ([aaaaaaa](https://github.com/o/r/commit/aaaaaaa))

# [1.0.0-beta.97](https://github.com/o/r/compare/a...b) (2026-08-19)

### Bug Fixes

* add shrink-0 to AdminLayout header ([7df58bb](https://github.com/o/r/commit/7df58bb))
`;

describe('notes de version lisibles', () => {
  const entries = parseReleaseNotes(SAMPLE);

  it("garde le texte, sans lien de commit, et le classe en nouveauté, amélioration ou correction", () => {
    expect(entries.find((e) => e.kind === 'feature')).toMatchObject({
      text: "Les séances individuelles s'affichent dans l'espace adhérent",
      areas: ['Séances individuelles'],
      date: '2026-11-25'
    });
    expect(entries.find((e) => e.kind === 'improvement')).toMatchObject({ text: 'Le grand livre s\'ouvre plus vite', areas: ['Comptabilité'], audience: 'Bureau' });
    expect(entries.every((e) => !e.text.includes('github.com'))).toBe(true);
  });

  it("traduit chaque portée en rubrique et dit qui est concerné", () => {
    expect(entries.find((e) => e.text.startsWith('Commander'))).toMatchObject({ text: 'Commander pour un autre adhérent du foyer', areas: ['Boutique', 'Espace adhérent'], audience: 'Adhérents' });
  });

  it("écarte l'outillage, les bêtas et les lignes reprises d'une version à l'autre", () => {
    expect(entries.some((e) => e.text.includes('issues'))).toBe(false);
    expect(entries.some((e) => e.text.includes('shrink-0'))).toBe(false);
    expect(entries.filter((e) => e.text.startsWith('Une commande'))).toHaveLength(1);
  });

  it('regroupe par mois, le plus récent en tête', () => {
    const months = groupByMonth(entries);
    expect(months.map((m) => m.label)).toEqual(['Novembre 2026']);
    expect(months[0]).toMatchObject({ features: [{}, {}], improvements: [{}], fixes: [{}] });
  });

  it('lit le vrai CHANGELOG.md sans rien laisser de technique', () => {
    const real = parseReleaseNotes(readFileSync(new URL('../../../../CHANGELOG.md', import.meta.url), 'utf8'));
    expect(real.every((e) => !/\]\(https?:/.test(e.text) && !/^\*\*/.test(e.text))).toBe(true);
  });
});
