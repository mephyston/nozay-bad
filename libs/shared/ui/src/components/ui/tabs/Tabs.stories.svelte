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
