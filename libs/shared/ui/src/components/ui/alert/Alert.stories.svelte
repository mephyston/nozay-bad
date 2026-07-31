<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { Alert } from '@nba/ui';

  const { Story } = defineMeta({
    title: 'UI/Alert',
    component: Alert.Root,
    tags: ['autodocs'],
  });
</script>

<Story name="Variants">
  {#snippet template()}
    <div class="flex flex-col gap-3 w-[420px] max-w-full">
      {#each ['default', 'destructive', 'success', 'warning', 'info', 'ai'] as v}
        <Alert.Root variant={v as any}>
          <Alert.Title>Alerte {v}</Alert.Title>
          <Alert.Description>Message d'exemple pour le variant « {v} ».</Alert.Description>
        </Alert.Root>
      {/each}
    </div>
  {/snippet}
</Story>
