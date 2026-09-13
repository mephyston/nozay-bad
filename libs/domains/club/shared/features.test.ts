import { describe, it, expect } from 'vitest';
import {
  FEATURES,
  FEATURE_CATALOG,
  FEATURE_GROUPS,
  FEATURE_PREREQUISITES,
  effectiveFeatures,
  isFeature
} from './features';

describe('catalogue des fonctionnalités', () => {
  it('donne un libellé, une description et un groupe connu à chaque clé', () => {
    for (const feature of FEATURES) {
      const info = FEATURE_CATALOG[feature];
      expect(info?.label, feature).toBeTruthy();
      expect(info?.description, feature).toBeTruthy();
      expect(FEATURE_GROUPS, `${feature} : groupe inconnu`).toContain(info.group);
    }
  });

  it("ne décrit rien qui ne soit pas au catalogue (l'inverse du test précédent)", () => {
    expect(Object.keys(FEATURE_CATALOG).sort()).toEqual([...FEATURES].sort());
  });

  it("n'invente aucun préalable hors du catalogue, et jamais sur soi-même", () => {
    for (const [feature, required] of Object.entries(FEATURE_PREREQUISITES)) {
      expect(isFeature(feature), feature).toBe(true);
      for (const one of required ?? []) {
        expect(isFeature(one), `${feature} → ${one}`).toBe(true);
        expect(one, `${feature} dépend de lui-même`).not.toBe(feature);
      }
    }
  });

  it('allume tout ce qui n’a pas été réglé', () => {
    const state = effectiveFeatures({});
    for (const feature of FEATURES) expect(state[feature], feature).toBe(true);
  });

  it('éteint ce dont le préalable est éteint, même réglé allumé', () => {
    const state = effectiveFeatures({ push: false, reminder_unpaid: true, accounting: false });
    expect(state.reminder_unpaid).toBe(false);
    expect(state.checks).toBe(false);
    // Ce qui ne dépend de rien reste tel quel — les factures s'émettent sans grand livre.
    expect(state.shop).toBe(true);
    expect(state.invoices).toBe(true);
  });

  it('ferme la comptabilité, et ce qui en dépend, à un club sans compte bancaire actif', () => {
    const state = effectiveFeatures({}, { hasBankAccount: false });
    expect(state.accounting).toBe(false);
    expect(state.checks).toBe(false);
    expect(state.invoices).toBe(true);
    expect(state.expenses).toBe(true);
    expect(effectiveFeatures({}, { hasBankAccount: true }).accounting).toBe(true);
  });
});
