<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { ChoiceField, SwitchField, FormField, Input } from '@nba/ui';

  const CATEGORIES = [
    { value: 'textile', label: 'Textile', hint: 'Maillots, shorts, survêtements' },
    { value: 'volants', label: 'Volants', hint: 'Plumes et plastique' },
    { value: 'cordage', label: 'Cordage', hint: 'Facturé avec la pose' },
    { value: 'accessoire', label: 'Accessoires' },
  ];

  const { Story } = defineMeta({
    title: 'Patterns/ChoiceField',
    component: ChoiceField,
    tags: ['autodocs'],
  });
</script>

<Story name="DansUnFormulaire">
  {#snippet template()}
    <!--
      Sur téléphone : intitulé à gauche, valeur et chevron à droite — l'appui ouvre
      un écran qui entre par la droite. Sur ordinateur, la liste déroulante native.
    -->
    <div class="w-[390px] max-w-full space-y-4">
      <FormField id="nom" label="Nom du produit">
        <Input value="" />
      </FormField>
      <FormField id="categorie" label="Catégorie">
        <ChoiceField
          id="categorie"
          label="Catégorie"
          value="volants"
          options={CATEGORIES}
          description="Elle classe l'article dans la boutique et détermine son compte comptable."
        />
      </FormField>
      <FormField id="categorie-vide" label="Catégorie comptable">
        <ChoiceField id="categorie-vide" label="Compte" value="" options={CATEGORIES} />
      </FormField>
    </div>
  {/snippet}
</Story>

<Story name="Reglages">
  {#snippet template()}
    <!-- Un réglage : intitulé à gauche, interrupteur à droite, toujours au même endroit. -->
    <div class="w-[390px] max-w-full divide-y divide-border">
      <div class="py-2">
        <SwitchField id="actif" label="Article actif" checked hint="Visible dans la boutique." />
      </div>
      <div class="py-2">
        <SwitchField id="stock" label="Suivre le stock" checked={false} />
      </div>
      <div class="py-2">
        <SwitchField id="fige" label="Réglage verrouillé" checked disabled hint="Défini par la saison." />
      </div>
    </div>
  {/snippet}
</Story>
