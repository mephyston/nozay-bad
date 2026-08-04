import { describe, it, expect } from 'vitest';
import { authorizeAccountingProxy } from './authz';

describe('authorizeAccountingProxy (H-01)', () => {
  it('refuse un admin sans aucune permission comptable', () => {
    expect(authorizeAccountingProxy('DELETE', 'invoices/42', ['members:read'])).toBe(false);
    expect(authorizeAccountingProxy('GET', 'invoices', ['members:*'])).toBe(false);
    expect(authorizeAccountingProxy('POST', 'transactions', [])).toBe(false);
  });

  it('autorise la lecture pour tout accès comptable', () => {
    expect(authorizeAccountingProxy('GET', 'invoices', ['accounting:invoices'])).toBe(true);
    expect(authorizeAccountingProxy('GET', 'transactions', ['accounting:*'])).toBe(true);
  });

  it('autorise les écritures de factures avec accounting:invoices', () => {
    expect(authorizeAccountingProxy('DELETE', 'invoices/42', ['accounting:invoices'])).toBe(true);
    expect(authorizeAccountingProxy('POST', 'invoices', ['accounting:invoices'])).toBe(true);
  });

  it('exige la compta complète pour les écritures hors factures', () => {
    expect(authorizeAccountingProxy('POST', 'transactions', ['accounting:invoices'])).toBe(false);
    expect(authorizeAccountingProxy('DELETE', 'categories/3', ['accounting:invoices'])).toBe(false);
    expect(authorizeAccountingProxy('POST', 'transactions', ['accounting:*'])).toBe(true);
    expect(authorizeAccountingProxy('DELETE', 'categories/3', ['accounting:*'])).toBe(true);
  });

  it('régit les endpoints IA par le seul droit ai:* (indépendant de la compta)', () => {
    expect(authorizeAccountingProxy('POST', 'seasons/25-26/ai/analysis', ['ai:*'])).toBe(true);
    expect(authorizeAccountingProxy('POST', 'seasons/25-26/ai/budget-suggestion', ['ai:*'])).toBe(true);
    // Un accès comptable seul ne suffit PAS pour l'IA :
    expect(authorizeAccountingProxy('POST', 'seasons/25-26/ai/analysis', ['accounting:*'])).toBe(false);
    expect(authorizeAccountingProxy('POST', 'seasons/25-26/ai/analysis', ['accounting:invoices'])).toBe(false);
    // …et le super-admin passe toujours :
    expect(authorizeAccountingProxy('POST', 'seasons/25-26/ai/analysis', ['*'])).toBe(true);
  });

  it('le super-admin (*) passe partout', () => {
    expect(authorizeAccountingProxy('DELETE', 'invoices/42', ['*'])).toBe(true);
    expect(authorizeAccountingProxy('POST', 'transactions', ['*'])).toBe(true);
  });
});
