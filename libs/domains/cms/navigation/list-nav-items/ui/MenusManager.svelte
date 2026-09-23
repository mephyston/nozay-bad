<script lang="ts">
  import { Plus, Edit, Menu, GripVertical, Check } from '@lucide/svelte';
  import {
    Button,
    Input,
    ChoiceField,
    ChoicePicker,
    Tabs,
    FormField,
    FormSheet,
    Combobox,
    type ComboboxItem,
    dockDePage,
    submitForm,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import MenusList from './MenusList.svelte';
  import { type EntreeLike } from './menus-row-model';

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

  /*
    L'arbre est tenu en état local, semé des propriétés reçues.
    
    Il l'était en `$derived` des propriétés, ce qui obligeait à recharger la page
    entière après chaque déplacement pour en voir l'effet. Une liste dont on range
    l'ordre ne peut pas sauter à chaque cran : le nouvel ordre s'applique ici, et le
    serveur n'est prévenu qu'ensuite. S'il refuse, on remet l'ordre d'avant.
  */
  let arbres = $state<Record<NavLocation, NavItem[]>>({ header, footer, legal });
  const tree = $derived(arbres[location]);

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

  const gestes = $derived({
    canWrite,
    onEdit: (e: EntreeLike) => startEdit(e as unknown as NavItem),
    onAddChild: (e: EntreeLike) => openAddForm(e.id),
    onMove: (fratrie: EntreeLike[], rang: number, delta: number) =>
      deplacer(fratrie as unknown as NavItem[], rang, rang + delta),
    onRemove: (e: EntreeLike) => remove(e as unknown as NavItem)
  });

  /*
    L'emplacement est une **portée**, pas un filtre : il ne réduit pas une liste, il
    dit laquelle on regarde. La barre du bas a une pilule pour ça, et les onglets —
    qui imposaient un défilement horizontal sous 390 px — restent à la souris.
  */
  let choixPortee = $state(false);

  const PORTEES_COURTES: Record<NavLocation, string> = {
    header: 'En-tête',
    footer: 'Pied',
    legal: 'Légal'
  };

  $effect(() =>
    dockDePage.declarerPortee({
      label: 'Emplacement',
      valeur: PORTEES_COURTES[location],
      ouvrir: () => (choixPortee = true)
    })
  );

  /*
    Le mode réorganisation, à la façon d'iOS : les poignées n'apparaissent qu'une fois
    demandées, et les rangées cessent alors de mener quelque part. C'est la réponse à
    la règle d'une seule affordance — une poignée posée en permanence sur chaque
    rangée serait exactement le « … » qu'on vient de retirer.
  */
  let reorganise = $state(false);

  /* Créer et ranger descendent dans la barre du bas. */
  $effect(() => {
    if (!canWrite) return;
    const actions: SwipeAction[] = reorganise
      ? [{ id: 'terminer', label: 'Terminer', icon: Check, run: () => (reorganise = false) }]
      : [
          { id: 'nouvelle', label: 'Nouvelle entrée', icon: Menu, run: () => openAddForm() },
          ...(tree.length > 1
            ? [
                {
                  id: 'ranger',
                  label: 'Réorganiser',
                  icon: GripVertical,
                  run: () => (reorganise = true)
                }
              ]
            : [])
        ];
    return dockDePage.declarerActions(
      actions,
      reorganise ? { icon: Check, label: 'Terminer' } : { icon: Plus, label: 'Nouvelle entrée' }
    );
  });

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
   * Déplace une entrée dans sa fratrie, du rang `de` au rang `vers`.
   *
   * On renvoie la liste complète des identifiants dans le nouvel ordre plutôt qu'un
   * échange deux à deux : le serveur renumérote de 0 à n, ce qui répare au passage les
   * trous laissés par une suppression. C'est aussi ce qui permet au glissement de
   * franchir plusieurs rangs d'un coup, là où les flèches n'en passaient qu'un.
   *
   * L'ordre s'applique à l'écran **avant** l'aller-retour : c'est ce qu'on vient de
   * faire du doigt, l'attendre le ferait clignoter. Un refus du serveur le rend.
   */
  async function deplacer(fratrie: NavItem[], de: number, vers: number) {
    if (de === vers || vers < 0 || vers >= fratrie.length) return;

    const avant = fratrie.map((item) => item.id);
    const apres = [...fratrie];
    const [deplacee] = apres.splice(de, 1);
    apres.splice(vers, 0, deplacee);

    appliquerLOrdre(apres.map((item) => item.id));

    try {
      await call('/cms/nav/reorder', 'PUT', { ids: apres.map((i) => i.id) }, "Le déplacement a échoué.");
    } catch (error) {
      appliquerLOrdre(avant);
      uiAlert(error instanceof Error ? error.message : "Le déplacement a échoué.");
    }
  }

  /**
   * Réordonne la fratrie que désignent ces identifiants, où qu'elle soit dans l'arbre.
   *
   * Une fratrie est soit le premier niveau d'un emplacement, soit les enfants d'une
   * entrée : on ne sait pas laquelle avant d'avoir cherché, et c'est cette recherche
   * qui évite de demander à l'appelant de dire où il se trouve.
   */
  /** Le glissement donne la fratrie et les deux rangs ; le reste est commun aux flèches. */
  function appliquerDepuisLaListe(fratrie: EntreeLike[], de: number, vers: number) {
    void deplacer(fratrie as unknown as NavItem[], de, vers);
  }

  function appliquerLOrdre(ids: number[]) {
    const ranger = (liste: NavItem[]) =>
      [...liste].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    const concerne = (liste: NavItem[]) =>
      liste.length === ids.length && liste.every((item) => ids.includes(item.id));

    const racine = arbres[location];
    if (concerne(racine)) {
      arbres = { ...arbres, [location]: ranger(racine) };
      return;
    }
    arbres = {
      ...arbres,
      [location]: racine.map((parent) =>
        concerne(parent.children) ? { ...parent, children: ranger(parent.children) } : parent
      )
    };
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
  <!-- Les onglets restent à la souris : sous 390 px, `Tabs.List` imposait un
       défilement horizontal, et l'emplacement se choisit désormais dans la pilule de
       portée de la barre du bas. -->
  <div class="hidden flex-wrap items-center justify-between gap-3 md:flex">
    <Tabs.List class="w-fit justify-center">
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
      <!--
        Les trois panneaux restent montés : sans cette garde, la liste était rendue
        trois fois — soixante rangées pour vingt, et autant de poignées. Le même
        défaut qu'un onglet endormi qui déclare la recherche de la barre du bas.
      -->
      {#if value === location}
      {#if reorganise}
        <p class="mb-3 px-4 text-xs text-muted-foreground">
          Tirez une entrée par sa poignée pour la déplacer. Une sous-entrée reste sous
          son parent : pour la changer de parent, ouvrez-la et modifiez son niveau.
        </p>
      {/if}
      <MenusList
        arbre={tree}
        {reorganise}
        onReorder={appliquerDepuisLaListe}
        {...gestes}
        emptyDescription={LOCATION_HINTS[value]}
      />
      {/if}
    </Tabs.Content>
  {/each}
</Tabs.Root>

<!-- Le choix d'emplacement, atteint depuis la pilule de portée. -->
<ChoicePicker
  bind:open={choixPortee}
  title="Emplacement"
  description="Trois menus, sur trois endroits du site."
  value={location}
  options={NAV_LOCATIONS.map((v) => ({
    value: v,
    label: NAV_LOCATION_LABELS[v],
    hint: LOCATION_HINTS[v]
  }))}
  onChoose={(v) => (location = v as NavLocation)}
/>

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

  <FormField id="nav-parent" label="Niveau">
    <ChoiceField
      id="nav-parent"
      label="Niveau"
      bind:value={parentId}
      options={[
        { value: '', label: 'Entrée principale' },
        ...parentOptions.map((parent: NavItem) => ({
          value: String(parent.id),
          label: `Sous-entrée de « ${parent.label} »`
        }))
      ]}
    />
  </FormField>

  <FormField
    id="nav-target-kind"
    label="Cible"
    hint={parentId && targetKind === 'none'
      ? 'Une sous-entrée doit mener quelque part.'
      : undefined}
  >
    <ChoiceField
      id="nav-target-kind"
      label="Cible"
      value={targetKind}
      onChange={(v) => (targetKind = v as 'page' | 'external' | 'none')}
      options={[
        { value: 'page', label: 'Une page du site' },
        { value: 'external', label: 'Une adresse extérieure' },
        /* Proposée même sous un parent : le formulaire refuse la combinaison en
           toutes lettres, ce qu'une option absente n'expliquerait pas. */
        { value: 'none', label: 'Aucune', hint: 'Regroupe seulement ses sous-entrées' }
      ]}
    />
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
