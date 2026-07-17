# Spécification Technique : Alignement de l'En-tête des Rapports Financiers

Ce document spécifie le design, l'architecture et les exigences pour aligner le sélecteur de saison et le bouton d'impression sur l'en-tête de la page Astro (à droite du titre) dans le module des rapports financiers.

## 1. Objectifs UX

* **Alignement Visuel** : Déplacer le sélecteur de saison et le bouton d'impression dans le conteneur flex horizontal de l'en-tête Astro (à droite de « Rapports financiers »).
* **Uniformisation** : Reprendre le même style que le bouton d'importation de la page de rapprochement ou des adhérents.
* **Nettoyage du Composant Svelte** : Supprimer toute barre d'action ou de contrôle supérieure du composant Svelte `GeneralMeetingReport.svelte` afin d'éviter les doubles barres.

## 2. Structure dans reports.astro

```html
      <div class="flex items-center justify-between no-print">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Rapports financiers</h1>
          <p class="text-muted-foreground mt-2">
            Consultez les comptes de résultat, le bilan de trésorerie et gérez les budgets prévisionnels.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <select
            id="season-selector"
            class="px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-9"
          >
            {seasonsList.map((s: any) => (
              <option value={s.id} selected={s.id === season}>{s.name}</option>
            ))}
            {seasonsList.length === 0 && (
              <option value="25-26" selected>Saison 2025-2026</option>
            )}
          </select>

          <button
            id="print-btn"
            onclick="window.print()"
            class="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer inline-flex items-center gap-1.5 border-0 h-9"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimer
          </button>
        </div>
      </div>

<script>
  const selector = document.getElementById('season-selector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      const newSeason = (e.target as HTMLSelectElement).value;
      const params = new URLSearchParams(window.location.search);
      params.set('season', newSeason);
      window.location.href = `/admin/accounting/reports?${params.toString()}`;
    });
  }
</script>
```

## 3. Nettoyage de GeneralMeetingReport.svelte

* Supprimer le conteneur flex d'actions supérieur (`<div class="flex justify-end items-center gap-3 no-print">...</div>`).
* Le composant démarre directement avec le `<Tabs.Root>`.

## 4. Stratégie de Vérification

* Validation du rechargement de page lors d'un changement de saison.
* Lancement de `npx astro check --root apps/admin-console` et de la suite de tests Vitest.
