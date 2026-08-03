<script lang="ts">
  import { Shield, Calendar, Tag, Mail, Phone, Receipt } from '@lucide/svelte';
  import { Card, Button, uiConfirm } from '@nba/ui';
  import type { Member } from './member-profile-types';

  let { member }: { member: Member } = $props();

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
</script>

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

  <!-- Coordonnées & Contacts -->
  <Card.Root>
    <Card.Content class="p-6 space-y-4">
      <h3 class="font-bold text-lg border-b border-border pb-2 text-foreground">
        Contacts & Urgence
      </h3>
      <div class="space-y-3">
        {#if member.email}
          <div class="flex items-center gap-3">
            <Mail class="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div class="text-xs text-muted-foreground">E-mail</div>
              <a href="mailto:{member.email}" class="text-sm font-medium hover:underline text-primary">{member.email}</a>
            </div>
          </div>
        {/if}
        {#if member.phone}
          <div class="flex items-center gap-3">
            <Phone class="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div class="text-xs text-muted-foreground">Téléphone</div>
              <a href="tel:{member.phone}" class="text-sm font-medium hover:underline text-primary">{member.phone}</a>
            </div>
          </div>
        {/if}
        
        {#if member.parent1Name}
          <div class="pt-2 border-t border-border/60">
            <div class="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Représentant Légal 1</div>
            <div class="text-sm font-semibold">{member.parent1Name}</div>
            {#if member.parent1Email}
              <div class="text-xs text-muted-foreground mt-0.5"><a href="mailto:{member.parent1Email}" class="hover:underline">{member.parent1Email}</a></div>
            {/if}
            {#if member.parent1Phone}
              <div class="text-xs text-muted-foreground mt-0.5"><a href="tel:{member.parent1Phone}" class="hover:underline">{member.parent1Phone}</a></div>
            {/if}
          </div>
        {/if}
        {#if member.parent2Name}
          <div class="pt-2 border-t border-border/60">
            <div class="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Représentant Légal 2</div>
            <div class="text-sm font-semibold">{member.parent2Name}</div>
            {#if member.parent2Email}
              <div class="text-xs text-muted-foreground mt-0.5"><a href="mailto:{member.parent2Email}" class="hover:underline">{member.parent2Email}</a></div>
            {/if}
            {#if member.parent2Phone}
              <div class="text-xs text-muted-foreground mt-0.5"><a href="tel:{member.parent2Phone}" class="hover:underline">{member.parent2Phone}</a></div>
            {/if}
          </div>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>
</div>
