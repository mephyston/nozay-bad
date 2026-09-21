<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { ResponsiveSheet, FormSheet, Button, FormField, Input } from '@nba/ui';
  import { CalendarDays } from '@lucide/svelte';

  const { Story } = defineMeta({
    title: 'Patterns/ResponsiveSheet',
    component: ResponsiveSheet,
    tags: ['autodocs'],
    // La capture ne photographie que `#storybook-root` : la feuille y est portée,
    // et la story occupe tout le cadre pour que le positionnement fixe soit juste.
    parameters: { layout: 'fullscreen' },
  });
</script>

{#snippet contenu()}
  <FormField label="Nom du gymnase">
    <Input value="Gymnase des Bruyères" />
  </FormField>
  <FormField label="Adresse">
    <Input value="12 rue des Bruyères" />
  </FormField>
  <FormField label="Ville">
    <Input value="Nozay" />
  </FormField>
{/snippet}

{#snippet pied()}
  <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button variant="outline" class="w-full sm:w-auto">Annuler</Button>
    <Button class="w-full sm:w-auto">Enregistrer</Button>
  </div>
{/snippet}

<Story name="PalierBas">
  {#snippet template()}
    <div class="h-screen w-full bg-background">
      <ResponsiveSheet open portalProps={{ to: '#storybook-root' }} title="Nouveau gymnase" icon={CalendarDays} description="Les créneaux et le site public y renvoient." detent={0}>
        {@render contenu()}
        {#snippet footer()}{@render pied()}{/snippet}
      </ResponsiveSheet>
    </div>
  {/snippet}
</Story>

<Story name="PalierHaut">
  {#snippet template()}
    <div class="h-screen w-full bg-background">
      <ResponsiveSheet open portalProps={{ to: '#storybook-root' }} title="Nouveau gymnase" icon={CalendarDays} description="Les créneaux et le site public y renvoient." detent={1}>
        {@render contenu()}
        {#snippet footer()}{@render pied()}{/snippet}
      </ResponsiveSheet>
    </div>
  {/snippet}
</Story>

<Story name="SansPied">
  {#snippet template()}
    <div class="h-screen w-full bg-background">
      <ResponsiveSheet open portalProps={{ to: '#storybook-root' }} title="Détail" description="Une feuille sans actions.">
        {@render contenu()}
      </ResponsiveSheet>
    </div>
  {/snippet}
</Story>

<Story name="PiedEnDeuxCercles">
  {#snippet template()}
    <!--
      Le pied d'un formulaire sur téléphone : croix en verre, check en couleur
      d'accent — et non en vert, réservé ici à l'état « c'est fait ».
    -->
    <div class="h-screen w-full bg-background">
      <FormSheet
        open
        title="Nouveau gymnase"
        description="Les créneaux et le site public y renvoient."
        onSubmit={(e) => e.preventDefault()}
      >
        <FormField label="Nom du gymnase">
          <Input value="Gymnase des Bruyères" />
        </FormField>
        <FormField label="Ville">
          <Input value="Nozay" />
        </FormField>
      </FormSheet>
    </div>
  {/snippet}
</Story>
