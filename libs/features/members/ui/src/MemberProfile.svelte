<script lang="ts">
  import { ArrowLeft, User, Mail, Phone, Calendar, Shield, CreditCard, Tag, Landmark, FileText } from 'lucide-svelte';
  import { Table, Button, Badge, Card, Tabs } from '@metacult/shared-ui';

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

  let { member, transactions = [], seasonId = '25-26' }: { member: Member; transactions: GLTransaction[]; seasonId?: string } = $props();

  let cotisationTransactions = $derived(transactions.filter(t => t.category === 'adhesions_inscriptions'));
  let otherTransactions = $derived(transactions.filter(t => t.category !== 'adhesions_inscriptions'));
  let totalOtherAmount = $derived(otherTransactions.reduce((sum, t) => sum + t.amount, 0));

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
    href={`/admin/members?season=${seasonId}`}
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
    <div class="flex items-center gap-3">
      {#if member.paid}
        <Button
          href={`/admin/accounting/attestations/${member.id}`}
          target="_blank"
          size="sm"
          class="no-underline"
        >
          <FileText class="w-3.5 h-3.5" />
          Attestation CSE
        </Button>
        <Badge variant="outline" class="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold px-3 py-1.5 h-auto rounded-full">
          Cotisation réglée
        </Badge>
      {:else}
        <Badge variant="outline" class="bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold px-3 py-1.5 h-auto rounded-full">
          Règlement en attente
        </Badge>
      {/if}
    </div>
  </div>

  <!-- Financial Summary Card (Poona) & Tabs -->
  <Tabs.Root value="profil" class="w-full">
    <Tabs.List class="grid w-full grid-cols-3 mb-6">
      <Tabs.Trigger value="profil">Profil & Contacts</Tabs.Trigger>
      <Tabs.Trigger value="cotisation">Cotisation Poona</Tabs.Trigger>
      <Tabs.Trigger value="transactions">Historique Financier</Tabs.Trigger>
    </Tabs.List>

    <!-- TAB 1: Profil & Contacts -->
    <Tabs.Content value="profil">
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
              
              <!-- Contacts Parents -->
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
    </Tabs.Content>

    <!-- TAB 2: Cotisation Poona -->
    <Tabs.Content value="cotisation">
      <Card.Root>
        <Card.Content class="p-6 space-y-6">
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
          
          <!-- Barre de progression -->
          <div class="space-y-2">
            <div class="flex justify-between text-xs text-muted-foreground font-semibold">
              <span>Progression du règlement</span>
              <span>{member.amountDue > 0 ? Math.round((member.amountReceived / member.amountDue) * 100) : 0}%</span>
            </div>
            <div class="w-full bg-muted h-3 rounded-full overflow-hidden border border-border">
              <div 
                class="bg-primary h-full transition-all duration-500" 
                style="width: {member.amountDue > 0 ? Math.min(100, Math.round((member.amountReceived / member.amountDue) * 100)) : 0}%"
              ></div>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- TAB 3: Historique Financier -->
    <Tabs.Content value="transactions">
      <Card.Root class="space-y-4">
        <Card.Content class="p-6 space-y-4">
          <h3 class="font-bold text-lg border-b border-border pb-2 text-foreground">
            Écritures associées au Grand Livre
          </h3>
          
          {#if transactions.length === 0}
            <p class="text-sm text-muted-foreground italic p-4 text-center">Aucune transaction enregistrée pour cet adhérent.</p>
          {:else}
            <div class="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Date</Table.Head>
                    <Table.Head>Description</Table.Head>
                    <Table.Head>Catégorie</Table.Head>
                    <Table.Head>Paiement</Table.Head>
                    <Table.Head class="text-right">Montant</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each transactions as tx}
                    <Table.Row class="hover:bg-muted/50 transition-colors">
                      <Table.Cell class="text-muted-foreground">{tx.date}</Table.Cell>
                      <Table.Cell class="font-medium">{tx.description}</Table.Cell>
                      <Table.Cell>
                        <Badge variant="secondary">
                          {tx.category ? (categoryLabels[tx.category] || tx.category) : 'Divers'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell class="capitalize">{tx.paymentMethod}</Table.Cell>
                      <Table.Cell class="text-right font-semibold font-mono text-emerald-600">
                        +{(tx.amount / 100).toFixed(2)} €
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    </Tabs.Content>
  </Tabs.Root>
</div>
