<script lang="ts">
  import { Input, Label, Button, Textarea } from '@nba/ui';
  import type { PersonCardsBlock } from '../../../../shared/blocks';

  let { block = $bindable() } = $props<{ block: PersonCardsBlock }>();

  function add() {
    block.people = [...block.people, { name: '', role: '', responsibilities: [] }];
  }
  function remove(index: number) {
    block.people = block.people.filter((_, i) => i !== index);
  }
</script>

<div class="space-y-3">
  <div>
    <Label for="people-heading">Titre de section</Label>
    <Input id="people-heading" bind:value={block.heading} placeholder="Le bureau" />
  </div>

  {#each block.people as person, index (index)}
    <div class="border-border space-y-2 rounded-lg border p-3">
      <div class="grid gap-2 sm:grid-cols-2">
        <Input bind:value={person.name} placeholder="Nom" />
        <Input bind:value={person.role} placeholder="Fonction" />
      </div>
      <div class="grid gap-2 sm:grid-cols-2">
        <Input bind:value={person.email} placeholder="Adresse électronique" />
        <Input bind:value={person.phone} placeholder="Téléphone" />
      </div>
      <Textarea
        value={person.responsibilities.join('\n')}
        oninput={(e) => (person.responsibilities = (e.currentTarget as HTMLTextAreaElement).value.split('\n').filter(Boolean))}
        placeholder="Une responsabilité par ligne"
      />
      <Button variant="ghost" onclick={() => remove(index)}>Retirer cette personne</Button>
    </div>
  {/each}
  <Button variant="secondary" onclick={add}>Ajouter une personne</Button>
</div>
