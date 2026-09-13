<script lang="ts">
  import { Save, Loader2 } from '@lucide/svelte';
  import { Button, Checkbox, Card, ErrorAlert, submitForm, readApiError } from '@nba/ui';
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
   * Ce que l'écran montre est l'état **effectif** : une case cochée dont le préalable
   * est décoché apparaît grisée et inactive, avec la raison. Le club voit ainsi tout de
   * suite qu'éteindre les notifications éteint les rappels, sans attendre le cron.
   */
  let {
    features,
    canWrite = false,
    endpoint = '/admin/api/club/settings',
    onSaved
  } = $props<{
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

  async function save(event: SubmitEvent) {
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
      success: 'Fonctionnalités enregistrées.',
      onError: (message) => {
        errorMsg = message;
      }
    });
    busy = false;
  }
</script>

<form onsubmit={save}>
  {#if errorMsg}
    <div class="mb-4"><ErrorAlert message={errorMsg} /></div>
  {/if}

  <div class="space-y-6">
    {#each parGroupe as g (g.group)}
      <Card.Root>
        <Card.Header>
          <Card.Title>{g.group}</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          {#each g.features as feature (feature)}
            {@const info = FEATURE_CATALOG[feature]}
            {@const bloquePar = preadableEteint(feature)}
            <label class="flex items-start gap-3 cursor-pointer" class:opacity-60={bloquePar !== null}>
              <Checkbox
                checked={choisi[feature]}
                onCheckedChange={(v) => (choisi[feature] = v === true)}
                disabled={!canWrite || bloquePar !== null}
                aria-label={info.label}
              />
              <span class="space-y-0.5">
                <span class="block text-sm font-medium leading-none">{info.label}</span>
                <span class="block text-xs text-muted-foreground">{info.description}</span>
                {#if bloquePar}
                  <span class="block text-xs text-warning">Inactif tant que « {FEATURE_CATALOG[bloquePar].label} » est éteint.</span>
                {/if}
              </span>
            </label>
          {/each}
        </Card.Content>
      </Card.Root>
    {/each}
  </div>

  {#if canWrite}
    <div class="mt-6 flex justify-end">
      <Button type="submit" disabled={busy} class="gap-1.5 font-bold">
        {#if busy}
          <Loader2 class="h-4 w-4 animate-spin" />
          <span>Enregistrement…</span>
        {:else}
          <Save class="h-4 w-4" />
          <span>Enregistrer</span>
        {/if}
      </Button>
    </div>
  {/if}
</form>
