<script lang="ts">
  import { Bell } from '@lucide/svelte';
  import { Badge, EmptyState, ListView, ListRow } from '@nba/ui';
  import { ligneDeMessage, signalementsDEnvoi, type MessageLike } from './notifications-row-model';

  /**
   * Les envois passés, en liste.
   *
   * Chaque ligne portait trois pastilles de distribution, dont « N envoyée(s) » qui
   * est la question même qu'on se pose : elle devient la valeur de la rangée, et les
   * deux autres ne paraissent qu'en cas d'écart.
   */
  let { messages = [] }: { messages?: MessageLike[] } = $props();
</script>

{#if messages.length === 0}
  <EmptyState
    icon={Bell}
    title="Aucune notification envoyée"
    description="Les envois apparaîtront ici avec leur statut de distribution."
  />
{:else}
  <ListView items={messages}>
    {#snippet listRow(message)}
      {@const l = ligneDeMessage(message)}
      <ListRow
        item={message}
        title={l.titre}
        subtitle={l.sousTitre}
        value={l.valeur}
        valueTone={l.ton}
        valueCaption="reçue(s)"
        chevron="none"
      >
        {#snippet badge()}
          {#each signalementsDEnvoi(message) as pastille (pastille.label)}
            <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
          {/each}
        {/snippet}
      </ListRow>
    {/snippet}
  </ListView>
{/if}
