<script lang="ts">
  import { Input, Label, Select, Checkbox } from '@nba/ui';
  import type { EventsBlock } from '../../../../shared/blocks';

  /**
   * Agenda : le bloc porte une requête, jamais des événements.
   *
   * L'écran ne propose donc aucune sélection d'événement à la main — ce serait figer
   * une liste qui vieillirait dès le lendemain. On choisit un nombre, des catégories,
   * et le site montre ce qui vient.
   */
  let { block = $bindable() } = $props<{ block: EventsBlock }>();

  /** Reprises telles quelles du domaine `events` : les deux listes doivent coïncider. */
  const CATEGORIES: { value: string; label: string }[] = [
    { value: 'competition', label: 'Compétition' },
    { value: 'interclubs', label: 'Interclubs' },
    { value: 'tournoi', label: 'Tournoi' },
    { value: 'stage', label: 'Stage' },
    { value: 'vie_du_club', label: 'Vie du club' },
    { value: 'assemblee', label: 'Assemblée' }
  ];

  function toggle(value: string, checked: boolean) {
    const current = block.categories ?? [];
    block.categories = checked ? [...current, value] : current.filter((c: string) => c !== value);
  }
</script>

<div class="space-y-4">
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-1.5">
      <Label for="events-heading">Titre de section</Label>
      <Input id="events-heading" bind:value={block.heading} placeholder="Prochains rendez-vous" />
    </div>

    <div class="space-y-1.5">
      <Label for="events-limit">Nombre affiché</Label>
      <Select
        id="events-limit"
        value={String(block.limit ?? 6)}
        onchange={(e) => (block.limit = Number((e.currentTarget as HTMLSelectElement).value))}
      >
        {#each [3, 4, 5, 6, 8, 10, 12] as n (n)}
          <option value={String(n)}>{n} événements</option>
        {/each}
      </Select>
      <p class="text-muted-foreground text-xs">
        Seuls les rendez-vous <strong>à venir</strong> s'affichent : la liste se met à jour
        toute seule, sans intervention.
      </p>
    </div>
  </div>

  <fieldset class="space-y-2">
    <legend class="text-sm font-medium">Catégories</legend>
    <p class="text-muted-foreground text-xs">
      Aucune cochée : toutes les catégories s'affichent.
    </p>
    <div class="grid gap-2 sm:grid-cols-3">
      {#each CATEGORIES as category (category.value)}
        <label class="flex items-center gap-2 text-sm">
          <Checkbox
            checked={(block.categories ?? []).includes(category.value)}
            onCheckedChange={(v) => toggle(category.value, v === true)}
          />
          <span>{category.label}</span>
        </label>
      {/each}
    </div>
  </fieldset>

  <label class="flex items-start gap-2 text-sm">
    <Checkbox
      checked={block.showArchiveLink !== false}
      onCheckedChange={(v) => (block.showArchiveLink = v === true)}
    />
    <span>
      <span class="font-medium">Afficher le lien « Tout l'agenda »</span>
      <span class="text-muted-foreground block text-xs">
        Renvoie vers la page /agenda/, qui liste l'ensemble des rendez-vous.
      </span>
    </span>
  </label>
</div>
