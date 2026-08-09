<script lang="ts">
  import { Input, Label, Button, Select, Combobox, type ComboboxItem } from '@nba/ui';
  import { ImagePlus, X, Trash2 } from '@lucide/svelte';
  import MediaPicker, { type PickableMedia } from '../../../../media/list-media/ui/MediaPicker.svelte';
  import type { CtaGridBlock } from '../../../../shared/blocks';

  let {
    block = $bindable(),
    media = [],
    targets = []
  } = $props<{
    block: CtaGridBlock;
    /** Médiathèque de la page hôte : sert la bannière de fond. */
    media?: PickableMedia[];
    /** Pages et actualités du site, pour la cible d'un lien interne. */
    targets?: { path: string; title: string; kind: 'page' | 'post' }[];
  }>();

  let backgroundPickerOpen = $state(false);

  const background = $derived(
    block.backgroundMediaId
      ? media.find((m: PickableMedia) => m.id === block.backgroundMediaId) ?? null
      : null
  );

  const targetItems: ComboboxItem[] = $derived(
    targets.map((target) => ({
      value: target.path,
      label: target.title,
      description: `${target.kind === 'post' ? 'Actualité' : 'Page'} — ${target.path}`
    }))
  );

  /**
   * Nature de chaque lien, en état local.
   *
   * Le schéma ne stocke qu'un `href` : on ne peut donc que *deviner* la nature à
   * l'ouverture, à partir de l'adresse. La deviner à chaque rendu empêcherait en
   * revanche de basculer sur « adresse extérieure » avant d'avoir saisi quoi que ce
   * soit — le champ vide serait aussitôt relu comme « interne ». D'où une intention
   * mémorisée, initialisée une fois sur l'adresse existante.
   */
  const looksExternal = (href: string) => /^https?:\/\//i.test(href);
  let modes = $state<('internal' | 'external')[]>(
    block.items.map((item: { href: string }) => (looksExternal(item.href) ? 'external' : 'internal'))
  );

  function modeOf(index: number): 'internal' | 'external' {
    return modes[index] ?? (looksExternal(block.items[index]?.href ?? '') ? 'external' : 'internal');
  }

  function setMode(index: number, mode: 'internal' | 'external') {
    modes[index] = mode;
    // Changer de nature vide l'adresse : une URL externe n'est pas un chemin interne,
    // et laisser l'ancienne valeur produirait un lien silencieusement faux.
    block.items[index].href = '';
  }

  function add() {
    block.items = [...block.items, { label: '', href: '' }];
    modes = [...modes, 'internal'];
  }

  function remove(index: number) {
    block.items = block.items.filter((_, i) => i !== index);
    modes = modes.filter((_, i) => i !== index);
  }
</script>

<div class="space-y-4">
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-1.5">
      <Label for="grid-heading">Titre de section</Label>
      <Input id="grid-heading" bind:value={block.heading} />
    </div>
    <div class="space-y-1.5">
      <Label for="grid-columns">Colonnes</Label>
      <Select
        id="grid-columns"
        value={String(block.columns)}
        onchange={(e) => (block.columns = Number((e.currentTarget as HTMLSelectElement).value) as 2 | 3 | 4)}
      >
        <option value="2">2 colonnes</option>
        <option value="3">3 colonnes</option>
        <option value="4">4 colonnes</option>
      </Select>
    </div>
  </div>

  <div class="space-y-1.5">
    <Label>Image de fond (bannière)</Label>
    {#if background}
      <div class="border-border flex items-center gap-3 rounded-md border p-2">
        <img
          src={`/media/${background.key.replace(/^media\//, '')}`}
          alt={background.alt}
          class="h-16 w-28 shrink-0 rounded object-cover"
        />
        <span class="min-w-0 flex-1 truncate text-sm">{background.alt || '(sans description)'}</span>
        <Button type="button" variant="ghost" size="sm" onclick={() => (backgroundPickerOpen = true)}>
          Remplacer
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onclick={() => (block.backgroundMediaId = undefined)}
        >
          <X class="h-4 w-4" />
          <span class="sr-only">Retirer l'image de fond</span>
        </Button>
      </div>
    {:else}
      <Button type="button" variant="outline" class="gap-1.5" onclick={() => (backgroundPickerOpen = true)}>
        <ImagePlus class="h-4 w-4" />
        Choisir une image
      </Button>
      <p class="text-muted-foreground text-xs">
        Sans image, la grille s'affiche sur fond neutre. Avec, les boutons se posent devant la bannière.
      </p>
    {/if}
  </div>

  <div class="space-y-3">
    <Label>Boutons</Label>
    {#each block.items as item, index (index)}
      <div class="border-border space-y-2 rounded-md border p-3">
        <div class="flex items-center gap-2">
          <Input bind:value={item.label} placeholder="Libellé du bouton" class="flex-1" />
          <Button type="button" variant="ghost" size="icon-sm" onclick={() => remove(index)}>
            <Trash2 class="h-4 w-4" />
            <span class="sr-only">Retirer ce bouton</span>
          </Button>
        </div>

        <div class="space-y-1.5">
          <Select
            value={modeOf(index)}
            onchange={(e) => setMode(index, (e.currentTarget as HTMLSelectElement).value as 'internal' | 'external')}
          >
            <option value="internal">Une page ou actualité du site</option>
            <option value="external">Une adresse extérieure</option>
          </Select>

          {#if modeOf(index) === 'external'}
            <Input bind:value={item.href} placeholder="https://exemple.fr/…" />
          {:else if targetItems.length > 0}
            <Combobox
              items={targetItems}
              bind:value={item.href}
              placeholder="Rechercher une page ou une actualité…"
              clearLabel="Aucune cible"
            />
          {:else}
            <Input bind:value={item.href} placeholder="/notre-club/" />
          {/if}
        </div>

        <Input bind:value={item.description} placeholder="Description (facultative)" />
      </div>
    {/each}
    <Button type="button" variant="secondary" onclick={add}>Ajouter un bouton</Button>
  </div>
</div>

<MediaPicker
  bind:open={backgroundPickerOpen}
  {media}
  kind="image"
  title="Image de fond de la bannière"
  onSelect={(item) => (block.backgroundMediaId = item.id)}
/>
