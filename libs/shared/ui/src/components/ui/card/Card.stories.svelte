<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { Card, Badge, Button } from '@nba/ui';

  const { Story } = defineMeta({
    title: 'UI/Card',
    component: Card.Root,
    tags: ['autodocs'],
  });
</script>

<Story name="Default">
  {#snippet template()}
    <Card.Root class="w-[360px] max-w-full">
      <Card.Header>
        <Card.Title>Cotisation Poona</Card.Title>
        <Card.Description>État financier de l'adhérent</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Statut</span>
          <Badge variant="warning" size="sm">Règlement en attente</Badge>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Solde restant</span>
          <span class="font-bold text-warning">150,00 €</span>
        </div>
      </Card.Content>
      <Card.Footer class="justify-end">
        <Button size="sm">Régler</Button>
      </Card.Footer>
    </Card.Root>
  {/snippet}
</Story>
