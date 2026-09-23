<script lang="ts">
  import {
    Badge,
    FormField,
    FormSheet,
    Input,
    ListRow,
    ListView
  } from '@nba/ui';
  import { FileText } from '@lucide/svelte';
  import { saveChampionshipSetting } from './championship-settings-api';
  import {
    detailDeReglement,
    gestesDeReglement,
    pastilleDeReglement,
    type ReglementLike
  } from './championship-rules-row-model';
  import type { ChampionshipSettingsItem } from '../dto';

  /**
   * Les règlements de championnat.
   *
   * Une carte par championnat portait deux champs de saisie et un bouton côte à côte :
   * à 390 px, « Enregistrer » se retrouvait collé contre un champ de deux centimètres.
   * Et la question qu'on vient poser — lesquels manquent ? — ne se lisait qu'en
   * parcourant les cartes une à une.
   *
   * Une ligne par championnat, le manque en pastille, et la saisie dans un tiroir.
   */
  let {
    items,
    seasonCode,
    canWrite,
    onSaved,
    endpoint = '/admin/api/teams/reglements'
  }: {
    items: ChampionshipSettingsItem[];
    seasonCode: string;
    canWrite: boolean;
    /** Facultatif : une page Astro sérialise les props d'une île et ne peut pas passer de fonction. */
    onSaved?: () => void;
    /**
     * Destination des écritures : le relais de l'écran qui héberge ce panneau.
     *
     * Les deux panneaux de réglages écrivent dans la même table mais ne relèvent pas du
     * même écran, et les relais n'acceptent pas les mêmes clés.
     */
    endpoint?: string;
  } = $props();

  let busy = $state(false);
  let errorMsg = $state('');
  let editionOuverte = $state(false);
  let vise = $state<ReglementLike | null>(null);
  let url = $state('');
  let libelle = $state('');

  function ouvrirEdition(r: ReglementLike) {
    vise = r;
    url = r.rulesUrl ?? '';
    libelle = r.rulesLabel ?? '';
    errorMsg = '';
    editionOuverte = true;
  }

  function ouvrirLien(r: ReglementLike) {
    // Le lien enregistré est vérifiable d'un geste : une adresse fausse ne se voit pas.
    if (r.rulesUrl) window.open(r.rulesUrl, '_blank', 'noopener');
  }

  /**
   * Enregistre, puis rend la main à l'écran hôte.
   *
   * Et non `submitForm`, qui recharge la page en fin de course : ici c'est `onSaved`
   * qui décide du rechargement — lui seul sait ce qu'il faut relire, et les deux
   * mécanismes se marcheraient dessus.
   */
  async function enregistrer(event: Event) {
    event.preventDefault();
    const cible = vise;
    if (!cible) return;
    errorMsg = '';
    busy = true;
    try {
      await saveChampionshipSetting(endpoint, seasonCode, cible.championship, {
        rulesUrl: url.trim() || null,
        rulesLabel: libelle.trim() || null
      });
      editionOuverte = false;
      vise = null;
      onSaved?.();
    } catch (error) {
      // La feuille couvre la page : le refus s'affiche dans le formulaire lui-même.
      errorMsg = error instanceof Error ? error.message : "L'enregistrement a échoué.";
    } finally {
      busy = false;
    }
  }
</script>

<p class="text-muted-foreground mb-3 text-xs">
  Déposez le PDF dans la médiathèque, puis collez son lien ici. Il apparaîtra en
  téléchargement sur la fiche de chaque équipe du championnat, dans l'espace adhérent.
  C'est le texte qui fait foi le soir de la rencontre.
</p>

<ListView
  items={items as ReglementLike[]}
  emptyIcon={FileText}
  emptyTitle="Aucun championnat"
  emptyDescription="Aucun championnat n’est configuré pour cette saison."
>
  {#snippet listRow(reglement)}
    {@const pastille = pastilleDeReglement(reglement)}
    <ListRow
      item={reglement}
      onclick={canWrite ? () => ouvrirEdition(reglement) : undefined}
      title={reglement.label}
      subtitle={detailDeReglement(reglement)}
      actions={gestesDeReglement(reglement, { canWrite }, { onEdit: ouvrirEdition, onOpen: ouvrirLien })}
    >
      {#snippet badge()}
        {#if pastille}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>

<FormSheet
  bind:open={editionOuverte}
  title={vise ? vise.label : 'Règlement'}
  description="Le lien du PDF déposé dans la médiathèque. Laissez vide pour retirer le règlement."
  icon={FileText}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel="Enregistrer"
  submittingLabel="Enregistrement…"
  onSubmit={enregistrer}
>
  <FormField id="reglement-url" label="Lien du règlement">
    <Input
      id="reglement-url"
      bind:value={url}
      type="url"
      inputmode="url"
      autocapitalize="off"
      spellcheck="false"
      placeholder="https://…/reglement-2026.pdf"
    />
  </FormField>

  <FormField
    id="reglement-libelle"
    label="Libellé affiché"
    hint="Facultatif : à défaut, l’espace adhérent écrit « Règlement »."
  >
    <Input id="reglement-libelle" bind:value={libelle} placeholder="Règlement 2026-2027" />
  </FormField>
</FormSheet>
