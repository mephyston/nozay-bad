import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushSync } from "svelte";
import SettingsManager from "./SettingsManager.svelte";

describe("SettingsManager Component", () => {
  const seasons = [
    { id: "25-26", name: "Saison 2025-2026", active: true, initialCurrentBalance: 150000 },
    { id: "24-25", name: "Saison 2024-2025", active: false }
  ];

  const categories = [
    { id: 1, code: "volants", adminLabel: "Volants (vente ou achat)", adherentLabel: "Volants", hideInExpenses: false },
    { id: 2, code: "salaires_charges", adminLabel: "Salaires et Charges", adherentLabel: "Salaires & Charges", hideInExpenses: true }
  ];

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as any)
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders only seasons list and form when view is 'seasons'", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    mount(SettingsManager, {
      target,
      props: {
        seasons,
        categories,
        seasonId: "25-26",
        view: "seasons"
      }
    });
    flushSync();

    // Verify seasons content is shown
    expect(target.innerHTML).toContain("Exercices Comptables / Saisons");
    expect(target.innerHTML).toContain("Saison 2025-2026");
    expect(target.innerHTML).toContain("Saison 2024-2025");
    expect(target.innerHTML).toContain("Créer la saison");

    // Verify categories and balances are NOT visible
    expect(target.innerHTML).not.toContain("Gestion des Catégories de Trésorerie");
    expect(target.innerHTML).not.toContain("Soldes Initiaux de la Saison");
  });

  it("renders only categories config when view is 'compta'", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    mount(SettingsManager, {
      target,
      props: {
        seasons,
        categories,
        seasonId: "25-26",
        view: "compta"
      }
    });
    flushSync();

    // Verify categories section is shown directly
    expect(target.innerHTML).toContain("Gestion des Catégories de Trésorerie");
    expect(target.innerHTML).toContain("Volants (vente ou achat)");
    expect(target.innerHTML).toContain("Salaires et Charges");
    expect(target.innerHTML).toContain("Masquée");
    expect(target.innerHTML).toContain("Visible");

    // Verify seasons and balances are NOT visible
    expect(target.innerHTML).not.toContain("Exercices Comptables / Saisons");
    expect(target.innerHTML).not.toContain("Soldes Initiaux de la Saison");
    expect(target.innerHTML).not.toContain("Soldes Initiaux");
  });
});
