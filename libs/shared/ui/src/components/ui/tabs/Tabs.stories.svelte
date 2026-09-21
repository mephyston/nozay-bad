<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { Tabs } from '@nba/ui';

  const { Story } = defineMeta({
    title: 'UI/Tabs',
    component: Tabs.Root,
    tags: ['autodocs'],
  });
</script>

<Story name="Default">
  {#snippet template()}
    <Tabs.Root value="resultat" class="w-[480px] max-w-full">
      <Tabs.List>
        <Tabs.Trigger value="resultat">Compte de résultat</Tabs.Trigger>
        <Tabs.Trigger value="tresorerie">Trésorerie</Tabs.Trigger>
        <Tabs.Trigger value="budget">Budget</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="resultat" class="pt-4 text-sm text-muted-foreground">
        Contenu du compte de résultat.
      </Tabs.Content>
      <Tabs.Content value="tresorerie" class="pt-4 text-sm text-muted-foreground">
        Contenu du bilan de trésorerie.
      </Tabs.Content>
      <Tabs.Content value="budget" class="pt-4 text-sm text-muted-foreground">
        Contenu du budget prévisionnel.
      </Tabs.Content>
    </Tabs.Root>
  {/snippet}
</Story>

<Story name="Verre">
  {#snippet template()}
    <!--
      Le segmented control d'iOS : pilule en verre, segments de largeur égale, actif
      surélevé par sa propre surface. Employé sur téléphone à la place d'une rangée
      d'onglets qui défilerait.
    -->
    <div class="w-[390px] max-w-full bg-background p-3">
      <Tabs.Root value="profil" class="w-full">
        <Tabs.List variant="glass" class="w-full">
          <Tabs.Trigger variant="glass" value="profil">Profil</Tabs.Trigger>
          <Tabs.Trigger variant="glass" value="cotisation">Cotisation</Tabs.Trigger>
          <Tabs.Trigger variant="glass" value="transactions">Finances</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="profil" class="pt-4 text-sm text-muted-foreground">
          Coordonnées, contacts et fonctions au club.
        </Tabs.Content>
      </Tabs.Root>
    </div>
  {/snippet}
</Story>
