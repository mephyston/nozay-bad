<script lang="ts">
  import { Button, SearchableCombobox, Alert } from '@nba/ui';
  import { TriangleAlert, CircleCheck, Info } from '@lucide/svelte';
  import type { GetLineupOutput, LineupSlotView, LineupCandidate } from '../../get-lineup/dto';

  let { initial }: { initial: GetLineupOutput } = $props();

  /**
   * Île volontairement ignorante de la session : elle poste à la page qui l'héberge, et
   * c'est cette page qui impose la licence de l'adhérent connecté. La composition n'est
   * jamais engagée au nom de quelqu'un que le navigateur aurait désigné.
   */
  let view = $state<GetLineupOutput>(initial);
  let saving = $state(false);

  /**
   * Retour affiché **dans la page**, et non par une notification.
   *
   * L'espace adhérent ne monte aucun `Toaster` : un `toast.error()` y disparaît sans
   * laisser de trace, et le capitaine voyait son enregistrement échouer en silence —
   * y compris quand le serveur donnait un motif précis. Le message se lit ici, à côté
   * de ce qu'il concerne.
   */
  let feedback = $state<{ kind: 'success' | 'error'; message: string } | null>(null);

  /** Sélection en cours, indexée « SH2 ». */
  let picks = $state<Record<string, { l1: string; l2: string }>>(
    Object.fromEntries(
      initial.slots.map((s) => [
        `${s.discipline}${s.position}`,
        { l1: s.licence1 ?? '', l2: s.licence2 ?? '' }
      ])
    )
  );

  const byLicence = $derived(new Map(view.candidates.map((c) => [c.licence, c])));

  function label(c: LineupCandidate): string {
    const rank = [c.singles, c.doubles, c.mixed].map((r) => r ?? '—').join('/');
    return `${c.lastName} ${c.firstName} — ${rank}`;
  }

  /**
   * Les joueurs proposés sur une ligne : genre compatible, effectif d'abord, liste
   * plafonnée. Le club compte plus de deux cents adhérents, et tout rendre fige le
   * sélecteur à chaque frappe — au-delà d'une trentaine de noms on tape, on ne parcourt pas.
   */
  const MAX_SUGGESTIONS = 30;
  let queries = $state<Record<string, string>>({});

  function optionsFor(slot: LineupSlotView, position: 1 | 2) {
    const wanted =
      slot.discipline === 'MX'
        ? position === 1 ? 'H' : 'F'
        : slot.discipline === 'SH' || slot.discipline === 'DH'
          ? 'H'
          : 'F';

    const needle = (queries[`${slot.discipline}${slot.position}-${position}`] ?? '').trim().toLowerCase();
    const selected = position === 1
      ? picks[`${slot.discipline}${slot.position}`]?.l1
      : picks[`${slot.discipline}${slot.position}`]?.l2;

    const matching = view.candidates.filter((c) => {
      if (c.gender !== wanted) return false;
      if (!needle) return true;
      return (
        c.lastName.toLowerCase().includes(needle) ||
        c.firstName.toLowerCase().includes(needle) ||
        c.licence.includes(needle)
      );
    });

    const items = matching.slice(0, MAX_SUGGESTIONS).map((c) => ({
      label: c.inRoster ? label(c) : `${label(c)} (hors effectif)`,
      value: c.licence,
      // Le motif est porté par la donnée : déjà aligné cette semaine, ou hors division.
      disabled: Boolean(c.unavailableReason)
    }));

    // La sélection courante reste visible, sinon son libellé retomberait au placeholder.
    if (selected && !items.some((i) => i.value === selected)) {
      const chosen = byLicence.get(selected);
      items.unshift({
        label: chosen ? label(chosen) : `Licence ${selected}`,
        value: selected,
        disabled: false
      });
    }
    return items;
  }

  function lines() {
    return view.slots
      .map((s) => {
        const pick = picks[`${s.discipline}${s.position}`];
        if (!pick?.l1) return null;
        return {
          discipline: s.discipline,
          position: s.position,
          licence1: pick.l1,
          licence2: s.double ? pick.l2 || null : null
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      // Un double sans partenaire n'est pas une ligne : l'envoyer ferait échouer la
      // rencontre entière alors que le capitaine est simplement en cours de saisie.
      .filter((l) => !view.slots.find((s) => s.discipline === l.discipline && s.position === l.position)?.double || l.licence2);
  }

  async function submit(validate: boolean) {
    saving = true;
    feedback = null;
    try {
      const response = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-lineup', lines: lines(), validate })
      });
      const payload = (await response.json()) as { data?: GetLineupOutput; error?: string };
      if (!response.ok) throw new Error(payload.error || "L'enregistrement a échoué.");

      if (payload.data) view = payload.data;
      feedback = {
        kind: 'success',
        message: validate ? 'Composition validée.' : 'Composition enregistrée.'
      };
    } catch (error) {
      feedback = {
        kind: 'error',
        message: error instanceof Error ? error.message : "L'enregistrement a échoué."
      };
    } finally {
      saving = false;
    }
  }

  const filled = $derived(lines().length);
  const formatValue = (v: number | null) => (v === null ? '—' : v.toFixed(2).replace('.', ','));
</script>

<div class="space-y-4">
  {#each view.slots as slot (slot.discipline + slot.position)}
    {@const key = `${slot.discipline}${slot.position}`}
    <div class="rounded-lg border p-3 space-y-2">
      <div class="flex items-baseline justify-between gap-2">
        <span class="font-semibold text-sm">{slot.label}</span>
        <span class="text-xs text-muted-foreground">
          {slot.rankings} · {slot.points === null ? '—' : formatValue(slot.points)} pts
        </span>
      </div>

      <!--
        Les deux joueurs d'un double sont empilés, pas côte à côte : le libellé porte le
        nom **et** les trois classements, et deux colonnes le tronqueraient au point de ne
        plus distinguer deux homonymes. La carte qui les entoure suffit à dire que c'est
        une paire.
      -->
      <div class="space-y-2">
        <div class="min-w-0">
          <SearchableCombobox
            items={optionsFor(slot, 1)}
            filter={false}
            onSearch={(q) => (queries[`${key}-1`] = q)}
            bind:value={picks[key].l1}
            disabled={!view.canEdit || saving}
            placeholder="Choisir un joueur"
            searchPlaceholder="Nom, prénom ou licence…"
          />
        </div>
        {#if slot.double}
          <div class="min-w-0">
            <SearchableCombobox
              items={optionsFor(slot, 2)}
              filter={false}
              onSearch={(q) => (queries[`${key}-2`] = q)}
              bind:value={picks[key].l2}
              disabled={!view.canEdit || saving}
              placeholder="Choisir un partenaire"
              searchPlaceholder="Nom, prénom ou licence…"
            />
          </div>
        {/if}
      </div>
    </div>
  {/each}

  <!-- Le total et la contrainte, côte à côte : c'est la lecture qui décide. -->
  <div class="rounded-lg border p-4 space-y-2 bg-muted/30">
    <div class="flex items-baseline justify-between">
      <span class="text-sm text-muted-foreground">
        Total {view.total} · {filled} ligne(s) sur {view.slots.length}
      </span>
      <span class="text-lg font-semibold">
        Valeur d'équipe {formatValue(view.value)}
      </span>
    </div>

    {#if view.upperTeamValue !== null}
      <p class="text-sm">
        {view.upperTeamName} est à <strong>{formatValue(view.upperTeamValue)}</strong> sur cette
        journée : votre équipe doit rester <strong>inférieure ou égale</strong>.
      </p>
    {:else if view.upperTeamName}
      <p class="text-xs text-muted-foreground">
        {view.upperTeamName} n'a pas encore composé : la contrainte de valeur reste à vérifier.
      </p>
    {/if}
  </div>

  {#if view.errors.length > 0}
    <Alert.Root variant="destructive">
      <TriangleAlert class="w-4 h-4" />
      <Alert.Title>À corriger avant d'enregistrer</Alert.Title>
      <Alert.Description>
        <ul class="space-y-1 text-sm">
          {#each view.errors as issue (issue.code + (issue.slot ?? '') + (issue.licence ?? ''))}
            <li>{issue.message} <span class="text-xs opacity-70">(art. {issue.article})</span></li>
          {/each}
        </ul>
      </Alert.Description>
    </Alert.Root>
  {/if}

  {#each view.warnings as issue (issue.code + (issue.slot ?? '') + (issue.licence ?? ''))}
    <Alert.Root variant={issue.code === 'W1' ? 'warning' : 'info'}>
      {#if issue.code === 'W1'}<TriangleAlert class="w-4 h-4" />{:else}<Info class="w-4 h-4" />{/if}
      <Alert.Description>
        {issue.message} <span class="text-xs opacity-70">(art. {issue.article})</span>
      </Alert.Description>
    </Alert.Root>
  {/each}

  {#if view.errors.length === 0 && view.warnings.length === 0 && filled > 0}
    <Alert.Root variant="success">
      <CircleCheck class="w-4 h-4" />
      <Alert.Description>Composition conforme.</Alert.Description>
    </Alert.Root>
  {/if}

  {#if feedback}
    <Alert.Root variant={feedback.kind === 'success' ? 'success' : 'destructive'}>
      {#if feedback.kind === 'success'}
        <CircleCheck class="w-4 h-4" />
      {:else}
        <TriangleAlert class="w-4 h-4" />
      {/if}
      <Alert.Description>{feedback.message}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if view.canEdit}
    <div class="flex flex-wrap justify-end gap-2">
      <Button variant="outline" onclick={() => submit(false)} disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
      <Button onclick={() => submit(true)} disabled={saving || filled === 0}>
        Valider la composition
      </Button>
    </div>
  {:else}
    <p class="text-xs text-muted-foreground text-right">
      Seuls le capitaine et le vice-capitaine peuvent modifier cette composition.
    </p>
  {/if}
</div>
