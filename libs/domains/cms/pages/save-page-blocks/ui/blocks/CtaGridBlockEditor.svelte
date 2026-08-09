<script lang="ts">
  import { Input, Label, Button, Select } from '@nba/ui';
  import type { CtaGridBlock } from '../../../../shared/blocks';

  let { block = $bindable() } = $props<{ block: CtaGridBlock }>();

  function add() {
    block.items = [...block.items, { label: '', href: '' }];
  }
  function remove(index: number) {
    block.items = block.items.filter((_, i) => i !== index);
  }
</script>

<div class="space-y-3">
  <div class="grid gap-2 sm:grid-cols-2">
    <div>
      <Label for="grid-heading">Titre de section</Label>
      <Input id="grid-heading" bind:value={block.heading} />
    </div>
    <div>
      <Label for="grid-columns">Colonnes</Label>
      <Select.Root type="single" bind:value={() => String(block.columns), (v) => (block.columns = Number(v) as 2 | 3 | 4)}>
        <Select.Trigger id="grid-columns">{block.columns} colonnes</Select.Trigger>
        <Select.Content>
          <Select.Item value="2">2 colonnes</Select.Item>
          <Select.Item value="3">3 colonnes</Select.Item>
          <Select.Item value="4">4 colonnes</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  {#each block.items as item, index (index)}
    <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <Input bind:value={item.label} placeholder="Libellé" />
      <Input bind:value={item.href} placeholder="/partenaires/ ou https://…" />
      <Button variant="ghost" onclick={() => remove(index)}>Retirer</Button>
    </div>
  {/each}
  <Button variant="secondary" onclick={add}>Ajouter un lien</Button>
</div>
