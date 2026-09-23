<script lang="ts">
  import { ToggleLeft } from '@lucide/svelte';
  import { FormSheet, SwitchField, submitForm, readApiError } from '@nba/ui';
  import {
    FEATURES,
    FEATURE_CATALOG,
    FEATURE_GROUPS,
    FEATURE_PREREQUISITES,
    effectiveFeatures,
    type Feature,
    type FeatureState
  } from '../features';

  /**
   * Les interrupteurs des fonctionnalités, groupés comme le menu.
   *
   * Ce que l'écran montre est l'état **effectif** : une bascule active dont le préalable
   * est éteint apparaît grisée et inactive, avec la raison. Le club voit ainsi tout de
   * suite qu'éteindre les notifications éteint les rappels, sans attendre le cron.
   *
   * De vrais interrupteurs, et non des cases à cocher : la cible passe de 16 px à toute
   * la rangée, et une bascule dit « allumé / éteint » là où une case dit « coché », ce
   * qui n'est pas la même chose pour une fonctionnalité.
   */
  let {
    open = $bindable(false),
    onOpenChange,
    features,
    canWrite = false,
    endpoint = '/admin/api/club/settings',
    onSaved
  } = $props<{
    /** Le formulaire est un tiroir : sa validation vit en haut, à portée du pouce. */
    open?: boolean;
    /**
     * Prévenu de chaque fermeture, celles que la feuille décide comprises.
     *
     * Le hub garde la section ouverte dans l'adresse : sans cela, refermer d'un
     * glissement ou de la touche d'échappement laisserait `?section=` derrière, et le
     * tiroir se rouvrirait au prochain passage.
     */
    onOpenChange?: (ouvert: boolean) => void;
    features: FeatureState;
    canWrite?: boolean;
    endpoint?: string;
    /** Appelé après un enregistrement réussi, avant le rechargement : pour oublier ce que la page garde en mémoire. */
    onSaved?: () => void;
  }>();

  // Ce que le club a réglé, indépendamment des préalables : c'est ce qu'on enregistre.
  let choisi = $state<Record<Feature, boolean>>({ ...features });
  let busy = $state(false);
  let errorMsg = $state('');

  const effectif = $derived(effectiveFeatures(choisi));

  const parGroupe = $derived(
    FEATURE_GROUPS.map((group) => ({
      group,
      features: FEATURES.filter((f) => FEATURE_CATALOG[f].group === group)
    })).filter((g) => g.features.length > 0)
  );

  function preadableEteint(feature: Feature): Feature | null {
    for (const required of FEATURE_PREREQUISITES[feature] ?? []) {
      if (!effectif[required]) return required;
    }
    return null;
  }

  async function save(event: Event) {
    event.preventDefault();
    busy = true;
    errorMsg = '';
    await submitForm({
      validate: () => null,
      submit: async () => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_features', features: choisi })
        });
        if (!res.ok) throw new Error(await readApiError(res, "L'enregistrement a échoué."));
        onSaved?.();
      },
      close: () => (open = false),
      onError: (message) => {
        errorMsg = message;
      }
    });
    busy = false;
  }
</script>

<FormSheet
  bind:open
  {onOpenChange}
  title="Fonctionnalités"
  description="Ce que le club utilise. Une rubrique éteinte disparaît des menus et de l’espace adhérent."
  icon={ToggleLeft}
  size="lg"
  error={errorMsg}
  isSubmitting={busy}
  lectureSeule={!canWrite}
  cancelLabel="Fermer"
  onSubmit={save}
>
  <div class="space-y-6">
    {#each parGroupe as g (g.group)}
      <section class="space-y-1">
        <h3 class="text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase">
          {g.group}
        </h3>
        <div class="divide-border bg-card divide-y overflow-hidden rounded-xl">
          {#each g.features as feature (feature)}
            {@const info = FEATURE_CATALOG[feature]}
            {@const bloquePar = preadableEteint(feature)}
            <SwitchField
              id={`feature-${feature}`}
              label={info.label}
              hint={bloquePar
                ? `${info.description} Inactif tant que « ${FEATURE_CATALOG[bloquePar].label} » est éteint.`
                : info.description}
              checked={choisi[feature]}
              disabled={!canWrite || bloquePar !== null}
              onChange={(v) => (choisi[feature] = v)}
              class="px-3 py-3"
            />
          {/each}
        </div>
      </section>
    {/each}
  </div>
</FormSheet>
