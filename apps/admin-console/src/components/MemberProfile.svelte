<script lang="ts">
  import { ArrowLeft, User, Mail, Phone, Calendar, Shield, CreditCard, Tag, Landmark, FileText } from 'lucide-svelte';

  interface Member {
    id: number;
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

    // Nouveaux champs financiers
    amountDue: number;
    amountReceived: number;
    amountRemaining: number;
    paid: boolean;

    // Contacts
    parent1Name: string | null;
    parent1Email: string | null;
    parent1Phone: string | null;
    parent2Name: string | null;
    parent2Email: string | null;
    parent2Phone: string | null;
  }

  interface GLTransaction {
    id: number;
    type: 'recette' | 'depense' | 'transfert';
    amount: number;
    date: string;
    description: string;
    category: string | null;
    paymentMethod: string;
  }

  let { member, transactions = [] }: { member: Member; transactions: GLTransaction[] } = $props();

  function formatImportedAt(importedAt: string) {
    if (!importedAt) return '-';
    const date = new Date(importedAt);
    return date.toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  const categoryLabels: Record<string, string> = {
    adhesions_inscriptions: 'Adhésion',
    sponsoring: 'Sponsoring',
    subventions: 'Subventions',
    actions_jeunes: 'Actions Jeunes',
    tournois_senior: 'Tournois Senior',
    evenements_buvettes: 'Evénements & Buvette',
    cordage_vente: 'Cordage',
    volants: 'Volants',
    salaires_charges: 'Salaires & Charges',
    materiel_club: 'Matériel club',
    licences_federation: 'Licence fédération',
    championnats: 'Championnats',
    stages_formations: 'Stages & Formations',
    fonctionnement_administratif: 'Fonctionnement & Admin'
  };
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
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <User class="w-8 h-8" />
      </div>
      <div>
        <h2 class="text-2xl font-bold text-foreground">{member.lastName} {member.firstName}</h2>
        <p class="text-sm text-muted-foreground mt-1 font-medium">Licence : {member.licence}</p>
      </div>
    </div>
    <div>
      {#if member.paid}
        <span class="px-3 py-1.5 text-xs font-bold rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          Cotisation réglée
        </span>
      {:else}
        <span class="px-3 py-1.5 text-xs font-bold rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
          Règlement en attente
        </span>
      {/if}
    </div>
  </div>

  <!-- Financial Summary Card (Poona) -->
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
    <h3 class="font-bold text-lg flex items-center gap-2 border-b border-border pb-2 text-foreground">
      <Landmark class="w-5 h-5 text-primary" />
      État financier de la cotisation (Poona)
    </h3>
    <div class="grid grid-cols-3 gap-4 text-center">
      <div class="p-3 bg-muted/40 rounded-lg">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Montant dû</div>
        <div class="text-lg font-bold mt-1">{(member.amountDue / 100).toFixed(2)} €</div>
      </div>
      <div class="p-3 bg-muted/40 rounded-lg">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Montant reçu</div>
        <div class="text-lg font-bold mt-1 text-emerald-600 font-semibold">{(member.amountReceived / 100).toFixed(2)} €</div>
      </div>
      <div class="p-3 bg-muted/40 rounded-lg">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Solde restant</div>
        <div class="text-lg font-bold mt-1 {member.amountRemaining > 0 ? 'text-amber-600' : 'text-foreground'}">
          {(member.amountRemaining / 100).toFixed(2)} €
        </div>
      </div>
    </div>
  </div>

  <!-- Details Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Personal Details -->
    <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
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
      </div>
    </div>

    <!-- Subscription Details -->
    <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
      <h3 class="font-bold text-lg flex items-center gap-2 border-b border-border pb-2 text-foreground">
        <CreditCard class="w-5 h-5 text-primary" />
        Formule d'adhésion
      </h3>
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <Tag class="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <div class="text-xs text-muted-foreground">Tarif / Formule</div>
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

    <!-- Contacts parents si présents -->
    {#if member.parent1Name || member.parent2Name}
      <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 md:col-span-2">
        <h3 class="font-bold text-lg flex items-center gap-2 border-b border-border pb-2 text-foreground">
          <User class="w-5 h-5 text-primary" />
          Représentants légaux (Tuteurs)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {#if member.parent1Name}
            <div class="space-y-2 text-sm">
              <div class="font-bold text-foreground">{member.parent1Name}</div>
              {#if member.parent1Email}
                <div class="text-xs text-muted-foreground">Email : {member.parent1Email}</div>
              {/if}
              {#if member.parent1Phone}
                <div class="text-xs text-muted-foreground">Tél : {member.parent1Phone}</div>
              {/if}
            </div>
          {/if}
          {#if member.parent2Name}
            <div class="space-y-2 text-sm">
              <div class="font-bold text-foreground">{member.parent2Name}</div>
              {#if member.parent2Email}
                <div class="text-xs text-muted-foreground">Email : {member.parent2Email}</div>
              {/if}
              {#if member.parent2Phone}
                <div class="text-xs text-muted-foreground">Tél : {member.parent2Phone}</div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Contact Details -->
    <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 md:col-span-2">
      <h3 class="font-bold text-lg flex items-center gap-2 border-b border-border pb-2 text-foreground">
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

    <!-- Historique des règlements Grand Livre -->
    <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 md:col-span-2">
      <h3 class="font-bold text-lg flex items-center gap-2 border-b border-border pb-2 text-foreground">
        <FileText class="w-5 h-5 text-primary" />
        Historique des règlements (Grand Livre)
      </h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead>
            <tr class="border-b border-border text-xs text-muted-foreground font-bold uppercase tracking-wider">
              <th class="py-2.5">Date</th>
              <th class="py-2.5">Description</th>
              <th class="py-2.5">Catégorie</th>
              <th class="py-2.5">Mode</th>
              <th class="py-2.5 text-right">Montant</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each transactions as tx}
              <tr class="hover:bg-muted/40 transition-colors">
                <td class="py-2.5">{tx.date}</td>
                <td class="py-2.5 font-medium">{tx.description}</td>
                <td class="py-2.5 text-xs text-muted-foreground">{categoryLabels[tx.category || ''] || 'Divers'}</td>
                <td class="py-2.5 text-xs text-muted-foreground uppercase">{tx.paymentMethod}</td>
                <td class="py-2.5 text-right font-bold text-emerald-600">
                  +{(tx.amount / 100).toFixed(2)} €
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="5" class="py-4 text-center text-muted-foreground text-xs">
                  Aucun règlement enregistré dans le Grand Livre pour cet adhérent.
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
