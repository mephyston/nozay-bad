<script lang="ts">
  import { Shield, Calendar, Tag, Mail, Phone, Receipt, Copy, Check, User, Users, Landmark } from '@lucide/svelte';
  import { Card, Button, Badge, Checkbox, uiConfirm, toast } from '@nba/ui';
  import type { Member } from './member-profile-types';
  import { CLUB_FUNCTIONS, CLUB_FUNCTION_LABELS, type ClubFunction } from '../../shared/club-functions';

  let {
    member,
    season = '25-26',
    clubFunctions = [],
    canWrite = false
  }: {
    member: Member;
    season?: string;
    clubFunctions?: ClubFunction[];
    canWrite?: boolean;
  } = $props();

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
        toast.success(authorized
          ? `${name} peut désormais soumettre des notes de frais.`
          : `${name} ne peut plus soumettre de notes de frais.`);
      } else {
        const txt = await res.text().catch(() => '');
        toast.error(txt || `Échec de la mise à jour (HTTP ${res.status}).`);
      }
    } catch (e: any) {
      toast.error('Erreur réseau : ' + (e?.message ?? String(e)));
    }
    toggling = false;
  }

  // Fonction au club : une au plus (pas de cumul de mandats) — cliquer une autre
  // fonction remplace, recliquer la même la retire. Remplacement complet à
  // l'enregistrement, même contrat que l'API. La règle d'unicité (président…) est
  // jugée côté serveur ; ici on se contente de relayer son message de refus.
  let selectedFunctions = $state<ClubFunction[]>([...clubFunctions]);
  let savedFunctions = $state<ClubFunction[]>([...clubFunctions]);
  let savingFunctions = $state(false);
  const functionsDirty = $derived(
    selectedFunctions.length !== savedFunctions.length ||
      selectedFunctions.some((fn) => !savedFunctions.includes(fn))
  );

  function toggleFunction(fn: ClubFunction) {
    selectedFunctions = selectedFunctions.includes(fn) ? [] : [fn];
  }

  async function saveFunctions() {
    if (savingFunctions || !functionsDirty) return;
    savingFunctions = true;
    try {
      const res = await fetch('/admin/api/member-functions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licence: member.licence, season, functions: selectedFunctions })
      });
      const body: any = await res.json().catch(() => null);
      if (res.ok && body?.success) {
        savedFunctions = [...selectedFunctions];
        try {
          // L'indicateur « fonctions à définir » de la barre latérale met ce statut en
          // cache : une attribution qui vient d'être faite doit le faire disparaître
          // sans attendre l'expiration.
          sessionStorage.removeItem('club_functions_alert');
        } catch {
          /* Sans stockage, il n'y avait rien à invalider. */
        }
        toast.success('Fonction au club enregistrée.');
      } else {
        toast.error(body?.error || `Échec de la mise à jour (HTTP ${res.status}).`);
      }
    } catch (e: any) {
      toast.error('Erreur réseau : ' + (e?.message ?? String(e)));
    }
    savingFunctions = false;
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
          {#if canWrite}
            <Button variant={authorized ? 'outline' : 'default'} size="sm" disabled={toggling} onclick={toggleExpense}>
              {authorized ? 'Retirer' : 'Autoriser'}
            </Button>
          {/if}
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

  <!-- Fonction au club : bureau, CA, entraîneur — par saison, une au plus. Alimente le
       ciblage des notifications « gestion du club » (ex. rappel d'import des classements). -->
  <Card.Root class="md:col-span-2">
    <Card.Content class="p-6 space-y-4">
      <h3 class="font-bold text-lg flex items-center gap-2 border-b border-border pb-2 text-foreground">
        <Landmark class="w-5 h-5 text-primary" />
        Fonction au club
        <span class="text-xs font-normal text-muted-foreground">saison {season}</span>
      </h3>
      {#if canWrite}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {#each CLUB_FUNCTIONS as fn (fn)}
            <label class="flex items-center gap-2 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-muted/40">
              <Checkbox
                checked={selectedFunctions.includes(fn)}
                onCheckedChange={() => toggleFunction(fn)}
                aria-label={CLUB_FUNCTION_LABELS[fn]}
              />
              <span class="text-sm">{CLUB_FUNCTION_LABELS[fn]}</span>
            </label>
          {/each}
        </div>
        <div class="flex items-center justify-between gap-3">
          <p class="text-[11px] text-muted-foreground">
            Une fonction au plus par adhérent. Président, trésorier et trésorier adjoint
            n'ont qu'un titulaire par saison.
          </p>
          <Button size="sm" disabled={savingFunctions || !functionsDirty} onclick={saveFunctions}>
            Enregistrer
          </Button>
        </div>
      {:else}
        <!-- Sans le droit d'écriture, la fonction se lit : une grille de cases inertes
             ressemblerait à une commande en panne. -->
        {#if savedFunctions.length > 0}
          <div class="flex flex-wrap gap-2">
            {#each savedFunctions as fn (fn)}
              <Badge variant="secondary" size="lg" shape="pill">{CLUB_FUNCTION_LABELS[fn]}</Badge>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">Aucune fonction au club cette saison.</p>
        {/if}
      {/if}
    </Card.Content>
  </Card.Root>
</div>
