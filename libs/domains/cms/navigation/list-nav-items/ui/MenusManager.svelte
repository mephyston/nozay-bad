<script lang="ts">
  import { Plus, Edit, Trash2, ChevronUp, ChevronDown, ExternalLink, CornerDownRight } from '@lucide/svelte';
  import {
    Button,
    Input,
    Badge,
    Card,
    Select,
    Tabs,
    EmptyState,
    DataTableRowActions,
    DropdownMenu,
    FormField,
    FormSheet,
    Combobox,
    type ComboboxItem,
    submitForm,
    uiConfirm,
    flashAndReload,
    uiAlert
  } from '@nba/ui';

  import { NAV_LOCATIONS, NAV_LOCATION_LABELS, type NavLocation } from '../../../shared/nav';

  interface NavItem {
    id: number;
    location: NavLocation;
    parentId: number | null;
    label: string;
    pageId: number | null;
    externalUrl: string | null;
    position: number;
    /** Nul pour un conteneur : une entrée qui ne fait que regrouper. */
    href: string | null;
    children: NavItem[];
  }

  let {
    header = [],
    footer = [],
    legal = [],
    pages = [],
    canWrite = false,
    endpoint = '/admin/api/cms/menus'
  } = $props<{
    header?: NavItem[];
    footer?: NavItem[];
    legal?: NavItem[];
    pages?: { id: number; title: string; path: string; status: string }[];
    canWrite?: boolean;
    /**
     * Destination des écritures : le relais de la rubrique, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  }>();

  /**
   * Onglet actif, porté par l'URL (`?emplacement=`) et non par le seul état du
   * composant.
   *
   * Après une écriture, `flashAndReload` réaffiche la page courante et l'île est
   * remontée : un état local repartait donc sur « En-tête », et l'entrée qu'on venait
   * d'ajouter au pied de page disparaissait de l'écran. Passer par l'URL rend aussi
   * l'onglet partageable et compatible avec le bouton Précédent.
   */
  const LOCATION_PARAM = 'emplacement';

  function locationFromUrl(): NavLocation {
    if (typeof window === 'undefined') return 'header';
    const requested = new URLSearchParams(window.location.search).get(LOCATION_PARAM) ?? '';
    return (NAV_LOCATIONS as readonly string[]).includes(requested)
      ? (requested as NavLocation)
      : 'header';
  }

  let location = $state<NavLocation>(locationFromUrl());

  /*
    `replaceState` et non une navigation : changer d'onglet ne recharge rien, on ne
    fait qu'enregistrer où l'on est pour le prochain réaffichage. L'emplacement par
    défaut n'écrit pas de paramètre, pour garder l'URL nue quand elle peut l'être.
  */
  $effect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (location === 'header') url.searchParams.delete(LOCATION_PARAM);
    else url.searchParams.set(LOCATION_PARAM, location);
    if (url.toString() !== window.location.href) window.history.replaceState({}, '', url);
  });
  let showFormSheet = $state(false);
  let busy = $state(false);
  let errorMsg = $state('');

  let editingId = $state<number | null>(null);
  let label = $state('');
  let targetKind = $state<'page' | 'external' | 'none'>('page');
  let pageId = $state('');
  let externalUrl = $state('');
  let parentId = $state('');

  const trees: Record<NavLocation, NavItem[]> = $derived({ header, footer, legal });
  const tree = $derived(trees[location]);

  /**
   * Un mot par emplacement, réutilisé par l'onglet vide et par le formulaire : trois
   * emplacements et deux formulations en ternaire finissaient toujours par diverger.
   */
  const LOCATION_HINTS: Record<NavLocation, string> = {
    header: 'Ajoutez les entrées de la barre de navigation du site.',
    footer: 'Ajoutez les liens de la colonne « Le site » du pied de page.',
    legal: 'Ajoutez les liens de la barre légale, tout en bas : mentions légales, confidentialité.'
  };

  const pageItems: ComboboxItem[] = $derived(
    pages.map((page) => ({
      value: String(page.id),
      label: page.title,
      description: page.status === 'published' ? page.path : `${page.path} — brouillon`
    }))
  );

  /** Parents possibles : les entrées de premier niveau de l'emplacement courant. */
  const parentOptions = $derived(
    tree.filter((item: NavItem) => item.id !== editingId)
  );

  async function call(path: string, method: string, body?: unknown, fallback = "L'opération a échoué.") {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'proxy', path, method, payload: body })
    });
    if (!response.ok) {
      let message = fallback;
      try {
        const parsed = (await response.json()) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch { /* message générique */ }
      throw new Error(message);
    }
  }

  function resetForm() {
    editingId = null;
    label = '';
    targetKind = 'page';
    pageId = '';
    externalUrl = '';
    parentId = '';
    errorMsg = '';
  }

  function openAddForm(presetParentId?: number) {
    resetForm();
    if (presetParentId !== undefined) parentId = String(presetParentId);
    showFormSheet = true;
  }

  function startEdit(item: NavItem) {
    editingId = item.id;
    label = item.label;
    // Ni page ni adresse : l'entrée ne fait que regrouper.
    targetKind =
      item.pageId !== null ? 'page' : item.externalUrl !== null ? 'external' : 'none';
    pageId = item.pageId !== null ? String(item.pageId) : '';
    externalUrl = item.externalUrl ?? '';
    parentId = item.parentId !== null ? String(item.parentId) : '';
    errorMsg = '';
    showFormSheet = true;
  }

  async function save(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;

    const id = editingId;
    const payload = {
      location,
      label: label.trim(),
      parentId: parentId ? Number(parentId) : null,
      pageId: targetKind === 'page' && pageId ? Number(pageId) : null,
      externalUrl: targetKind === 'external' ? externalUrl.trim() || null : null
    };

    await submitForm({
      validate: () => {
        if (!label.trim()) return "L'intitulé de l'entrée est obligatoire.";
        if (targetKind === 'page' && !pageId) return 'Choisissez la page vers laquelle pointe cette entrée.';
        if (targetKind === 'external' && !externalUrl.trim()) return "Saisissez l'adresse extérieure.";
        // Le serveur refuse déjà une sous-entrée sans cible ; le dire ici évite
        // l'aller-retour, et nomme la contrainte au moment où elle se pose.
        if (targetKind === 'none' && parentId)
          return 'Une sous-entrée doit mener quelque part : seules les entrées de premier niveau peuvent se contenter de regrouper.';
        return null;
      },
      submit: () =>
        id ? call(`/cms/nav/${id}`, 'PUT', payload) : call('/cms/nav', 'POST', payload),
      close: () => {
        resetForm();
        showFormSheet = false;
      },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => {
        errorMsg = message;
      }
    });

    busy = false;
  }

  /**
   * Déplace une entrée dans sa fratrie.
   *
   * On renvoie la liste complète des identifiants dans le nouvel ordre plutôt qu'un
   * échange deux à deux : le serveur renumérote de 0 à n, ce qui répare au passage les
   * trous laissés par une suppression.
   */
  async function move(siblings: NavItem[], index: number, delta: number) {
    const next = index + delta;
    if (next < 0 || next >= siblings.length) return;
    const ids = siblings.map((item) => item.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    try {
      await call('/cms/nav/reorder', 'PUT', { ids }, "Le déplacement a échoué.");
      flashAndReload('Ordre du menu mis à jour.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : "Le déplacement a échoué.");
    }
  }

  async function remove(item: NavItem) {
    const hasChildren = item.children.length > 0;
    const confirmed = await uiConfirm({
      title: `Retirer « ${item.label} » du menu ?`,
      description: hasChildren
        ? `Son sous-menu (${item.children.length} entrée${item.children.length > 1 ? 's' : ''}) sera retiré avec elle. Les pages elles-mêmes ne sont pas supprimées.`
        : "L'entrée disparaît du menu. La page elle-même n'est pas supprimée.",
      confirmLabel: 'Retirer',
      destructive: true
    });
    if (!confirmed) return;
    try {
      await call(`/cms/nav/${item.id}`, 'DELETE', undefined, 'La suppression a échoué.');
      flashAndReload('Entrée retirée du menu.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

<Tabs.Root bind:value={location}>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <!-- `w-full sm:w-fit` : `Tabs.List` s'étire sur toute la largeur par défaut (le
         composant impose `w-full` pour le défilement horizontal sur mobile). Sur
         écran large, la barre se réduit à ses onglets, comme partout ailleurs. -->
    <Tabs.List class="w-full justify-start sm:w-fit sm:justify-center">
      {#each NAV_LOCATIONS as value (value)}
        <Tabs.Trigger {value}>{NAV_LOCATION_LABELS[value]}</Tabs.Trigger>
      {/each}
    </Tabs.List>

    {#if canWrite}
      <Button onclick={() => openAddForm()} class="h-9 shrink-0 gap-1.5 font-bold">
        <Plus class="h-4 w-4" />
        <span>Nouvelle entrée</span>
      </Button>
    {/if}
  </div>

  {#each NAV_LOCATIONS as value (value)}
    <Tabs.Content {value} class="mt-4">
      {#if tree.length === 0}
        <Card.Root>
          <Card.Content class="p-6">
            <EmptyState
              title="Menu vide"
              description={LOCATION_HINTS[value]}
            />
          </Card.Content>
        </Card.Root>
      {:else}
        <Card.Root>
          <Card.Content class="p-2">
            <ul class="divide-border divide-y">
              {#each tree as item, index (item.id)}
                <li>
                  <div class="flex items-center gap-2 px-2 py-2.5">
                    <span class="min-w-0 flex-1">
                      <span class="block font-medium">{item.label}</span>
                      <span class="text-muted-foreground flex items-center gap-1 text-xs">
                        {#if item.externalUrl}
                          <ExternalLink class="h-3 w-3 shrink-0" aria-hidden="true" />
                        {/if}
                        {#if item.href === null}
                          <span class="italic">Regroupe seulement ses sous-entrées</span>
                        {:else}
                          <code class="truncate">{item.href}</code>
                        {/if}
                      </span>
                    </span>

                    {#if item.children.length > 0}
                      <Badge variant="outline" size="xs">
                        {item.children.length} sous-entrée{item.children.length > 1 ? 's' : ''}
                      </Badge>
                    {/if}

                    {#if canWrite}
                      <span class="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0}
                          onclick={() => move(tree, index, -1)}
                        >
                          <ChevronUp class="h-4 w-4" />
                          <span class="sr-only">Monter</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === tree.length - 1}
                          onclick={() => move(tree, index, 1)}
                        >
                          <ChevronDown class="h-4 w-4" />
                          <span class="sr-only">Descendre</span>
                        </Button>
                        <DataTableRowActions>
                          <DropdownMenu.Label>Actions</DropdownMenu.Label>
                          <DropdownMenu.Item onclick={() => startEdit(item)} class="cursor-pointer">
                            <Edit class="mr-2 h-3.5 w-3.5" />
                            Modifier
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onclick={() => openAddForm(item.id)} class="cursor-pointer">
                            <CornerDownRight class="mr-2 h-3.5 w-3.5" />
                            Ajouter une sous-entrée
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onclick={() => remove(item)}
                            class="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 class="mr-2 h-3.5 w-3.5" />
                            Retirer du menu
                          </DropdownMenu.Item>
                        </DataTableRowActions>
                      </span>
                    {/if}
                  </div>

                  {#if item.children.length > 0}
                    <ul class="border-border ml-6 border-l pl-2">
                      {#each item.children as child, childIndex (child.id)}
                        <li class="flex items-center gap-2 px-2 py-2">
                          <span class="min-w-0 flex-1">
                            <span class="block text-sm">{child.label}</span>
                            <code class="text-muted-foreground block truncate text-xs">{child.href}</code>
                          </span>
                          {#if canWrite}
                            <span class="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={childIndex === 0}
                                onclick={() => move(item.children, childIndex, -1)}
                              >
                                <ChevronUp class="h-4 w-4" />
                                <span class="sr-only">Monter</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={childIndex === item.children.length - 1}
                                onclick={() => move(item.children, childIndex, 1)}
                              >
                                <ChevronDown class="h-4 w-4" />
                                <span class="sr-only">Descendre</span>
                              </Button>
                              <DataTableRowActions>
                                <DropdownMenu.Label>Actions</DropdownMenu.Label>
                                <DropdownMenu.Item onclick={() => startEdit(child)} class="cursor-pointer">
                                  <Edit class="mr-2 h-3.5 w-3.5" />
                                  Modifier
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  onclick={() => remove(child)}
                                  class="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 class="mr-2 h-3.5 w-3.5" />
                                  Retirer du menu
                                </DropdownMenu.Item>
                              </DataTableRowActions>
                            </span>
                          {/if}
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </li>
              {/each}
            </ul>
          </Card.Content>
        </Card.Root>
      {/if}
    </Tabs.Content>
  {/each}
</Tabs.Root>

<FormSheet
  bind:open={showFormSheet}
  title={editingId ? "Modifier l'entrée" : 'Nouvelle entrée de menu'}
  description={location === 'header'
    ? 'Dans la barre de navigation du site. Une entrée sans sous-menu est un lien direct.'
    : LOCATION_HINTS[location]}
  icon={editingId ? Edit : Plus}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel={editingId ? 'Enregistrer' : 'Ajouter'}
  submittingLabel="Enregistrement…"
  onSubmit={save}
>
  <FormField id="nav-label" label="Intitulé">
    <Input id="nav-label" bind:value={label} placeholder="Le club" maxlength={80} />
  </FormField>

  <FormField id="nav-parent" label="Emplacement">
    <Select id="nav-parent" bind:value={parentId}>
      <option value="">Entrée principale</option>
      {#each parentOptions as parent (parent.id)}
        <option value={String(parent.id)}>Sous-entrée de « {parent.label} »</option>
      {/each}
    </Select>
  </FormField>

  <FormField id="nav-target-kind" label="Cible">
    <Select
      id="nav-target-kind"
      value={targetKind}
      onchange={(e) =>
        (targetKind = (e.currentTarget as HTMLSelectElement).value as 'page' | 'external' | 'none')}
    >
      <option value="page">Une page du site</option>
      <option value="external">Une adresse extérieure</option>
      <option value="none" disabled={Boolean(parentId)}>Aucune — regroupe seulement ses sous-entrées</option>
    </Select>
  </FormField>

  {#if targetKind === 'none'}
    <p class="text-muted-foreground text-sm">
      Cette entrée n'est pas cliquable : elle sert d'intitulé au-dessus de ses sous-entrées.
      Pensez à lui en ajouter, sans quoi elle n'affichera rien.
    </p>
  {:else if targetKind === 'page'}
    <FormField id="nav-page" label="Page">
      <Combobox
        id="nav-page"
        items={pageItems}
        bind:value={pageId}
        placeholder="Rechercher une page…"
        clearLabel="Aucune page"
      />
    </FormField>
  {:else}
    <FormField id="nav-url" label="Adresse">
      <Input id="nav-url" bind:value={externalUrl} placeholder="https://www.ffbad.org/" maxlength={500} />
    </FormField>
  {/if}
</FormSheet>
