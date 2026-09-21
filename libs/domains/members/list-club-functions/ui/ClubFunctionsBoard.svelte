<script lang="ts">
  import { Landmark, TriangleAlert, Plus } from '@lucide/svelte';
  import {
    Button,
    EmptyState,
    FormSheet,
    FormField,
    SearchableCombobox,
    uiConfirm,
    flashAndReload,
    toSeasonOptions,
    ChoiceField,
    dockDePage
  } from '@nba/ui';
  import ClubFunctionsList from './ClubFunctionsList.svelte';
  import ClubFunctionsGrid from './ClubFunctionsGrid.svelte';
  import { CLUB_FUNCTIONS, CLUB_FUNCTION_LABELS, type ClubFunction } from '../../shared/club-functions';
  import type { ClubFunctionAssignment } from '../dto';

  interface SeasonOption {
    id?: number;
    code: string;
    name: string;
  }

  let {
    assignments = [],
    seasons = [],
    season,
    members = [],
    canWrite = false
  }: {
    assignments?: ClubFunctionAssignment[];
    seasons?: SeasonOption[];
    season: string;
    /** Adhérents de la saison, source du sélecteur d'ajout. */
    members?: Array<{ licence: string; firstName: string; lastName: string }>;
    canWrite?: boolean;
  } = $props();

  // La saison vient de l'URL et la page est rendue côté serveur : changer de saison
  // est une navigation, pas un état local.
  let selectedSeason = $state(season);
  /* Même liste, même ordre chronologique que partout ailleurs : ce sélecteur rendait ses
     options dans l'ordre de la réponse serveur, donc de la plus récente à la plus ancienne. */
  const seasonOptions = $derived(toSeasonOptions(seasons));
  function changeSeason() {
    if (selectedSeason !== season) {
      window.location.href = `/admin/members/dirigeants?season=${encodeURIComponent(selectedSeason)}`;
    }
  }

  const byFunction = $derived(
    CLUB_FUNCTIONS.map((fn: ClubFunction) => ({
      fn,
      label: CLUB_FUNCTION_LABELS[fn],
      holders: assignments.filter((a) => a.function === fn)
    }))
  );

  /*
    L'ajout descend dans la barre du bas : c'est la seule action de l'écran, et elle
    vivait en haut d'un en-tête qui défile. Rien à chercher ici, donc pas de loupe.
  */
  $effect(() => {
    if (!canWrite) return;
    return dockDePage.declarerActions([
      { id: 'ajouter-dirigeant', label: 'Ajouter un dirigeant', icon: Plus, run: () => openCreate() }
    ]);
  });

  const displayName = (a: { firstName: string | null; lastName: string | null; licence: string }) =>
    [a.firstName, a.lastName].filter(Boolean).join(' ').trim() || `Licence ${a.licence}`;

  // ── Feuille d'ajout / modification ─────────────────────────────────────────
  let sheetOpen = $state(false);
  /** `null` = ajout ; sinon la licence dont on modifie la fonction (verrouillée). */
  let editingLicence = $state<string | null>(null);
  let licence = $state('');
  let fn = $state<ClubFunction>('committee_member');
  let sheetError = $state('');
  let saving = $state(false);

  function openCreate(preselect?: ClubFunction) {
    editingLicence = null;
    licence = '';
    fn = preselect ?? 'committee_member';
    sheetError = '';
    sheetOpen = true;
  }

  function openEdit(assignment: ClubFunctionAssignment) {
    editingLicence = assignment.licence;
    licence = assignment.licence;
    fn = assignment.function;
    sheetError = '';
    sheetOpen = true;
  }

  /**
   * Sélecteur d'adhérent : filtré à la main et plafonné — le club compte plus de deux
   * cents adhérents, la recherche interne du composant repasserait sur tout le lot à
   * chaque frappe (même raison que la feuille d'effectif des équipes).
   */
  const MAX_SUGGESTIONS = 30;
  let memberQuery = $state('');
  const byLicence = $derived(new Map(members.map((m) => [m.licence, m])));
  const memberItems = $derived.by(() => {
    const needle = memberQuery.trim().toLowerCase();
    const matches = members
      .filter(
        (m) =>
          !needle ||
          m.lastName.toLowerCase().includes(needle) ||
          m.firstName.toLowerCase().includes(needle) ||
          m.licence.includes(needle)
      )
      .slice(0, MAX_SUGGESTIONS)
      .map((m) => ({ label: `${m.lastName} ${m.firstName}`, value: m.licence }));
    // La sélection courante reste listée, sinon le libellé retomberait au placeholder.
    if (licence && !matches.some((i) => i.value === licence)) {
      const member = byLicence.get(licence);
      return [
        { label: member ? `${member.lastName} ${member.firstName}` : `Licence ${licence}`, value: licence },
        ...matches
      ];
    }
    return matches;
  });

  async function put(targetLicence: string, functions: ClubFunction[]) {
    const response = await fetch('/admin/api/member-functions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licence: targetLicence, season, functions })
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) throw new Error(payload?.error || "L'enregistrement a échoué.");
  }

  function invalidateAlertCache() {
    try {
      // L'indicateur « fonctions à définir » de la barre latérale met le statut en
      // cache de session : toute écriture le périme.
      sessionStorage.removeItem('club_functions_alert');
    } catch {
      /* Sans stockage, rien à invalider. */
    }
  }

  async function save() {
    if (!licence) {
      sheetError = 'Choisissez un adhérent.';
      return;
    }
    saving = true;
    sheetError = '';
    try {
      await put(licence, [fn]);
      invalidateAlertCache();
      sheetOpen = false;
      flashAndReload('Fonction enregistrée.');
    } catch (err: any) {
      sheetError = err?.message || "L'enregistrement a échoué.";
    }
    saving = false;
  }

  async function remove(assignment: ClubFunctionAssignment) {
    const ok = await uiConfirm(
      `Retirer la fonction ${CLUB_FUNCTION_LABELS[assignment.function]} de ${displayName(assignment)} ?`
    );
    if (!ok) return;
    try {
      await put(assignment.licence, []);
      invalidateAlertCache();
      flashAndReload('Fonction retirée.');
    } catch (err: any) {
      flashAndReload(err?.message || 'Le retrait a échoué.', 'error');
    }
  }
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <!-- La règle est une explication : elle reste à la souris, qui a la place. -->
    <div class="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
      <Landmark class="w-4 h-4" />
      Une fonction au plus par adhérent ; président, trésorier et trésorier adjoint n'ont qu'un titulaire.
    </div>
    <div class="flex w-full items-center gap-2 md:w-auto">
      {#if seasonOptions.length > 0}
        <div class="w-full md:w-36">
          <!--
            Au doigt, la saison devient une rangée : intitulé à gauche, valeur et
            double chevron à droite, comme tout ce qui ouvre un menu. Le bloc autour
            porte l'intitulé que la rangée absorbe — sans lui, la rangée n'affiche
            que sa valeur, et rien ne dit de quoi elle parle.
          -->
          <FormField id="saison-dirigeants" label="Saison">
            <ChoiceField
              id="saison-dirigeants"
              label="Saison"
              options={seasonOptions.map((o) => ({ value: String(o.value), label: o.label.replace('Saison ', '') }))}
              bind:value={selectedSeason}
              onChange={changeSeason}
            />
          </FormField>
        </div>
      {/if}
      {#if canWrite}
        <!-- Sur téléphone, cette action vit dans la barre du bas. -->
        <Button size="sm" onclick={() => openCreate()} class="hidden md:inline-flex">
          <Plus class="w-3.5 h-3.5" />
          Ajouter un dirigeant
        </Button>
      {/if}
    </div>
  </div>

  {#if assignments.length === 0}
    <!-- Table vide en début de saison : c'est l'action à réaliser que signale le menu. -->
    <EmptyState
      icon={TriangleAlert}
      title="Aucune fonction définie pour cette saison"
      description="Après l'assemblée générale, attribuez leur fonction aux dirigeants. Les rappels de gestion du club (import des classements avant une journée d'interclubs, etc.) leur sont adressés."
    />
  {:else}
    <ClubFunctionsList
      groupes={byFunction}
      {season}
      {canWrite}
      nomAffiche={displayName}
      onEdit={openEdit}
      onRemove={remove}
      onCreate={(fn) => openCreate(fn)}
    />

    <ClubFunctionsGrid
      groupes={byFunction}
      {season}
      {canWrite}
      nomAffiche={displayName}
      onEdit={openEdit}
      onRemove={remove}
      onCreate={(fn) => openCreate(fn)}
    />
  {/if}
</div>

<FormSheet
  bind:open={sheetOpen}
  title={editingLicence ? 'Changer la fonction' : 'Ajouter un dirigeant'}
  description={editingLicence
    ? 'La nouvelle fonction remplace l’actuelle : un adhérent n’en porte qu’une.'
    : 'L’adhérent choisi portera cette fonction pour la saison ; s’il en avait déjà une, elle est remplacée.'}
  icon={Landmark}
  error={sheetError}
  isSubmitting={saving}
  submitLabel="Enregistrer"
  onSubmit={save}
>
  <FormField label="Adhérent" id="dirigeant-member">
    <SearchableCombobox
      items={memberItems}
      filter={false}
      onSearch={(q) => (memberQuery = q)}
      bind:value={licence}
      disabled={editingLicence !== null}
      placeholder="Choisir un adhérent"
      searchPlaceholder="Nom, prénom ou licence…"
    />
  </FormField>

  <!--
    `ChoiceField` et non la liste déroulante native : celle-ci fait 32 px de haut,
    moitié moins qu'une cible tactile, et n'a pas la forme des autres rangées du
    formulaire.
  -->
  <FormField label="Fonction" id="dirigeant-function">
    <ChoiceField
      id="dirigeant-function"
      label="Fonction"
      options={CLUB_FUNCTIONS.map((code) => ({ value: code, label: CLUB_FUNCTION_LABELS[code] }))}
      bind:value={() => fn, (v) => (fn = v as ClubFunction)}
    />
  </FormField>
</FormSheet>
