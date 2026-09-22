<script lang="ts">
  import { ExternalLink, Send } from '@lucide/svelte';
  import {
    Button,
    ChoiceField,
    FormField,
    FormSheet,
    Input,
    MultiChoiceField,
    Textarea
  } from '@nba/ui';
  import { STOREFRONT_PAGES } from '../../shared/storefront-pages';
  import type { StatsLike } from './notifications-row-model';

  /**
   * L'envoi d'une notification, en feuille.
   *
   * Il occupait tout le premier écran sous forme de carte : on arrivait sur une page
   * d'information par un formulaire, et il fallait le dépasser pour voir quoi que ce
   * soit. C'est une action, elle vit dans le menu — et la barre du bas sur téléphone.
   *
   * Le rond de la barre haute porte l'avion en papier et non la coche : l'acte n'est
   * pas d'enregistrer. Il reste précédé de sa confirmation, qui nomme l'audience —
   * un envoi atteint les téléphones du club et ne se rappelle pas.
   */
  let {
    open = $bindable(false),
    stats,
    groupes = [],
    envoiEnCours = false,
    onSubmit,
    onOpenChange,
    title = $bindable(''),
    body = $bindable(''),
    page = $bindable(''),
    cible = $bindable<'all' | 'unpaid' | 'groups'>('all'),
    groupesRetenus = $bindable<string[]>([])
  }: {
    open?: boolean;
    stats: StatsLike;
    groupes?: { type: string; members: number }[];
    envoiEnCours?: boolean;
    onSubmit: (event: Event) => void;
    onOpenChange?: (ouvert: boolean) => void;
    title?: string;
    body?: string;
    page?: string;
    cible?: 'all' | 'unpaid' | 'groups';
    groupesRetenus?: string[];
  } = $props();

  const STOREFRONT_URL = import.meta.env.PUBLIC_STOREFRONT_URL || '';

  /** Ouvre la page dans un onglet : c'est le seul test honnête d'une destination. */
  function testerLaPage() {
    if (!page) return;
    window.open(`${STOREFRONT_URL}${page}`, '_blank', 'noopener,noreferrer');
  }
</script>

<FormSheet
  bind:open
  {onOpenChange}
  title="Nouvelle notification"
  description="Diffusée comme « communication du bureau » aux adhérents ayant activé les notifications. Ceux qui ont coupé cette catégorie dans leurs réglages ne la recevront pas."
  icon={Send}
  isSubmitting={envoiEnCours}
  submitLabel="Envoyer"
  submittingLabel="Envoi…"
  {onSubmit}
>
  {#snippet submitIcon()}
    <Send class="size-5" />
  {/snippet}

  <FormField id="notif-title" label="Titre">
    <Input id="notif-title" bind:value={title} maxlength={80} placeholder="Tournoi interne samedi" />
  </FormField>

  <FormField id="notif-body" label="Message">
    <Textarea
      id="notif-body"
      bind:value={body}
      maxlength={300}
      rows={3}
      placeholder="Inscriptions ouvertes jusqu'à vendredi soir."
    />
  </FormField>

  <FormField id="notif-target" label="Destinataires">
    <ChoiceField
      id="notif-target"
      label="Destinataires"
      value={cible}
      onChange={(v) => (cible = v as 'all' | 'unpaid' | 'groups')}
      options={[
        { value: 'all', label: `Tous les abonnés (${stats.devices})` },
        { value: 'unpaid', label: 'Cotisation non soldée' },
        { value: 'groups', label: 'Groupes d’adhérents…' }
      ]}
    />
  </FormField>

  {#if cible === 'groups'}
    <!--
      Les groupes ne paraissent qu'une fois la cible choisie : c'est le seul champ de
      ce formulaire qui dépende d'un autre, et l'afficher toujours laisserait croire
      qu'il faut le remplir.
    -->
    <FormField
      id="notif-groups"
      label="Groupes"
      hint={groupes.length === 0
        ? 'Aucun groupe dans la saison active. Importez les adhérents depuis Poona.'
        : undefined}
    >
      <MultiChoiceField
        id="notif-groups"
        label="Groupes"
        title="Groupes d’adhérents"
        description="L’envoi ne touchera que les adhérents de ces groupes."
        placeholder="Aucun"
        bind:values={groupesRetenus}
        options={groupes.map((g) => ({
          value: g.type,
          label: g.type,
          hint: `${g.members} adhérent(s)`
        }))}
      />
    </FormField>
  {/if}

  <FormField
    id="notif-page"
    label="Page à ouvrir"
    hint="Facultatif. Sans destination, l’appui sur la notification ouvre l’accueil."
  >
    <div class="flex items-center gap-2">
      <div class="min-w-0 flex-1">
        <ChoiceField
          id="notif-page"
          label="Page à ouvrir"
          bind:value={page}
          placeholder="Aucune"
          options={STOREFRONT_PAGES.map((p) => ({ value: p.path, label: p.label }))}
        />
      </div>
      <Button variant="outline" size="sm" class="shrink-0" disabled={!page} onclick={testerLaPage}>
        <ExternalLink class="mr-1 size-3.5" /> Tester
      </Button>
    </div>
  </FormField>
</FormSheet>
