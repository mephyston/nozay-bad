<script lang="ts">
  import { can, type Permission } from '@nba/iam-ui';
  import { SECTION_SPECS } from '@nba/club-ui';
  import { chargerIdentite, derniereIdentite } from '../lib/identite';

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
  }

  const RUBRIQUES: { label: string; description: string; items: Destination[] }[] = [
    {
      label: 'Club',
      description: "Ce qui décrit le club et ce qu'il utilise : sur les applications, les mails et les PDF.",
      items: [
        {
          href: '/admin/settings/club/fonctionnalites',
          title: 'Fonctionnalités',
          description: 'Ce que le club utilise : boutique, interclubs, jeu libre, rappels… Une rubrique éteinte disparaît des menus.',
          permission: 'settings:club:read'
        },
        ...SECTION_SPECS.map((s) => ({
          href: `/admin/settings/club/${s.section}`,
          title: s.title,
          description: s.description,
          permission: 'settings:club:read' as Permission
        })),
        {
          href: '/admin/settings/club/documents',
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
</script>

<div class="space-y-8">
  {#each visibles as rubrique (rubrique.label)}
    <section class="space-y-3">
      <div>
        <h2 class="text-base font-semibold text-foreground">{rubrique.label}</h2>
        <p class="text-muted-foreground text-xs">{rubrique.description}</p>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each rubrique.items as destination (destination.href)}
          <a
            href={destination.href}
            class="border-border bg-card hover:border-ring group relative flex flex-col gap-2 overflow-hidden rounded-xl border px-5 py-4 no-underline shadow-sm transition-all hover:shadow"
          >
            <div class="flex items-center justify-between">
              <p class="text-foreground text-sm font-semibold">{destination.title}</p>
              <span class="text-primary text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                Configurer &rarr;
              </span>
            </div>
            <p class="text-muted-foreground pr-8 text-xs">{destination.description}</p>
          </a>
        {/each}
      </div>
    </section>
  {/each}
</div>
