<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { Amount } from '@nba/ui';

  const { Story } = defineMeta({
    title: 'UI/Amount',
    component: Amount,
    tags: ['autodocs'],
  });
</script>

<Story name="Formatting">
  {#snippet template()}
    <div class="flex flex-col gap-2 text-lg font-outfit tabular-nums">
      <div><Amount cents={150000} /> — montant simple</div>
      <div><Amount cents={150000} colored showSign /> — positif coloré</div>
      <div><Amount cents={-4500} colored showSign /> — négatif coloré</div>
      <div><Amount cents={0} colored /> — zéro</div>
    </div>
  {/snippet}
</Story>
