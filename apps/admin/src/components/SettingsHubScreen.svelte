<script lang="ts">
  import { ListRow, ListView, softNavigate } from '@nba/ui';
  import { can, type Permission } from '@nba/iam-ui';
  import { SECTION_SPECS } from '@nba/club-ui';
  import { chargerIdentite, derniereIdentite } from '../lib/identite';
  import ClubSettingsScreen from './ClubSettingsScreen.svelte';

  /**
   * Les destinations de la configuration, en trois rubriques et filtrées sur les droits.
   *
   * Un seul niveau : le hub menait à un sous-hub « Configuration du club » qui reprenait
   * les gymnases déjà proposés ici, et l'on ne savait plus où chercher. Chaque réglage
   * figure une fois, dans la rubrique de ce qu'il touche — le club, la comptabilité, la
   * boutique — et les sections de l'identité du club viennent du même catalogue que les
   * pages qui les servent (`SECTION_SPECS`).
   *
   * Le filtrage est passé côté navigateur pour que la page puisse être figée. Il est
   * cosmétique — chaque destination se garde elle-même, et l'API par-dessus. Les droits
   * viennent de l'identité mutualisée : affichés d'abord depuis le dernier état connu,
   * corrigés dès que la route répond.
   */
  interface Destination {
    href: string;
    title: string;
    description: string;
    permission: Permission;
    /**
     * La section du club à ouvrir **en tiroir**, plutôt qu'une page à atteindre.
     *
     * Les réglages du club sont des formulaires : ils montent du même endroit que tous
     * les autres, avec croix et validation en haut. Les destinations qui portent une
     * liste — gymnases, saisons, comptes — restent des pages : un tiroir qui contient
     * sa propre liste et ses propres formulaires empilerait deux niveaux de feuilles.
     */
    section?: string;
  }

  const RUBRIQUES: { label: string; description: string; items: Destination[] }[] = [
    {
      label: 'Club',
      description: "Ce qui décrit le club et ce qu'il utilise : sur les applications, les mails et les PDF.",
      items: [
        {
          href: '/admin/settings?section=fonctionnalites',
          section: 'fonctionnalites',
          title: 'Fonctionnalités',
          description: 'Ce que le club utilise : boutique, interclubs, jeu libre, rappels… Une rubrique éteinte disparaît des menus.',
          permission: 'settings:club:read'
        },
        ...SECTION_SPECS.map((s) => ({
          href: `/admin/settings?section=${s.section}`,
          section: s.section,
          title: s.title,
          description: s.description,
          permission: 'settings:club:read' as Permission
        })),
        {
          href: '/admin/settings?section=documents',
          section: 'documents',
          title: 'Images des documents',
          description: 'Logo, papier à lettre, tampon et logos partenaires imprimés sur les PDF.',
          permission: 'settings:club:read'
        },
        {
          href: '/admin/settings/gymnases',
          title: 'Gymnases',
          description: 'Les salles du club : nom, adresse et position, pour le site et les convocations.',
          permission: 'schedules:slots:write'
        },
        {
          href: '/admin/settings/attestation',
          title: 'Attestation CSE',
          description: "Signataire, mail, site web et signature du modèle d'attestation.",
          permission: 'members:attestations:read'
        }
      ]
    },
    {
      label: 'Comptabilité',
      description: 'Les exercices, les comptes et le plan comptable.',
      items: [
        {
          href: '/admin/settings/seasons',
          title: 'Saisons comptables',
          description: 'Exercices comptables, clôture, soldes initiaux et saison active.',
          permission: 'accounting:seasons:write'
        },
        {
          href: '/admin/settings/tresorerie',
          title: 'Comptes et moyens de paiement',
          description: 'Comptes bancaires, caisses et porte-monnaie ; ce que le club accepte comme règlement, et où.',
          permission: 'accounting:config:read'
        },
        {
          href: '/admin/settings/accounting',
          title: 'Catégories et classes',
          description: 'Catégories comptables, plan comptable associatif (classes de comptes).',
          permission: 'accounting:config:read'
        }
      ]
    },
    {
      label: 'Boutique',
      description: 'Ce que la boutique vend et comment elle le comptabilise.',
      items: [
        {
          href: '/admin/settings/products',
          title: 'Catégories produits',
          description: 'Catégories de la boutique et leurs correspondances comptables.',
          permission: 'shop:products:read'
        }
      ]
    }
  ];

  /*
    La consommation de la plateforme n'est plus une carte de ce hub : c'est le compte
    Cloudflare qu'elle mesure, pas le club. Elle reste joignable à son adresse par
    qui porte `settings:platform:read` — en pratique la plateforme elle-même.
  */

  let droits = $state<string[]>(derniereIdentite()?.permissions ?? []);
  $effect(() => {
    void chargerIdentite().then((identite) => (droits = identite.permissions));
  });

  const visibles = $derived(
    RUBRIQUES.map((r) => ({ ...r, items: r.items.filter((d) => can(droits, d.permission)) })).filter((r) => r.items.length > 0)
  );

  /**
   * La section ouverte, et son adresse.
   *
   * `?section=` reste dans l'URL tant que le tiroir est ouvert : c'est ce qui garde les
   * liens directs vivants — les anciennes adresses `/admin/settings/club/<section>` y
   * redirigent — et ce qui fait que le bouton Précédent referme le tiroir au lieu de
   * quitter la configuration.
   */
  let sectionOuverte = $state<string | null>(null);

  $effect(() => {
    if (typeof window === 'undefined') return;
    const lire = () => {
      sectionOuverte = new URLSearchParams(window.location.search).get('section');
    };
    lire();
    window.addEventListener('popstate', lire);
    return () => window.removeEventListener('popstate', lire);
  });

  function ouvrir(destination: Destination) {
    if (!destination.section) {
      softNavigate(destination.href);
      return;
    }
    sectionOuverte = destination.section;
    const url = new URL(window.location.href);
    url.searchParams.set('section', destination.section);
    history.pushState(null, '', url);
  }

  function fermer() {
    sectionOuverte = null;
    const url = new URL(window.location.href);
    url.searchParams.delete('section');
    history.replaceState(null, '', url);
  }
</script>

<!--
  Des rangées, et non une grille de cartes.

  La grille tenait sur trois colonnes au bureau et s'empilait en cartes de cent pixels
  de haut au doigt : douze réglages faisaient défiler l'écran deux fois. Une liste dit
  la même chose en un tiers de la hauteur, et c'est la forme qu'ont les réglages
  partout ailleurs.
-->
<div class="space-y-8">
  {#each visibles as rubrique (rubrique.label)}
    <section class="space-y-2">
      <div class="px-1">
        <h2 class="text-foreground text-base font-semibold">{rubrique.label}</h2>
        <p class="text-muted-foreground text-xs">{rubrique.description}</p>
      </div>
      <ListView items={rubrique.items}>
        {#snippet listRow(destination)}
          <ListRow
            item={destination}
            onclick={() => ouvrir(destination)}
            title={destination.title}
            subtitle={destination.description}
          />
        {/snippet}
      </ListView>
    </section>
  {/each}
</div>

<!--
  `{#if}` autour, et non seulement `open` : l'écran distant charge les réglages du club
  à l'ouverture, et garder le tiroir monté retiendrait la section précédente.
-->
{#if sectionOuverte}
  <ClubSettingsScreen section={sectionOuverte} open onClose={fermer} />
{/if}
