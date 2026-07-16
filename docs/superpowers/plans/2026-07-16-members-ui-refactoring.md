# Plan d'implémentation : Refactorisation de l'UI des Membres (Shadcn Svelte)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactoriser les composants `MembersTable.svelte` et `MemberProfile.svelte` pour utiliser les primitives Shadcn Svelte de `@metacult/shared-ui`.

**Architecture:** Approche composant par composant (Vertical Slice Architecture). Migration de la table de recherche et de la fiche profil vers des composants structurés en onglets et popovers. Gestion d'état conservée via les paramètres d'URL (SSR).

**Tech Stack:** Svelte 5, TypeScript, Vite, Tailwind CSS v4, Lucide-Svelte, Vitest.

## Global Constraints

- Utiliser uniquement les composants importés depuis `@metacult/shared-ui`.
- Tous les tests unitaires et d'intégration doivent passer via `npx vitest run`.
- Le typage complet doit compiler proprement sans erreurs ni avertissements sous `npx astro check --root apps/admin-console`.
- Les changements doivent être commités après chaque tâche.

---

### Task 1 : Rénovation de la Table des Adhérents (MembersTable)

**Files:**
- Modify: `libs/features/members/ui/src/MembersTable.svelte`
- Test: `libs/features/members/ui/src/MembersTable.test.ts`

**Interfaces:**
- Consumes: `@metacult/shared-ui` (`Table`, `Button`, `Badge`, `Input`, `Popover`)

- [ ] **Étape 1 : Mettre à jour les imports et le balisage de recherche**
  Modifier les imports au début du fichier `libs/features/members/ui/src/MembersTable.svelte` :
  ```typescript
  import { Search, ChevronLeft, ChevronRight, User, MoreVertical, Eye, Filter } from 'lucide-svelte';
  import { Table, Button, Badge, Input, Popover } from '@metacult/shared-ui';
  ```
  Remplacer la barre d'outils de filtres existante (lignes 95-160) par le nouveau conteneur de recherche et popover de filtres :
  ```html
  <div class="flex items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
    <div class="relative flex-1">
      <span class="absolute inset-y-0 left-3 flex items-center text-muted-foreground z-10">
        <Search class="w-4 h-4" />
      </span>
      <Input
        type="text"
        placeholder="Rechercher un adhérent (Nom, Licence...)"
        class="pl-9 w-full bg-background"
        bind:value={searchInput}
        onkeydown={handleKeydown}
      />
    </div>

    <Popover.Root>
      <Popover.Trigger>
        <Button variant="outline" class="flex items-center gap-2">
          <Filter class="w-4 h-4" />
          Filtres
        </Button>
      </Popover.Trigger>
      <Popover.Content class="w-80 p-4 space-y-4" align="end">
        <h4 class="font-semibold text-sm border-b border-border pb-2">Options de filtrage</h4>
        
        <div class="space-y-3">
          <div class="space-y-1.5">
            <span class="text-xs font-semibold text-muted-foreground">Saison</span>
            <select
              class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              bind:value={selectedSeason}
              onchange={applyFilters}
            >
              {#each seasons as season}
                <option value={season.id}>{season.name}</option>
              {/each}
              {#if seasons.length === 0}
                <option value="25-26">Saison 2025-2026</option>
              {/if}
            </select>
          </div>

          <div class="space-y-1.5">
            <span class="text-xs font-semibold text-muted-foreground">Genre</span>
            <select
              class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              bind:value={selectedGender}
              onchange={applyFilters}
            >
              <option value="">Tous les genres</option>
              <option value="M">Homme (M)</option>
              <option value="F">Femme (F)</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <span class="text-xs font-semibold text-muted-foreground">Type d'adhérent</span>
            <select
              class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              bind:value={selectedType}
              onchange={applyFilters}
            >
              <option value="">Tous les types</option>
              <option value="Competiteur">Compétiteur</option>
              <option value="Loisir">Loisir</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <span class="text-xs font-semibold text-muted-foreground">Statut</span>
            <select
              class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              bind:value={selectedStatus}
              onchange={applyFilters}
            >
              <option value="">Tous les statuts</option>
              <option value="valide">Valide</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </div>
        </div>

        <div class="pt-2 flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onclick={() => {
              searchInput = '';
              selectedGender = '';
              selectedStatus = '';
              selectedType = '';
              selectedSeason = '25-26';
              applyFilters();
            }}
            class="text-xs"
          >
            Réinitialiser
          </Button>
        </div>
      </Popover.Content>
    </Popover.Root>
  </div>
  ```

- [ ] **Étape 2 : Remplacer le menu d'actions personnalisé par Popover**
  Remplacer la cellule d'action et le dropdown personnalisé (lignes 206-242) par le composant Popover standard :
  ```html
  <Table.Cell class="text-right">
    <Popover.Root>
      <Popover.Trigger>
        <Button 
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground hover:text-foreground cursor-pointer" 
          aria-label="Actions"
        >
          <MoreVertical class="w-4 h-4" />
        </Button>
      </Popover.Trigger>
      <Popover.Content class="w-40 p-1" align="end">
        <div class="flex flex-col">
          <a
            href={`/admin/members/${member.licence}?season=${filters.season || '25-26'}`}
            class="px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer no-underline bg-transparent rounded-md"
          >
            <Eye class="w-3.5 h-3.5" />
            Voir profil
          </a>
          {#if member.paid}
            <a
              href={`/admin/accounting/attestations/${member.id}`}
              target="_blank"
              class="px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer no-underline bg-transparent rounded-md"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Attestation CSE
            </a>
          {/if}
        </div>
      </Popover.Content>
    </Popover.Root>
  </Table.Cell>
  ```

- [ ] **Étape 3 : Exécuter et valider les tests de la table**
  Exécuter : `npx vitest run libs/features/members/ui/src/MembersTable.test.ts`
  Attendu : Tous les tests passent.

- [ ] **Étape 4 : Valider la compilation Astro**
  Exécuter : `npx astro check --root apps/admin-console`
  Attendu : 0 erreur de typage ou de compilation.

- [ ] **Étape 5 : Commiter la tâche 1**
  ```bash
  git add libs/features/members/ui/src/MembersTable.svelte
  git commit -m "style(members-ui): refactor MembersTable to use popover filters and actions dropdown"
  ```

---

### Task 2 : Refactorisation de la Fiche Profil par Onglets (MemberProfile)

**Files:**
- Modify: `libs/features/members/ui/src/MemberProfile.svelte`
- Test: `libs/features/members/ui/src/MemberProfile.test.ts`

**Interfaces:**
- Consumes: `@metacult/shared-ui` (`Card`, `Tabs`, `Table`, `Button`, `Badge`)

- [ ] **Étape 1 : Mettre à jour les imports**
  Modifier les imports au début de `libs/features/members/ui/src/MemberProfile.svelte` :
  ```typescript
  import { ArrowLeft, User, Mail, Phone, Calendar, Shield, CreditCard, Tag, Landmark, FileText } from 'lucide-svelte';
  import { Table, Button, Badge, Card, Tabs } from '@metacult/shared-ui';
  ```

- [ ] **Étape 2 : Réorganiser le corps en utilisant les Onglets (Tabs)**
  Remplacer le reste du balisage (à partir de la ligne 118) par une structure d'onglets Shadcn :
  ```html
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
  ```

- [ ] **Étape 3 : Exécuter et valider les tests du profil**
  Exécuter : `npx vitest run libs/features/members/ui/src/MemberProfile.test.ts`
  Attendu : Tous les tests passent.

- [ ] **Étape 4 : Valider la compilation Astro**
  Exécuter : `npx astro check --root apps/admin-console`
  Attendu : 0 erreur de typage ou de compilation.

- [ ] **Étape 5 : Commiter la tâche 2**
  ```bash
  git add libs/features/members/ui/src/MemberProfile.svelte
  git commit -m "style(members-ui): refactor MemberProfile layout to use Tabs, Card, Table, and progress bar"
  ```
