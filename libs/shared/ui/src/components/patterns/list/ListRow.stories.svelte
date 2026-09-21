<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { ListRow, Badge, Avatar, type SwipeAction } from '@nba/ui';
  import { Trash2, Check, Edit, Layers } from '@lucide/svelte';

  const ACTIONS: SwipeAction[] = [
    { id: 'suppr', label: 'Supprimer', icon: Trash2, tone: 'destructive', confirm: 'Supprimer cette ligne ?', run: () => {} },
    { id: 'valider', label: 'Valider', icon: Check, tone: 'primary', run: () => {} },
  ];

  const { Story } = defineMeta({
    title: 'Patterns/ListRow',
    component: ListRow,
    tags: ['autodocs'],
  });
</script>

{#snippet liste(contenu)}
  <ul class="w-[390px] max-w-full divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
    {@render contenu()}
  </ul>
{/snippet}

<Story name="Default">
  {#snippet template()}
    {#snippet contenu()}
      <ListRow href="#" title="Dupont Marie" subtitle="Licence 07512345" />
      <ListRow href="#" title="Martin Jean" subtitle="Licence 07598765" />
    {/snippet}
    {@render liste(contenu)}
  {/snippet}
</Story>

<Story name="AvecValeur">
  {#snippet template()}
    {#snippet contenu()}
      <ListRow href="#" title="Cotisation adulte" subtitle="12/09/2026" value="145,00 €" valueTone="success" />
      <ListRow href="#" title="Achat volants" subtitle="14/09/2026" value="-312,40 €" valueTone="destructive" />
      <ListRow href="#" title="Virement interne" subtitle="15/09/2026" value="0,00 €" valueCaption="équilibré" />
    {/snippet}
    {@render liste(contenu)}
  {/snippet}
</Story>

<Story name="AvecBadgeEtAvatar">
  {#snippet template()}
    {#snippet contenu()}
      <ListRow href="#" title="Bernard Claire" subtitle="Licence 07500111" value="Valide" valueTone="success">
        {#snippet leading()}
          <Avatar.Root class="size-9">
            <Avatar.Fallback>BC</Avatar.Fallback>
          </Avatar.Root>
        {/snippet}
        {#snippet badge()}
          <Badge variant="secondary">Bureau</Badge>
        {/snippet}
      </ListRow>
      <ListRow href="#" title="Petit Hugo" subtitle="Licence 07500222" value="Incomplet" valueTone="warning">
        {#snippet leading()}
          <Avatar.Root class="size-9">
            <Avatar.Fallback>PH</Avatar.Fallback>
          </Avatar.Root>
        {/snippet}
      </ListRow>
    {/snippet}
    {@render liste(contenu)}
  {/snippet}
</Story>

<Story name="TitreTresLong">
  {#snippet template()}
    {#snippet contenu()}
      <ListRow
        href="#"
        title="Remboursement de frais de déplacement pour le déplacement interclubs du 12 octobre"
        subtitle="Pièce 2026-0147 — en attente de validation par le bureau"
        value="-84,20 €"
        valueTone="destructive"
      />
    {/snippet}
    {@render liste(contenu)}
  {/snippet}
</Story>

<Story name="AvecActions">
  {#snippet template()}
    {#snippet contenu()}
      <ListRow
        href="#"
        title="Maillot club — Homme"
        subtitle="3 déclinaisons"
        value="32,00 €"
        actions={[
          { id: 'modifier', label: 'Modifier', icon: Edit, run: () => {} },
          { id: 'declinaison', label: 'Ajouter une déclinaison', icon: Layers, run: () => {} },
        ]}
      />
    {/snippet}
    {@render liste(contenu)}
  {/snippet}
</Story>

<Story name="EtatsNonNavigables">
  {#snippet template()}
    {#snippet contenu()}
      <ListRow title="Ligne sélectionnée" subtitle="ni lien ni action" value="—" selected />
      <ListRow title="Ligne désactivée" subtitle="clôturée" value="—" disabled />
    {/snippet}
    {@render liste(contenu)}
  {/snippet}
</Story>

<Story name="BalayageFerme">
  {#snippet template()}
    {#snippet contenu()}
      <ListRow href="#" title="Note de frais — Déplacement" subtitle="Pièce 2026-0147" value="-84,20 €" valueTone="destructive" swipe={ACTIONS} />
      <ListRow href="#" title="Note de frais — Volants" subtitle="Pièce 2026-0148" value="-42,00 €" valueTone="destructive" swipe={ACTIONS} />
    {/snippet}
    {@render liste(contenu)}
  {/snippet}
</Story>

<Story name="BalayageOuvert">
  {#snippet template()}
    {#snippet contenu()}
      <!-- Un geste ne se photographie pas : l'ouverture est pilotée pour la référence. -->
      <ListRow href="#" title="Note de frais — Déplacement" subtitle="Pièce 2026-0147" value="-84,20 €" valueTone="destructive" swipe={ACTIONS} swipeOpen />
      <ListRow href="#" title="Note de frais — Volants" subtitle="Pièce 2026-0148" value="-42,00 €" valueTone="destructive" swipe={ACTIONS} />
    {/snippet}
    {@render liste(contenu)}
  {/snippet}
</Story>

<Story name="Declinaisons">
  {#snippet template()}
    {#snippet contenu()}
      <!--
        Le chevron de tête déplie, celui de queue emmène ailleurs. Une ligne sans
        déclinaison réserve quand même la place du premier, pour que les vignettes
        restent alignées.
      -->
      <ListRow
        onclick={() => {}}
        disclosure="expanded"
        title="Maillot club — Homme"
        subtitle="Textile · 2 déclinaisons"
        value="selon déclinaison"
      />
      <ListRow onclick={() => {}} nested title="Taille M" value="32,00 €" valueTone="foreground" />
      <ListRow onclick={() => {}} nested title="Taille L" value="32,00 €" valueTone="foreground" />
      <ListRow
        onclick={() => {}}
        disclosure="collapsed"
        title="Short club"
        subtitle="Textile · 3 déclinaisons"
        value="selon déclinaison"
      />
      <ListRow
        onclick={() => {}}
        disclosure="none"
        title="Volants plumes (tube)"
        subtitle="Volants"
        value="24,50 €"
        valueTone="foreground"
      />
    {/snippet}
    {@render liste(contenu)}
  {/snippet}
</Story>
