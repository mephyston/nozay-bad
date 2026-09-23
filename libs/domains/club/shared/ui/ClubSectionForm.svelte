<script lang="ts">
  import { Settings2 } from '@lucide/svelte';
  import { ChoiceField, FormSheet, Input, Textarea, FormField, submitForm, readApiError } from '@nba/ui';
  import type { SectionSpec } from '../ui-sections';

  /**
   * Un écran de configuration du club, piloté par sa spécification (`ui-sections.ts`).
   *
   * Un tiroir, comme tous les formulaires : croix et validation en haut, à portée du
   * pouce. Il était posé à plat, au motif qu'on relit ces valeurs plus souvent qu'on
   * ne les change — mais le hub les montre désormais en liste, chaque rangée disant ce
   * qu'elle contient, si bien que le tiroir ne cache plus rien.
   *
   * Le formulaire n'envoie que les champs de sa section : c'est aussi ce que l'API
   * accepte, section par section.
   */
  let {
    open = $bindable(false),
    onOpenChange,
    spec,
    values,
    canWrite = false,
    endpoint = '/admin/api/club/settings',
    onSaved
  } = $props<{
    open?: boolean;
    /**
     * Prévenu de chaque fermeture, celles que la feuille décide comprises.
     *
     * Le hub garde la section ouverte dans l'adresse : sans cela, refermer d'un
     * glissement ou de la touche d'échappement laisserait `?section=` derrière, et le
     * tiroir se rouvrirait au prochain passage.
     */
    onOpenChange?: (ouvert: boolean) => void;
    spec: SectionSpec;
    values: Record<string, unknown>;
    canWrite?: boolean;
    /** Le relais de la rubrique, jamais la page hôte. */
    endpoint?: string;
    /** Appelé après un enregistrement réussi, avant le rechargement : pour oublier ce que la page garde en mémoire. */
    onSaved?: () => void;
  }>();

  let form = $state<Record<string, string | number>>(
    Object.fromEntries(spec.fields.map((f) => [f.key, (values[f.key] as string | number) ?? (f.kind === 'number' ? 0 : '')]))
  );
  let busy = $state(false);
  let errorMsg = $state('');

  function validate(): string | null {
    for (const f of spec.fields) {
      const v = form[f.key];
      if (f.required && String(v).trim() === '') return `« ${f.label} » est obligatoire.`;
      if (f.kind === 'email' && String(v).trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())) {
        return `« ${f.label} » n'est pas une adresse valide.`;
      }
      if (f.kind === 'url' && String(v).trim() !== '' && !/^https:\/\//i.test(String(v).trim())) {
        return `« ${f.label} » doit commencer par https://.`;
      }
      if (f.kind === 'number') {
        const n = Number(v);
        if (!Number.isInteger(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
          return `« ${f.label} » doit être un entier${f.min !== undefined ? ` entre ${f.min} et ${f.max}` : ''}.`;
        }
      }
    }
    return null;
  }

  async function save(event: Event) {
    event.preventDefault();
    busy = true;
    errorMsg = '';

    const body: Record<string, unknown> = { action: `update_${spec.section}` };
    for (const f of spec.fields) body[f.key] = f.kind === 'number' ? Number(form[f.key]) : form[f.key];

    await submitForm({
      validate,
      submit: async () => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
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
  title={spec.title}
  description={`${spec.description} Utilisé pour : ${spec.usedIn}`}
  icon={Settings2}
  size="lg"
  error={errorMsg}
  isSubmitting={busy}
  lectureSeule={!canWrite}
  cancelLabel="Fermer"
  onSubmit={save}
>
  <div class="grid gap-4 sm:grid-cols-2">
    {#each spec.fields as f (f.key)}
      <div class={f.wide ? 'sm:col-span-2' : ''}>
        <FormField id={`club-${f.key}`} label={f.label} hint={f.help}>
          {#if f.kind === 'textarea'}
            <Textarea id={`club-${f.key}`} bind:value={form[f.key]} maxlength={f.maxlength} rows={3} disabled={!canWrite} placeholder={f.placeholder} />
          {:else if f.kind === 'select'}
            <!--
              Une liste déroulante native ouvre la roulette du système : au doigt, on y
              vise une valeur dans une bande de trente pixels. La rangée mène à un écran
              de choix où chaque entrée a sa ligne de 44 points.
            -->
            <ChoiceField
              id={`club-${f.key}`}
              label={f.label}
              value={String(form[f.key] ?? '')}
              disabled={!canWrite}
              onChange={(v) => (form[f.key] = v)}
              options={(f.options ?? []).map((o) => ({ value: String(o.value), label: o.label }))}
            />
          {:else if f.kind === 'color'}
            <!--
              Le sélecteur natif est gardé : c'est le seul qui ouvre la palette du
              système, et aucun composant ne remplace utilement une roue de couleurs.
              Il gagne la hauteur d'une cible au doigt, et le code hexadécimal à côté
              reste la seule façon de vérifier une valeur exacte.
            -->
            <div class="flex items-center gap-3">
              <input
                id={`club-${f.key}`}
                type="color"
                bind:value={form[f.key]}
                disabled={!canWrite}
                class="border-input h-11 w-16 shrink-0 cursor-pointer rounded-lg border bg-transparent p-1"
              />
              <Input value={String(form[f.key]).toUpperCase()} readonly class="font-mono" aria-label="Code hexadécimal" />
            </div>
          {:else if f.kind === 'number'}
            <Input id={`club-${f.key}`} type="number" inputmode="numeric" bind:value={form[f.key]} min={f.min} max={f.max} step={1} disabled={!canWrite} />
          {:else}
            <Input
              id={`club-${f.key}`}
              type={f.kind === 'email' ? 'email' : 'text'}
              inputmode={f.kind === 'email' ? 'email' : f.kind === 'url' ? 'url' : undefined}
              autocapitalize={f.kind === 'email' || f.kind === 'url' ? 'off' : undefined}
              bind:value={form[f.key]}
              maxlength={f.maxlength}
              disabled={!canWrite}
              placeholder={f.placeholder}
            />
          {/if}
        </FormField>
      </div>
    {/each}
  </div>
</FormSheet>
