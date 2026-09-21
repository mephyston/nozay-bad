<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { ChoicePicker } from '@nba/ui';

  const COMPTES = [
    { value: '706', label: '706 — Prestations de services', hint: 'Cotisations, stages' },
    { value: '707', label: '707 — Ventes de marchandises', hint: 'Boutique' },
    { value: '740', label: '740 — Subventions d’exploitation' },
    { value: '756', label: '756 — Cotisations' },
    { value: '758', label: '758 — Produits divers de gestion' },
  ];

  const { Story } = defineMeta({
    title: 'Patterns/ChoicePicker',
    component: ChoicePicker,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="AvecRecherche">
  {#snippet template()}
    <!-- Un choix est une navigation : l'écran entre par la droite, on en revient par le chevron. -->
    <div class="h-screen w-full bg-background">
      <ChoicePicker
        open
        title="Compte comptable"
        description="Le compte sur lequel l'écriture sera imputée."
        value="707"
        options={COMPTES}
        searchable
        searchPlaceholder="Rechercher un compte…"
        onChoose={() => {}}
      />
    </div>
  {/snippet}
</Story>

<Story name="SansRecherche">
  {#snippet template()}
    <div class="h-screen w-full bg-background">
      <ChoicePicker open title="Saison" value="25-26" options={[{ value: '25-26', label: '2025-2026' }, { value: '24-25', label: '2024-2025' }]} onChoose={() => {}} />
    </div>
  {/snippet}
</Story>
