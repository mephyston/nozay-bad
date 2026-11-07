<script lang="ts">
  import { onMount } from 'svelte';
  import { PageHeader } from '@nba/ui';
  import { PaperCardsPrinter } from '@nba/buvette-ui';
  import { chargerIdentite } from '../lib/identite';

  const buvetteUrl = import.meta.env.PUBLIC_BUVETTE_URL as string;

  // Le logo déposé par le club, sinon l'image embarquée : comme le menu.
  let logoUrl = $state('/logo.png');
  onMount(async () => {
    logoUrl = (await chargerIdentite()).club?.logoUrl || '/logo.png';
  });
</script>

<div class="print:hidden">
  <PageHeader
    title="Cartes papier"
    description="Imprimez des cartes de 5 ou 10 € pour les enfants et les personnes sans téléphone."
  />
</div>

<div class="mt-6">
  <PaperCardsPrinter {buvetteUrl} {logoUrl} />
</div>
