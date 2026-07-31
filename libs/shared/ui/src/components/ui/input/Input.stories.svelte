<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { Input, Label, FormField } from '@nba/ui';

  const { Story } = defineMeta({
    title: 'UI/Input',
    component: Input,
    tags: ['autodocs'],
  });
</script>

<Story name="States">
  {#snippet template()}
    <div class="flex flex-col gap-4 w-[360px] max-w-full">
      <FormField id="s-1" label="Champ standard">
        <Input id="s-1" placeholder="Saisir une valeur…" />
      </FormField>
      <FormField id="s-2" label="Pré-rempli">
        <Input id="s-2" value="Dupont Jean" />
      </FormField>
      <FormField id="s-3" label="Désactivé">
        <Input id="s-3" placeholder="Indisponible" disabled />
      </FormField>
      <FormField id="s-4" label="Nombre">
        <Input id="s-4" type="number" value={42} />
      </FormField>
    </div>
  {/snippet}
</Story>
