<script lang="ts">
  import { SiteSettingsForm } from '@nba/cms-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant ecran="footer" variante="formulaire">
  {#snippet pret(d)}
    <!--
      Les quatre valeurs sont étalées, pas passées en bloc : le formulaire déclare
      `footerDescription`, `footerAddress`, `instagramUrl` et `facebookUrl` à plat, et
      une prop `settings` qu'il ne connaît pas était simplement ignorée. Les quatre
      champs s'affichaient donc vides quoi qu'il y ait en base — et comme
      l'enregistrement les envoie tels quels, ouvrir cette page et cliquer
      « Enregistrer » effaçait la présentation, l'adresse et les réseaux du site public.
    -->
    <SiteSettingsForm {...d.settings} canWrite={d.canWrite} />
  {/snippet}
</EcranDistant>
