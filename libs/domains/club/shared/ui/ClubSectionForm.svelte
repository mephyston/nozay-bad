<script lang="ts">
  import { Save, Loader2 } from '@lucide/svelte';
  import { Button, Input, Textarea, Select, Card, FormField, ErrorAlert, submitForm, readApiError } from '@nba/ui';
  import type { SectionSpec } from '../ui-sections';

  /**
   * Un écran de configuration du club, piloté par sa spécification (`ui-sections.ts`).
   *
   * Formulaire posé à plat, sans `FormSheet` : ce ne sont pas des éléments d'une liste
   * mais des valeurs uniques que l'on relit et corrige, et le tiroir imposerait un
   * clic pour voir ce qui est en place. Même parti que le pied de page du site.
   *
   * Le formulaire n'envoie que les champs de sa section : c'est aussi ce que l'API
   * accepte, section par section.
   */
  let {
    spec,
    values,
    canWrite = false,
    endpoint = '/admin/api/club/settings'
  } = $props<{
    spec: SectionSpec;
    values: Record<string, unknown>;
    canWrite?: boolean;
    /** Le relais de la rubrique, jamais la page hôte. */
    endpoint?: string;
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

  async function save(event: SubmitEvent) {
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
      },
      success: `${spec.title} : enregistré.`,
      onError: (message) => {
        errorMsg = message;
      }
    });

    busy = false;
  }
</script>

<form onsubmit={save}>
  <Card.Root>
    <Card.Header>
      <Card.Title>{spec.title}</Card.Title>
      <Card.Description>{spec.description} <span class="block mt-1 text-xs">Utilisé pour : {spec.usedIn}</span></Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      {#if errorMsg}
        <ErrorAlert message={errorMsg} />
      {/if}

      <div class="grid gap-4 sm:grid-cols-2">
        {#each spec.fields as f (f.key)}
          <div class={f.wide ? 'sm:col-span-2' : ''}>
            <FormField id={`club-${f.key}`} label={f.label}>
              {#if f.kind === 'textarea'}
                <Textarea id={`club-${f.key}`} bind:value={form[f.key]} maxlength={f.maxlength} rows={3} disabled={!canWrite} placeholder={f.placeholder} />
              {:else if f.kind === 'select'}
                <Select id={`club-${f.key}`} bind:value={form[f.key]} disabled={!canWrite}>
                  {#each f.options ?? [] as o (o.value)}
                    <option value={o.value}>{o.label}</option>
                  {/each}
                </Select>
              {:else if f.kind === 'color'}
                <div class="flex items-center gap-3">
                  <input
                    id={`club-${f.key}`}
                    type="color"
                    bind:value={form[f.key]}
                    disabled={!canWrite}
                    class="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
                  />
                  <Input value={String(form[f.key]).toUpperCase()} readonly class="w-32 font-mono" aria-label="Code hexadécimal" />
                </div>
              {:else if f.kind === 'number'}
                <Input id={`club-${f.key}`} type="number" bind:value={form[f.key]} min={f.min} max={f.max} step={1} disabled={!canWrite} />
              {:else}
                <Input
                  id={`club-${f.key}`}
                  type={f.kind === 'email' ? 'email' : 'text'}
                  bind:value={form[f.key]}
                  maxlength={f.maxlength}
                  disabled={!canWrite}
                  placeholder={f.placeholder}
                />
              {/if}
              {#if f.help}
                <p class="text-xs text-muted-foreground">{f.help}</p>
              {/if}
            </FormField>
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

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
