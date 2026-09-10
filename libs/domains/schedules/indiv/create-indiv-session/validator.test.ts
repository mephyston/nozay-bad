import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { createIndivSessionSchema } from './validator';

const base = { venueId: 1, date: '2026-03-17', startTime: '19:30' };

describe('validation d’une nouvelle soirée d’indiv', () => {
  it('accepte un libellé et une consigne à null : c’est ainsi que le formulaire vide ses champs facultatifs', () => {
    // Régression : la création exigeait une chaîne et répondait « /label: Expected string,
    // /notes: Expected string » à la première soirée saisie sans libellé.
    expect(Value.Check(createIndivSessionSchema, { ...base, label: null, notes: null })).toBe(true);
  });

  it('accepte leur absence comme leur présence', () => {
    expect(Value.Check(createIndivSessionSchema, base)).toBe(true);
    expect(Value.Check(createIndivSessionSchema, { ...base, label: 'Indiv mardi', notes: 'Terrain 4' })).toBe(true);
  });

  it('borne toujours leur longueur', () => {
    expect(Value.Check(createIndivSessionSchema, { ...base, label: 'x'.repeat(121) })).toBe(false);
    expect(Value.Check(createIndivSessionSchema, { ...base, notes: 'x'.repeat(501) })).toBe(false);
  });
});
