<script lang="ts">
  import { FormSheet, FormField, Input, ChoiceField, SwitchField, submitForm } from '@nba/ui';
  import { Trophy } from '@lucide/svelte';
  import {
    CHAMPIONSHIPS,
    CHAMPIONSHIP_RULES,
    teamName,
    type Championship
  } from '../../shared/championship';
  import { describeEligibility } from '../../shared/eligibility';
  import type { TeamListItem } from '../../list-teams/dto';

  let {
    open = $bindable(false),
    team = null,
    seasonCode,
    teamPrefix,
    onSaved,
    endpoint = '/admin/api/teams/teams'
  }: {
    open: boolean;
    /** `null` = création. */
    team: TeamListItem | null;
    /**
     * Saison de l'équipe, transmise explicitement.
     *
     * La page ne peut pas la deviner au moment d'un POST : elle ne résout la saison
     * courante qu'après, pour l'affichage. S'en remettre au paramètre d'URL faisait
     * créer l'équipe en saison vide au premier chargement — invisible dans la liste,
     * et hors de la contrainte d'unicité qui porte la hiérarchie des numéros.
     */
    seasonCode: string;
    /** Préfixe des équipes du club (`club_settings.team_prefix`), pour annoncer le nom dérivé. */
    teamPrefix: string;
    onSaved: () => void;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  } = $props();

  let championship = $state<Championship>('icd_mixte');
  let division = $state('');
  /**
   * Saisi en chaîne, converti à l'enregistrement.
   *
   * Le composant `Input` passe son `type` en expression : Svelte ne peut alors pas
   * convertir `bind:value` en nombre, et rend la saisie sous forme de chaîne. Le laisser
   * typé `number` marchait tant qu'on gardait la valeur par défaut, et échouait dès qu'on
   * touchait au champ — l'API rejetant `"3"` sur un `Type.Integer()`.
   */
  let numberInput = $state('1');
  const number = $derived(Number.parseInt(numberInput, 10));
  let poolLabel = $state('');
  let active = $state(true);
  let error = $state<string | null>(null);
  let submitting = $state(false);

  /**
   * Le championnat pilote tout le reste : divisions proposées, format de rencontre et
   * limites de classement. Les quatre règlements ne se ressemblent pas, et un formulaire
   * qui l'ignorerait laisserait créer une équipe de mixte en division « Promotion ».
   */
  const rules = $derived(CHAMPIONSHIP_RULES[championship]);
  const divisions = $derived(rules.divisions);
  const selectedDivision = $derived(divisions.find((d) => d.code === division) ?? null);

  // Réinitialise la division dès qu'elle n'existe plus dans le championnat choisi.
  $effect(() => {
    if (!divisions.some((d) => d.code === division)) division = divisions[0]?.code ?? '';
  });

  $effect(() => {
    if (!open) return;
    championship = team?.championship ?? 'icd_mixte';
    division = team?.division ?? '';
    numberInput = String(team?.number ?? 1);
    poolLabel = team?.poolLabel ?? '';
    active = team?.active ?? true;
    error = null;
  });

  async function save() {
    submitting = true;
    await submitForm({
      validate: () => {
        if (!division) return 'Choisissez une division.';
        if (!Number.isInteger(number) || number < 1) return "Le numéro d'équipe doit être un entier positif.";
        if (number > 20) return "Le numéro d'équipe paraît erroné.";
        return null;
      },
      submit: async () => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save-team',
            id: team?.id,
            seasonCode,
            championship,
            division,
            number,
            poolLabel: poolLabel.trim() || null,
            active
          })
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error || "L'enregistrement a échoué.");
      },
      close: () => {
        open = false;
        onSaved();
      },
      onError: (message) => (error = message)
    });
    submitting = false;
  }
</script>

<FormSheet
  bind:open
  title={team ? `Modifier ${team.name}` : 'Créer une équipe'}
  description="Le nom est dérivé du numéro : il ne se saisit pas."
  icon={Trophy}
  {error}
  isSubmitting={submitting}
  onSubmit={save}
>
  <!--
    Une liste déroulante native ouvre la roulette du système : au doigt, on y vise un
    championnat dans une bande de trente pixels. La rangée mène à un écran de choix où
    chaque entrée a sa ligne de 44 points.
  -->
  <FormField label="Championnat" id="championship">
    <ChoiceField
      id="championship"
      label="Championnat"
      value={championship}
      onChange={(v) => (championship = v as typeof championship)}
      options={CHAMPIONSHIPS.map((code) => ({ value: code, label: CHAMPIONSHIP_RULES[code].label }))}
    />
  </FormField>

  <!--
    Le format et l'éligibilité accompagnent chaque division dans l'écran de choix, et
    non plus seulement sous le champ une fois le choix fait : c'est au moment de
    choisir qu'ils décident.
  -->
  <FormField
    label="Division"
    id="division"
    hint={selectedDivision
      ? `Rencontre en ${selectedDivision.format.length} matchs. ${describeEligibility(selectedDivision.eligibility)}`
      : undefined}
  >
    <ChoiceField
      id="division"
      label="Division"
      value={division}
      onChange={(v) => (division = v)}
      options={divisions.map((d) => ({
        value: d.code,
        label: d.label,
        hint: `${d.format.length} matchs`
      }))}
    />
  </FormField>

  <FormField label="Numéro d'équipe" id="number">
    <Input id="number" type="number" min="1" max="20" bind:value={numberInput} />
    <p class="text-xs text-muted-foreground mt-1">
      1 = équipe 1. Ce numéro définit la hiérarchie : la valeur de l'équipe n doit rester
      inférieure ou égale à celle de l'équipe n−1. L'équipe s'appellera
      <strong>{teamName(teamPrefix, Number.isInteger(number) && number > 0 ? number : 1)}</strong>.
    </p>
  </FormField>

  <FormField label="Poule" id="pool">
    <Input id="pool" bind:value={poolLabel} placeholder="A, B… (facultatif)" />
  </FormField>

  <!--
    Un interrupteur, et non une case suivie d'un texte qui n'était le libellé d'aucun
    champ : la cible passe de 16 px à toute la rangée.
  -->
  <SwitchField
    id="active"
    label="Équipe engagée cette saison"
    hint="Une équipe retirée reste visible dans l'historique, mais ne se compose plus."
    checked={active}
    onChange={(v) => (active = v)}
  />
</FormSheet>
