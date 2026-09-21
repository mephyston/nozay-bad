<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { ChoiceField, SwitchField, FormField, FieldGroup, DateTimeField, Input, Textarea, SearchableCombobox } from '@nba/ui';

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
      <!--
        Invite d'exemple fournie par l'écran : sur téléphone le libellé l'emporte,
        sans quoi le champ se retrouverait sans nom une fois celui-ci masqué.
      -->
      <FormField id="nom" label="Nom du produit">
        <Input id="nom" value="" placeholder="Ex : Maillot du club, Yonex BG65…" />
      </FormField>
      <FormField id="cat" label="Catégorie comptable">
        <SearchableCombobox
          id="cat"
          items={CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
          value=""
          placeholder="Choisir une catégorie…"
        />
      </FormField>
      <FormField id="desc" label="Description (facultative)">
        <Textarea id="desc" rows={2} placeholder="Ce que l'adhérent lit sous le nom…" />
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

<Story name="GroupeEtDates">
  {#snippet template()}
    <!--
      Un libellé hors du champ reste légitime quand il coiffe un **groupe** —
      l'application Calendrier en garde pour « Répétition ». C'est l'intitulé d'un
      champ isolé, redondant avec ce que le champ montre déjà, qui descend dedans.
    -->
    <div class="w-[390px] max-w-full space-y-5">
      <FieldGroup label="Quand">
        <FormField id="jour" label="Date"><DateTimeField id="jour" label="Date" value="2026-09-21" /></FormField>
        <FormField id="debut" label="Début"><DateTimeField id="debut" label="Début" type="time" value="20:00" /></FormField>
        <FormField id="fin" label="Fin"><DateTimeField id="fin" label="Fin" type="time" value="22:00" /></FormField>
      </FieldGroup>

      <FieldGroup label="Répétition" hint="Chaque occurrence crée une séance distincte.">
        <FormField id="freq" label="Fréquence">
          <ChoiceField
            id="freq"
            label="Fréquence"
            value="hebdo"
            options={[
              { value: 'jamais', label: 'Jamais' },
              { value: 'hebdo', label: 'Toutes les semaines' },
              { value: 'quinzaine', label: 'Toutes les deux semaines' },
            ]}
          />
        </FormField>
      </FieldGroup>
    </div>
  {/snippet}
</Story>
