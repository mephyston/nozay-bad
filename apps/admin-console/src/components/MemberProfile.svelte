<script lang="ts">
  import { ArrowLeft, User, Mail, Phone, Calendar, Shield, CreditCard, Tag } from 'lucide-svelte';

  interface Member {
    licence: string;
    lastName: string;
    firstName: string;
    gender: 'M' | 'F';
    birthDate: string;
    email: string | null;
    phone: string | null;
    status: string;
    type: string;
    importedAt: string;
  }

  let { member }: { member: Member } = $props();

  function formatImportedAt(importedAt: string) {
    if (!importedAt) return '-';
    const date = new Date(importedAt);
    return date.toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }
</script>

<div class="space-y-6 max-w-3xl mx-auto">
  <a
    href="/admin/members"
    class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    <ArrowLeft class="w-4 h-4" />
    Retour à la liste des adhérents
  </a>

  <!-- Profile Header Card -->
  <div class="bg-card border border-border rounded-lg p-6 shadow-sm flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <User class="w-8 h-8" />
      </div>
      <div>
        <h2 class="text-2xl font-bold">{member.lastName} {member.firstName}</h2>
        <p class="text-sm text-muted-foreground mt-1">Licence : {member.licence}</p>
      </div>
    </div>
    <div>
      {#if member.status === 'valide'}
        <span class="px-3 py-1.5 text-sm font-semibold rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          Valide
        </span>
      {:else}
        <span class="px-3 py-1.5 text-sm font-semibold rounded-full bg-destructive/15 border border-destructive/30 text-destructive">
          Suspendu
        </span>
      {/if}
    </div>
  </div>

  <!-- Details Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Personal Details -->
    <div class="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
      <h3 class="font-semibold text-lg flex items-center gap-2 border-b border-border pb-2">
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
      </div>
    </div>

    <!-- Subscription Details -->
    <div class="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
      <h3 class="font-semibold text-lg flex items-center gap-2 border-b border-border pb-2">
        <CreditCard class="w-5 h-5 text-primary" />
        Adhésion & Import
      </h3>
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <Tag class="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <div class="text-xs text-muted-foreground">Formule d'adhésion</div>
            <div class="text-sm font-medium">{member.type}</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <Calendar class="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <div class="text-xs text-muted-foreground">Date d'importation Poona</div>
            <div class="text-sm font-medium">{formatImportedAt(member.importedAt)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Details -->
    <div class="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4 md:col-span-2">
      <h3 class="font-semibold text-lg flex items-center gap-2 border-b border-border pb-2">
        <Mail class="w-5 h-5 text-primary" />
        Coordonnées de contact
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex items-center gap-3">
          <Mail class="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <div class="text-xs text-muted-foreground">Adresse Email</div>
            <div class="text-sm font-medium break-all">{member.email || 'Non renseigné'}</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <Phone class="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <div class="text-xs text-muted-foreground">Numéro de téléphone</div>
            <div class="text-sm font-medium">{member.phone || 'Non renseigné'}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
