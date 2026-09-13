<script lang="ts">
  import { can, type Permission } from '@nba/iam-ui';
  import { chargerIdentite, derniereIdentite } from '../lib/identite';

  /**
   * Les destinations de la configuration, filtrées sur les droits.
   *
   * Le hub les proposait toutes à tout le monde. Depuis que les rôles sont réellement
   * appliqués, la plupart mènent à un refus pour qui n'a pas le droit correspondant : on
   * ne montre que ce qui s'ouvre.
   *
   * Le filtrage est passé côté navigateur pour que la page puisse être figée. Il est
   * cosmétique — chaque destination se garde elle-même, et l'API par-dessus. Les droits
   * viennent de l'identité mutualisée : affichés d'abord depuis le dernier état connu,
   * corrigés dès que la route répond.
   */
  const DESTINATIONS: { href: string; title: string; description: string; permission: Permission }[] = [
    {
      href: '/admin/settings/club',
      title: 'Configuration du club',
      description: 'Identité, contacts, mentions légales, banque, images des documents et fonctionnalités utilisées.',
      permission: 'settings:club:read'
    },
    {
      href: '/admin/settings/attestation',
      title: 'Attestation CSE',
      description: "Signataire, mail, site web et signature du modèle d'attestation.",
      permission: 'members:attestations:read'
    },
    {
      href: '/admin/settings/seasons',
      title: 'Saisons Comptables',
      description: 'Exercices comptables, clôture, soldes initiaux et saison active.',
      permission: 'accounting:seasons:write'
    },
    {
      href: '/admin/settings/accounting',
      title: 'Catégories et Classes',
      description: 'Catégories comptables, plan comptable associatif (classes de comptes).',
      permission: 'accounting:config:read'
    },
    {
      href: '/admin/settings/products',
      title: 'Catégories Produits',
      description: 'Catégories de la boutique et leurs correspondances comptables.',
      permission: 'shop:products:read'
    },
    {
      href: '/admin/settings/gymnases',
      title: 'Gymnases',
      description: 'Les salles du club : nom, adresse et position, pour le site et les convocations.',
      permission: 'schedules:slots:write'
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

  const visibles = $derived(DESTINATIONS.filter((d) => can(droits, d.permission)));
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  {#each visibles as destination (destination.href)}
    <a
      href={destination.href}
      class="border-border bg-card hover:border-ring group relative flex flex-col gap-2 overflow-hidden rounded-xl border px-5 py-4 no-underline shadow-sm transition-all hover:shadow"
    >
      <div class="flex items-center justify-between">
        <p class="text-foreground text-sm font-semibold">{destination.title}</p>
        <span
          class="text-primary text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100"
        >
          Configurer &rarr;
        </span>
      </div>
      <p class="text-muted-foreground pr-8 text-xs">{destination.description}</p>
    </a>
  {/each}
</div>
