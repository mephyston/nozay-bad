import { describe, it, expect, vi } from 'vitest';
import {
  resolveActiveSeason,
  fetchTreasuryBalance,
  formatTreasuryBalance,
  fetchMembersCount,
  calculatePaidPercentage,
  formatPaidPercentage
} from './dashboard';

describe('Dashboard Utils', () => {
  describe('resolveActiveSeason', () => {
    it('should return active season from API response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: '26-27', name: 'Saison 2026-2027', active: false },
            { id: '25-26', name: 'Saison 2025-2026', active: true },
          ]
        })
      });
      const apiService = { fetch: mockFetch };

      const activeSeason = await resolveActiveSeason(apiService);
      expect(activeSeason).toBe('25-26');
      expect(mockFetch).toHaveBeenCalledWith('http://localhost/accounting/seasons');
    });

    it('should support active as 1 (numeric boolean)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: '25-26', name: 'Saison 2025-2026', active: 1 },
          ]
        })
      });
      const apiService = { fetch: mockFetch };

      const activeSeason = await resolveActiveSeason(apiService);
      expect(activeSeason).toBe('25-26');
    });

    it('should default to 25-26 if active season is not found', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: '26-27', name: 'Saison 2026-2027', active: false },
          ]
        })
      });
      const apiService = { fetch: mockFetch };

      const activeSeason = await resolveActiveSeason(apiService);
      expect(activeSeason).toBe('25-26');
    });

    it('should default to 25-26 if API call fails', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const apiService = { fetch: mockFetch };

      const activeSeason = await resolveActiveSeason(apiService);
      expect(activeSeason).toBe('25-26');
    });
  });

  describe('fetchTreasuryBalance', () => {
    it('should return balance in cents from API response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { balance: 130000 }
        })
      });
      const apiService = { fetch: mockFetch };

      const balance = await fetchTreasuryBalance(apiService, '25-26');
      expect(balance).toBe(130000);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost/accounting/seasons/25-26/balance');
    });

    it('should return null if API call fails', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const apiService = { fetch: mockFetch };

      const balance = await fetchTreasuryBalance(apiService, '25-26');
      expect(balance).toBeNull();
    });
  });

  describe('formatTreasuryBalance', () => {
    it('should format cents into euros string with fr-FR locale', () => {
      expect(formatTreasuryBalance(130000)).toBe('1 300,00 €');
      expect(formatTreasuryBalance(1245050)).toBe('12 450,50 €');
      expect(formatTreasuryBalance(0)).toBe('0,00 €');
      expect(formatTreasuryBalance(-5000)).toBe('-50,00 €');
    });

    it('should return -- if balance is null or undefined', () => {
      expect(formatTreasuryBalance(null)).toBe('--');
    });
  });

  describe('fetchMembersCount', () => {
    it('should return total count from pagination', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pagination: { total: 210 }
        })
      });
      const apiService = { fetch: mockFetch };

      const total = await fetchMembersCount(apiService, '25-26');
      expect(total).toBe(210);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost/members?season=25-26&limit=1');
    });

    it('should accept paid parameter and request paid=true', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pagination: { total: 182 }
        })
      });
      const apiService = { fetch: mockFetch };

      const totalPaid = await fetchMembersCount(apiService, '25-26', true);
      expect(totalPaid).toBe(182);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost/members?season=25-26&limit=1&paid=true');
    });

    it('should return null if API call fails', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const apiService = { fetch: mockFetch };

      const total = await fetchMembersCount(apiService, '25-26');
      expect(total).toBeNull();
    });
  });

  describe('calculatePaidPercentage', () => {
    it('should calculate correct percentage rounded to integer', () => {
      expect(calculatePaidPercentage(182, 210)).toBe(87);
      expect(calculatePaidPercentage(0, 210)).toBe(0);
      expect(calculatePaidPercentage(210, 210)).toBe(100);
    });

    it('should handle division by zero and return 0', () => {
      expect(calculatePaidPercentage(0, 0)).toBe(0);
      expect(calculatePaidPercentage(10, 0)).toBe(0);
    });

    it('should return null if paidCount or totalCount is null', () => {
      expect(calculatePaidPercentage(null, 210)).toBeNull();
      expect(calculatePaidPercentage(182, null)).toBeNull();
      expect(calculatePaidPercentage(null, null)).toBeNull();
    });
  });

  describe('formatPaidPercentage', () => {
    it('should format percentage with subtitle', () => {
      expect(formatPaidPercentage(87)).toBe('87% des inscriptions validées');
    });

    it('should return default message if percentage is null', () => {
      expect(formatPaidPercentage(null)).toBe('--% des inscriptions validées');
    });
  });
});
