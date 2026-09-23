<script lang="ts">
  import { ChoiceField, Combobox, FormField, Input, type ComboboxItem } from '@nba/ui';

  /**
   * Où mène un bouton : une page du site, ou une adresse extérieure.
   *
   * Le motif était écrit deux fois mot pour mot — dans la grille de liens et dans le
   * carrousel — avec sa liste native, son état de mode et ses trois champs sans
   * libellé. Le bloc d'accroche, lui, ne l'avait pas du tout : on y saisissait
   * l'adresse à la main dans un champ dont seul le placeholder disait quoi mettre.
   */
  let {
    id,
    href = $bindable(''),
    targets = [],
    label = 'Cible du bouton'
  }: {
    id: string;
    href?: string;
    targets?: { path: string; title: string; kind?: string; status?: string }[];
    label?: string;
  } = $props();

  const estExterne = (v: string) => /^https?:\/\//i.test(v);

  /*
    Le mode suit l'adresse tant qu'on n'en a pas choisi un : pas de copie prise au
    montage, donc pas d'état qui se désynchronise — et Svelte n'a rien à redire.
  */
  let modeChoisi = $state<'internal' | 'external' | null>(null);
  const mode = $derived(modeChoisi ?? (estExterne(href) ? 'external' : 'internal'));

  const cibles: ComboboxItem[] = $derived(
    targets.map((t) => ({
      value: t.path,
      label: t.title,
      description: t.status === 'draft' ? `${t.path} — brouillon` : t.path
    }))
  );

  function changerDeMode(v: string) {
    modeChoisi = v as 'internal' | 'external';
    /* Changer de nature vide l'adresse : une URL extérieure n'est pas un chemin
       interne, et garder l'ancienne produirait un lien silencieusement faux. */
    href = '';
  }
</script>

<FormField {id} label={label}>
  <ChoiceField
    {id}
    {label}
    value={mode}
    onChange={changerDeMode}
    options={[
      { value: 'internal', label: 'Une page du site' },
      { value: 'external', label: 'Une adresse extérieure' }
    ]}
  />
</FormField>

{#if mode === 'external'}
  <FormField id={`${id}-url`} label="Adresse">
    <Input id={`${id}-url`} bind:value={href} placeholder="https://exemple.fr/…" />
  </FormField>
{:else if cibles.length > 0}
  <FormField id={`${id}-page`} label="Page">
    <Combobox
      id={`${id}-page`}
      items={cibles}
      bind:value={href}
      placeholder="Rechercher une page…"
      clearLabel="Aucune cible"
    />
  </FormField>
{:else}
  <FormField id={`${id}-path`} label="Adresse interne">
    <Input id={`${id}-path`} bind:value={href} placeholder="/notre-club/" />
  </FormField>
{/if}
