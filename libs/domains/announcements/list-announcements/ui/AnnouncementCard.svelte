<script lang="ts">
  import { Megaphone } from '@lucide/svelte';
  import type { Announcement } from './announcements-manager-types';

  let {
    announcement,
    class: className = ''
  }: {
    announcement: Announcement;
    class?: string;
  } = $props();

  const dateLabel = $derived(
    new Date(announcement.publishedAt ?? announcement.createdAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  );
</script>

<!--
  Rendu du texte riche de l'annonce.

  `{@html}` est ici volontaire et sûr : le contenu a été réduit par l'API à une liste
  blanche de balises (`sanitizeRichText`) avant d'être écrit en base. C'est le seul
  endroit de l'application où du HTML rédigé est réinjecté, et c'est aussi la raison
  pour laquelle l'assainissement est fait côté serveur et non ici.
-->
<article class={`rounded-xl border border-border bg-card px-5 py-4 shadow-sm ${className}`}>
  <header class="mb-2 flex items-start justify-between gap-3">
    <div class="flex items-center gap-2.5">
      <Megaphone class="h-5 w-5 shrink-0 text-primary" />
      <h2 class="text-base font-semibold text-foreground">{announcement.title}</h2>
    </div>
    <time class="shrink-0 pt-0.5 text-xs text-muted-foreground" datetime={announcement.publishedAt ?? announcement.createdAt}>
      {dateLabel}
    </time>
  </header>

  <div class="nba-announcement-body text-sm text-muted-foreground">
    {@html announcement.bodyHtml}
  </div>
</article>

<style>
  /*
    Styles portés ici plutôt que par la classe `prose` de Tailwind Typography : le
    storefront ne charge pas ce greffon, contrairement à l'administration. Un composant
    partagé par les deux applications ne peut donc pas en dépendre.
    `:global` est nécessaire pour atteindre le contenu injecté par `{@html}`.
  */
  .nba-announcement-body :global(p) {
    margin: 0 0 0.5rem;
  }
  .nba-announcement-body :global(p:last-child) {
    margin-bottom: 0;
  }
  .nba-announcement-body :global(ul),
  .nba-announcement-body :global(ol) {
    margin: 0 0 0.5rem;
    padding-left: 1.5rem;
  }
  .nba-announcement-body :global(ul) {
    list-style: disc;
  }
  .nba-announcement-body :global(ol) {
    list-style: decimal;
  }
  .nba-announcement-body :global(li) {
    margin-bottom: 0.125rem;
  }
  .nba-announcement-body :global(strong) {
    font-weight: 600;
    color: var(--foreground);
  }
  .nba-announcement-body :global(a) {
    color: var(--primary);
    text-decoration: underline;
  }
</style>
