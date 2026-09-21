<script lang="ts">
  import { Plus, Edit, MapPin } from '@lucide/svelte';
  import {
    Button,
    Input,
    Badge,
    Table,
    ListView,
    ListRow,
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    DropdownMenu,
    FormField,
    FormSheet,
    submitForm,
    readApiError,
    dockDePage
  } from '@nba/ui';

  interface VenueRow {
    id: number;
    code: string;
    name: string;
    streetAddress: string | null;
    postalCode: string | null;
    city: string | null;
    latitude: string | null;
    longitude: string | null;
  }

  /**
   * Les gymnases du club.
   *
   * Jusqu'ici, aucun écran : les deux salles avaient été créées par l'API et corrigées
   * par migration (0033). Un club qui s'installe doit pouvoir nommer les siennes. Pas
   * de suppression : les créneaux, les séances et les événements y font référence, et
   * l'API ne l'expose pas — un gymnase qui ferme se renomme ou reste dans l'historique.
   *
   * Le code est l'identifiant stable (URL, imports) : figé à la modification.
   */
  let {
    venues = [],
    canWrite = false,
    endpoint = '/admin/api/schedules/gymnases'
  } = $props<{
    venues: VenueRow[];
    canWrite?: boolean;
    endpoint?: string;
  }>();

  let busy = $state(false);
  let showSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');

  let editingCode = $state<string | null>(null);
  let code = $state('');
  let name = $state('');
  let streetAddress = $state('');
  let postalCode = $state('');
  let city = $state('');
  let latitude = $state('');
  let longitude = $state('');

  const filtered = $derived(
    venues.filter((v: VenueRow) => {
      const term = searchTerm.trim().toLowerCase();
      return !term || v.name.toLowerCase().includes(term) || (v.city ?? '').toLowerCase().includes(term);
    })
  );

  const pagination = $derived({ page: 1, total: filtered.length, totalPages: 1 });

  /** Un code lisible dérivé du nom : « Halle des Sports » → « halle-des-sports ». */
  function slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  function openAdd() {
    editingCode = null;
    code = '';
    name = '';
    streetAddress = '';
    postalCode = '';
    city = '';
    latitude = '';
    longitude = '';
    errorMsg = '';
    showSheet = true;
  }

  function openEdit(v: VenueRow) {
    editingCode = v.code;
    code = v.code;
    name = v.name;
    streetAddress = v.streetAddress ?? '';
    postalCode = v.postalCode ?? '';
    city = v.city ?? '';
    latitude = v.latitude ?? '';
    longitude = v.longitude ?? '';
    errorMsg = '';
    showSheet = true;
  }

  function validate(): string | null {
    if (!name.trim()) return 'Le nom est obligatoire.';
    const c = editingCode ?? (code.trim() || slugify(name));
    if (!/^[a-z0-9-]+$/.test(c)) return 'Le code ne peut contenir que des minuscules, des chiffres et des tirets.';
    const coordonnee = (v: string, quoi: string) =>
      v.trim() !== '' && !/^-?\d{1,3}(\.\d+)?$/.test(v.trim()) ? `${quoi} doit être un nombre décimal (ex. 48.65).` : null;
    return coordonnee(latitude, 'La latitude') ?? coordonnee(longitude, 'La longitude');
  }

  async function save(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;
    const body = {
      action: 'save',
      code: editingCode ?? (code.trim() || slugify(name)),
      name: name.trim(),
      streetAddress: streetAddress.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      latitude: latitude.trim(),
      longitude: longitude.trim()
    };
    await submitForm({
      validate,
      submit: async () => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await readApiError(res, "L'enregistrement a échoué."));
      },
      close: () => {
        showSheet = false;
      },
      onError: (message) => {
        errorMsg = message;
      }
    });
    busy = false;
  }

  /**
   * L'action principale descend dans la barre du bas, à portée du pouce. Le bouton
   * du haut reste pour la souris ; sur téléphone il ferait doublon.
   */
  $effect(() => {
    if (!canWrite) return;
    return dockDePage.declarerActions([
      { id: 'nouveau-gymnase', libelle: 'Nouveau gymnase', icone: Plus, run: openAdd },
    ]);
  });

  const adresse = (v: VenueRow) =>
    [v.streetAddress, [v.postalCode, v.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—';
</script>

{#snippet actionsVenue(v: VenueRow)}
  <DropdownMenu.Label>Actions</DropdownMenu.Label>
  <DropdownMenu.Item onclick={() => openEdit(v)} class="cursor-pointer">
    <Edit class="mr-2 h-3.5 w-3.5" /> Modifier
  </DropdownMenu.Item>
{/snippet}

<DataTable
  data={filtered}
  mobileSpacing="list"
  {pagination}
  onPageChange={() => {}}
  itemName="gymnase(s)"
  emptyTitle="Aucun gymnase"
  emptyDescription="Déclarez les salles où le club joue : les créneaux et le site public y renvoient."
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher un gymnase…"
      dockSearch
      hasFilters={false}
    >
      {#snippet actions()}
        {#if canWrite}
          <Button onclick={openAdd} class="hidden h-9 shrink-0 gap-1.5 font-bold md:flex">
            <Plus class="h-4 w-4" />
            <span>Nouveau gymnase</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <ListView
      items={filtered}
      emptyTitle="Aucun gymnase"
      emptyDescription="Déclarez les salles où le club joue : les créneaux et le site public y renvoient."
    >
      {#snippet listRow(v)}
        <!--
          Le code est l'identifiant stable : il va à droite, en sourdine. La position
          n'est signalée que lorsqu'elle manque — c'est l'exception qui appelle une
          action, le site public en a besoin pour son plan.
        -->
        <ListRow
          item={v}
          onclick={canWrite ? () => openEdit(v) : undefined}
          title={v.name}
          subtitle={adresse(v)}
          value={v.code}
          actions={canWrite ? actionsVenue : undefined}
        >
          {#snippet badge()}
            {#if !v.latitude || !v.longitude}
              <Badge variant="outline" size="xs">Sans position</Badge>
            {/if}
          {/snippet}
        </ListRow>
      {/snippet}
    </ListView>
  {/snippet}

  {#snippet header()}
    <Table.Head>Nom</Table.Head>
    <Table.Head>Adresse</Table.Head>
    <Table.Head>Position</Table.Head>
    <Table.Head>Code</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(v)}
    <Table.Row>
      <Table.Cell class="font-medium">{v.name}</Table.Cell>
      <Table.Cell class="text-muted-foreground">{adresse(v)}</Table.Cell>
      <Table.Cell class="text-muted-foreground">
        {#if v.latitude && v.longitude}
          <span class="inline-flex items-center gap-1 text-xs"><MapPin class="h-3.5 w-3.5" /> {v.latitude}, {v.longitude}</span>
        {:else}
          <span class="text-xs">—</span>
        {/if}
      </Table.Cell>
      <Table.Cell><code class="text-xs text-muted-foreground">{v.code}</code></Table.Cell>
      <Table.Cell class="relative text-right">
        {#if canWrite}
          <DataTableRowActions>{@render actionsVenue(v)}</DataTableRowActions>
        {/if}
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>

<FormSheet
  bind:open={showSheet}
  title={editingCode === null ? 'Nouveau gymnase' : 'Modifier le gymnase'}
  description="L'adresse et la position servent au site public (plan, données structurées) et aux convocations."
  icon={MapPin}
  error={errorMsg}
  isSubmitting={busy}
  onSubmit={save}
>
  <FormField id="venue-name" label="Nom">
    <Input id="venue-name" bind:value={name} maxlength={120} placeholder="Halle des Sports" required />
  </FormField>
  <FormField id="venue-code" label="Code (identifiant stable)">
    <Input
      id="venue-code"
      value={editingCode ?? (code || slugify(name))}
      oninput={(e) => (code = (e.currentTarget as HTMLInputElement).value)}
      disabled={editingCode !== null}
      class="font-mono"
      maxlength={60}
    />
  </FormField>
  <FormField id="venue-street" label="Adresse">
    <Input id="venue-street" bind:value={streetAddress} maxlength={200} placeholder="Route de …" />
  </FormField>
  <div class="grid gap-4 sm:grid-cols-2">
    <FormField id="venue-postal" label="Code postal">
      <Input id="venue-postal" bind:value={postalCode} maxlength={10} />
    </FormField>
    <FormField id="venue-city" label="Ville">
      <Input id="venue-city" bind:value={city} maxlength={100} />
    </FormField>
  </div>
  <div class="grid gap-4 sm:grid-cols-2">
    <FormField id="venue-lat" label="Latitude">
      <Input id="venue-lat" bind:value={latitude} maxlength={24} placeholder="48.6567" />
    </FormField>
    <FormField id="venue-lng" label="Longitude">
      <Input id="venue-lng" bind:value={longitude} maxlength={24} placeholder="2.2412" />
    </FormField>
  </div>
</FormSheet>
