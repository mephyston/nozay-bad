import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushSync } from "svelte";
import SettingsManager from "./SettingsManager.svelte";

describe("SettingsManager Component", () => {
  const seasons = [
    { id: "25-26", name: "Saison 2025-2026", active: true, initialCurrentBalance: 150000 },
    { id: "24-25", name: "Saison 2024-2025", active: false }
  ];

  const categories = [
    { id: 1, code: "volants", adminLabel: "Volants (vente ou achat)", adherentLabel: "Volants", hideInExpenses: false, receiptCode: "70", expenseCode: "60" },
    { id: 2, code: "salaires_charges", adminLabel: "Salaires et Charges", adherentLabel: "Salaires & Charges", hideInExpenses: true, receiptCode: null, expenseCode: "64" }
  ];

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as any)
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
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

    // La vue "seasons" affiche la liste des exercices (contenu conditionnel de l'onglet actif)
    expect(target.innerHTML).toContain("Saison 2025-2026");
    expect(target.innerHTML).toContain("Saison 2024-2025");

    // Le contenu des autres vues (catégories) n'est pas rendu
    expect(target.innerHTML).not.toContain("Volants (vente ou achat)");
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

    // La vue "compta" affiche la configuration des catégories comptables
    expect(target.innerHTML).toContain("Nouvelle catégorie");
    expect(target.innerHTML).toContain("Volants (vente ou achat)");
    expect(target.innerHTML).toContain("Salaires et Charges");
    expect(target.innerHTML).toContain("Masquée NF"); // badge des catégories masquées en note de frais

    // Le contenu de la vue "seasons" n'est pas rendu
    expect(target.innerHTML).not.toContain("Saison 2024-2025");
  });

  it("renders account classes view when view is 'classes'", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    mount(SettingsManager, {
      target,
      props: {
        seasons,
        categories,
        accountClasses: [
          { code: "63", label: "63 - Impôts", type: "depense" }
        ],
        seasonId: "25-26",
        view: "classes"
      }
    });
    flushSync();

    // La vue "classes" affiche le plan comptable
    expect(target.innerHTML).toContain("63 - Impôts");
    expect(target.innerHTML).toContain("Nouvelle classe");
  });
});
