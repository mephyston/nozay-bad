<script lang="ts">
  import { Landmark, TriangleAlert, User, Plus, Pencil, X } from '@lucide/svelte';
  import {
    Card,
    Badge,
    Button,
    Select,
    EmptyState,
    FormSheet,
    FormField,
    SearchableCombobox,
    uiConfirm,
    flashAndReload
  } from '@nba/ui';
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
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Landmark class="w-4 h-4" />
      Une fonction au plus par adhérent ; président, trésorier et trésorier adjoint n'ont qu'un titulaire.
    </div>
    <div class="flex items-center gap-2">
      {#if seasons.length > 0}
        <div class="w-36">
          <Select bind:value={selectedSeason} onchange={changeSeason} aria-label="Saison">
            {#each seasons as s (s.code)}
              <option value={s.code}>{s.name.replace('Saison ', '')}</option>
            {/each}
          </Select>
        </div>
      {/if}
      {#if canWrite}
        <Button size="sm" onclick={() => openCreate()}>
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
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each byFunction as group (group.fn)}
        <Card.Root>
          <Card.Content class="p-4 space-y-2">
            <div class="flex items-center justify-between gap-2 border-b border-border pb-2">
              <h3 class="text-sm font-bold text-foreground">{group.label}</h3>
              {#if group.holders.length === 0}
                <Badge variant="warning" size="xs">Non attribuée</Badge>
              {/if}
            </div>
            {#each group.holders as holder (holder.licence)}
              <div class="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-accent/50 transition-colors">
                <a
                  href={`/admin/members/${holder.licence}?season=${encodeURIComponent(season)}`}
                  class="flex items-center gap-2 min-w-0 flex-1"
                >
                  <User class="w-4 h-4 text-muted-foreground shrink-0" />
                  <span class="text-sm font-medium text-foreground truncate">{displayName(holder)}</span>
                  <span class="text-xs text-muted-foreground shrink-0">{holder.licence}</span>
                  {#if holder.memberId === null}
                    <!-- Licence sans dossier : l'adhérent a quitté le référentiel, la
                         fonction reste — la retirer est une décision humaine. -->
                    <Badge variant="destructive" size="xs">Sans dossier</Badge>
                  {/if}
                </a>
                {#if canWrite}
                  <button
                    type="button"
                    class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                    title="Changer de fonction"
                    aria-label={`Changer la fonction de ${displayName(holder)}`}
                    onclick={() => openEdit(holder)}
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive shrink-0"
                    title="Retirer la fonction"
                    aria-label={`Retirer la fonction de ${displayName(holder)}`}
                    onclick={() => remove(holder)}
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                {/if}
              </div>
            {:else}
              <p class="text-xs text-muted-foreground italic">Personne pour cette saison.</p>
            {/each}
            {#if canWrite}
              <button
                type="button"
                class="text-xs text-primary hover:underline flex items-center gap-1"
                onclick={() => openCreate(group.fn)}
              >
                <Plus class="w-3 h-3" />
                Attribuer
              </button>
            {/if}
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
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

  <FormField label="Fonction" id="dirigeant-function">
    <Select id="dirigeant-function" bind:value={fn}>
      {#each CLUB_FUNCTIONS as code (code)}
        <option value={code}>{CLUB_FUNCTION_LABELS[code]}</option>
      {/each}
    </Select>
  </FormField>
</FormSheet>
