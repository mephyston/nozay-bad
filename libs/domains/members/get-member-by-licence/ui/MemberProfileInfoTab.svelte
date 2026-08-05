<script lang="ts">
  import { Shield, Calendar, Tag, Mail, Phone, Receipt, Copy, Check, User, Users } from '@lucide/svelte';
  import { Card, Button, Badge, uiConfirm } from '@nba/ui';
  import type { Member } from './member-profile-types';

  let { member }: { member: Member } = $props();

  // Représentants légaux réellement renseignés, pour ne pas afficher une section vide.
  const legalGuardians = $derived(
    [
      { name: member.parent1Name, email: member.parent1Email, phone: member.parent1Phone },
      { name: member.parent2Name, email: member.parent2Email, phone: member.parent2Phone }
    ].filter((g) => g.name)
  );

  // Autorisation de note de frais : bascule persistée via l'API admin.
  let authorized = $state(Boolean(member.expenseAuthorized));
  let toggling = $state(false);
  async function toggleExpense() {
    if (toggling) return;
    const name = `${member.firstName} ${member.lastName}`;
    const ok = await uiConfirm(
      !authorized
        ? `Autoriser ${name} à soumettre des notes de frais ?`
        : `Retirer à ${name} l'autorisation de soumettre des notes de frais ?`
    );
    if (!ok) return;
    toggling = true;
    try {
      const res = await fetch('/admin/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, authorized: !authorized })
      });
      if (res.ok) {
        authorized = !authorized;
      } else {
        const txt = await res.text().catch(() => '');
        alert(`Échec de la mise à jour (HTTP ${res.status}). ${txt}`);
      }
    } catch (e: any) {
      alert('Erreur réseau : ' + (e?.message ?? String(e)));
    }
    toggling = false;
  }

  let copiedEmail = $state<string | null>(null);

  async function copyToClipboard(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      copiedEmail = email;
      setTimeout(() => {
        if (copiedEmail === email) copiedEmail = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }
</script>

<!-- Bloc de coordonnées réutilisé pour l'adhérent et pour chaque représentant : une
     même présentation partout, seul l'en-tête change — c'est lui qui dit à qui
     appartiennent l'e-mail et le téléphone affichés. -->
{#snippet contactLines(email: string | null | undefined, phone: string | null | undefined)}
  {#if email || phone}
    <div class="space-y-1.5">
      {#if email}
        <div class="flex items-center gap-2">
          <Mail class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <a href="mailto:{email}" class="text-sm hover:underline text-primary break-all">{email}</a>
          <button
            class="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
            onclick={() => copyToClipboard(email)}
            title="Copier l'email"
          >
            {#if copiedEmail === email}
              <Check class="w-3.5 h-3.5 text-success" />
            {:else}
              <Copy class="w-3.5 h-3.5" />
            {/if}
          </button>
        </div>
      {/if}
      {#if phone}
        <div class="flex items-center gap-2">
          <Phone class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <a href="tel:{phone}" class="text-sm hover:underline text-primary">{phone}</a>
        </div>
      {/if}
    </div>
  {:else}
    <p class="text-sm text-muted-foreground italic">Aucune coordonnée renseignée.</p>
  {/if}
{/snippet}

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <!-- Informations personnelles -->
  <Card.Root>
    <Card.Content class="p-6 space-y-4">
      <h3 class="font-bold text-lg flex items-center gap-2 border-b border-border pb-2 text-foreground">
        <Shield class="w-5 h-5 text-primary" />
        Informations personnelles
      </h3>
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <Calendar class="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <div class="text-xs text-muted-foreground">Date de naissance</div>
            <div class="text-sm font-medium">{member.birthDate}</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <Tag class="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <div class="text-xs text-muted-foreground">Genre</div>
            <div class="text-sm font-medium">{member.gender === 'M' ? 'Homme' : 'Femme'}</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <Tag class="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <div class="text-xs text-muted-foreground">Formule d'adhésion</div>
            <div class="text-sm font-medium">{member.type}</div>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3 border-t border-border pt-3">
          <div class="flex items-center gap-3">
            <Receipt class="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div class="text-xs text-muted-foreground">Notes de frais</div>
              <div class="text-sm font-medium">{authorized ? 'Autorisées' : 'Non autorisées'}</div>
            </div>
          </div>
          <Button variant={authorized ? 'outline' : 'default'} size="sm" disabled={toggling} onclick={toggleExpense}>
            {authorized ? 'Retirer' : 'Autoriser'}
          </Button>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Coordonnées : celles de l'adhérent et celles de ses représentants légaux sont
       deux blocs distincts et nommés. Auparavant tout s'enchaînait dans une seule
       liste, et l'e-mail affiché en premier pouvait être pris pour celui de
       l'adhérent alors qu'il n'en avait pas. -->
  <Card.Root>
    <Card.Content class="p-6 space-y-5">
      <h3 class="font-bold text-lg border-b border-border pb-2 text-foreground">
        Coordonnées
      </h3>

      <section class="rounded-lg bg-muted/40 p-3 space-y-2">
        <div class="flex items-center gap-2 flex-wrap">
          <User class="w-4 h-4 text-primary shrink-0" />
          <span class="text-sm font-semibold text-foreground">{member.firstName} {member.lastName}</span>
          <Badge variant="secondary" size="xs">Adhérent</Badge>
        </div>
        {@render contactLines(member.email, member.phone)}
      </section>

      {#if legalGuardians.length > 0}
        <section class="space-y-3">
          <div class="flex items-center gap-2">
            <Users class="w-4 h-4 text-muted-foreground shrink-0" />
            <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {legalGuardians.length > 1 ? 'Représentants légaux' : 'Représentant légal'}
            </h4>
          </div>
          {#each legalGuardians as guardian (guardian.name)}
            <div class="border-l-2 border-primary/30 pl-3 space-y-2">
              <div class="text-sm font-semibold text-foreground">{guardian.name}</div>
              {@render contactLines(guardian.email, guardian.phone)}
            </div>
          {/each}
        </section>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
