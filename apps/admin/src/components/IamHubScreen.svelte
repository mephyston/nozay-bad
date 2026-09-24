<script lang="ts">
  import { ListRow, ListView, PageHeader, ErrorAlert, softNavigate } from '@nba/ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * L'accueil des accès : deux rubriques, et rien d'autre.
   *
   * La page empilait la liste des comptes **et** la matrice des droits — soixante-quatre
   * droits par sept rôles — sur un même écran. Deux sujets qu'on ne traite jamais en
   * même temps : on vient donner un accès à quelqu'un, ou revoir ce qu'un rôle permet.
   * Chacun a désormais sa page, et celle-ci dit laquelle ouvrir.
   */
  let errorMsg = $state<string | null>(null);
  let nbUtilisateurs = $state<number | null>(null);
  let nbRoles = $state<number | null>(null);

  const compte = (n: number | null, singulier: string, pluriel = `${singulier}s`) =>
    n === null ? '' : `${n} ${n > 1 ? pluriel : singulier}`;

  const rubriques = $derived([
    {
      href: '/admin/iam/utilisateurs',
      titre: 'Utilisateurs',
      description: "Qui administre le club, et avec quels rôles. C'est ici qu'on ouvre ou ferme un accès.",
      valeur: compte(nbUtilisateurs, 'accès', 'accès')
    },
    {
      href: '/admin/iam/roles',
      titre: 'Rôles',
      description: 'Ce que chaque rôle permet. Un compte peut en cumuler plusieurs ; ses droits sont la réunion des leurs.',
      valeur: compte(nbRoles, 'rôle')
    }
  ]);
</script>

<PageHeader
  title="Accès et rôles"
  description="Attribuez un rôle aux personnes qui administrent le club."
/>

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="mt-6">
  <!--
    Les comptes sont lus ici pour n'afficher que des nombres : deux rangées qui disent
    « 6 accès » et « 7 rôles » valent mieux que deux rangées muettes, et la lecture est
    la même que celle des pages qu'elles ouvrent.
  -->
  <EcranDistant
    domaine="iam"
    ecran="acces"
    variante="liste"
    onDonnees={(d) => {
      errorMsg = d.errorMsg ?? null;
      nbUtilisateurs = d.users?.length ?? null;
      nbRoles = d.roles?.length ?? null;
    }}
  >
    {#snippet pret()}
      <ListView items={rubriques}>
        {#snippet listRow(rubrique)}
          <ListRow
            item={rubrique}
            onclick={() => softNavigate(rubrique.href)}
            title={rubrique.titre}
            subtitle={rubrique.description}
            value={rubrique.valeur}
          />
        {/snippet}
      </ListView>
    {/snippet}
  </EcranDistant>
</div>
