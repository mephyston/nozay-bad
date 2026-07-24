# Plan d'Implémentation : Rapprochement IA & Suivi Adhérents (Milestone 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le rapprochement bancaire intelligent assisté par Cloudflare Workers AI (Llama 3) et le suivi des paiements des adhérents (avec gestion des parents/tuteurs).

**Architecture:** Extension du schéma SQLite/D1 via Drizzle, enrichissement du parser Poona pour lire les montants et contacts, écriture d'un endpoint d'analyse IA qui combine une présélection déterministe et une qualification par LLM Llama-3-8b-instruct, et affichage dans l'interface utilisateur de rapprochement et sur le profil des adhérents.

**Tech Stack:** Astro v7, Svelte v5, Hono (Cloudflare Workers), Workers AI, Drizzle ORM, Vitest.

## Global Constraints
* Utiliser les versions récentes d'Astro, Svelte (v5), Tailwind CSS (v4).
* Les tests unitaires et d'intégration doivent utiliser Vitest.
* Le code TypeScript doit compiler sans erreurs strictes.
* Les montants monétaires sont stockés sous forme d'entiers en centimes.

---

### Task 1 : Migration de Base de Données

**Files:**
* Modify: `libs/shared/db/src/schema.ts`
* Modify: `libs/shared/db/src/db.test.ts`
* Create: `libs/shared/db/migrations/0006_enrich_tables_for_ai_and_members.sql` (généré par Drizzle-Kit)

**Interfaces:**
* Produces: Nouveaux champs dans `membersTable`, `ledgerEntriesTable` et `bankStatementLinesTable` dans le module `@nba/db`.

- [ ] **Step 1: Modifier le schéma Drizzle**
  Ouvrir [schema.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/schema.ts) et appliquer les modifications suivantes :
  * Dans `membersTable`, ajouter à la fin :
    ```typescript
    amountDue: integer('amount_due').notNull().default(0),
    amountReceived: integer('amount_received').notNull().default(0),
    amountRemaining: integer('amount_remaining').notNull().default(0),
    paid: integer('paid', { mode: 'boolean' }).notNull().default(false),
    parent1Name: text('parent1_name'),
    parent1Email: text('parent1_email'),
    parent1Phone: text('parent1_phone'),
    parent2Name: text('parent2_name'),
    parent2Email: text('parent2_email'),
    parent2Phone: text('parent2_phone')
    ```
  * Dans `ledgerEntriesTable`, ajouter à la fin :
    ```typescript
    memberId: integer('member_id').references(() => membersTable.id)
    ```
  * Dans `bankStatementLinesTable`, ajouter à la fin :
    ```typescript
    aiSuggestions: text('ai_suggestions')
    ```

- [ ] **Step 2: Mettre à jour les tests unitaires de base de données**
  Ajouter un test dans [db.test.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/db.test.ts) pour valider ces nouveaux champs :
  ```typescript
  it('should support new member payment and transaction relation fields', async () => {
    const db = drizzle(mockD1 as any);

    const [member] = await db.insert(membersTable).values({
      licence: '7778889',
      season: '25-26',
      lastName: 'Dupont',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '2015-06-12',
      amountDue: 25000,
      amountReceived: 10000,
      amountRemaining: 15000,
      paid: false,
      parent1Name: 'Dupont Marc',
      importedAt: new Date()
    }).returning();

    expect(member.amountDue).toBe(25000);
    expect(member.parent1Name).toBe('Dupont Marc');

    const [tx] = await db.insert(ledgerEntriesTable).values({
      seasonId: '25-26',
      type: 'recette',
      accountId: 'current',
      category: 'adhesions',
      amount: 10000,
      date: '2026-07-13',
      paymentMethod: 'virement',
      description: 'Acompte Dupont Jean',
      memberId: member.id,
      createdAt: new Date()
    }).returning();

    expect(tx.memberId).toBe(member.id);
  });
  ```

- [ ] **Step 3: Générer la migration SQL**
  Depuis la racine, lancer :
  ```bash
  npx drizzle-kit generate --config=libs/shared/db/drizzle.config.ts
  ```
  Expected: Création de `libs/shared/db/migrations/0006_enrich_tables_for_ai_and_members.sql` contenant les instructions `ALTER TABLE`.

- [ ] **Step 4: Appliquer la migration localement**
  ```bash
  npx wrangler d1 migrations apply nba-db --local --config apps/api/wrangler.json
  ```
  Expected: "Executed successfully" / ✅.

- [ ] **Step 5: Exécuter les tests unitaires de la base de données**
  Lancer :
  ```bash
  npm test
  ```
  Expected: Tous les tests passent au vert (y compris le nouveau test).

- [ ] **Step 6: Commiter**
  ```bash
  git add libs/shared/db
  git commit -m "chore(db): enrich members and transactions schemas for AI match and tracking"
  ```

---

### Task 2 : Refactoring de l'Importateur Poona

**Files:**
* Modify: `apps/api/src/index.ts`
* Modify: `apps/api/src/index.test.ts`

**Interfaces:**
* Consumes: `membersTable` de `@nba/db`.
* Produces: Importateur Poona prenant en compte les montants financiers et les coordonnées des parents.

- [ ] **Step 1: Mettre à jour le mapping des en-têtes Poona**
  Dans [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts), modifier la route `POST /members/import` :
  * Repérer la zone de détection des en-têtes et ajouter les colonnes supplémentaires :
    ```typescript
    const amountDueIdx = headers.findIndex(h => h === 'Montant');
    const amountReceivedIdx = headers.findIndex(h => h === 'Montant reçu');
    const amountRemainingIdx = headers.findIndex(h => h === 'Montant restant');
    const paidIdx = headers.findIndex(h => h === 'Payé');
    const parent1NameIdx = headers.findIndex(h => h === 'Nom du contact 1');
    const parent1EmailIdx = headers.findIndex(h => h === 'Email du contact 1');
    const parent1PhoneIdx = headers.findIndex(h => h === 'Tél. du contact 1');
    const parent2NameIdx = headers.findIndex(h => h === 'Nom du contact 2');
    const parent2EmailIdx = headers.findIndex(h => h === 'Email du contact 2');
    const parent2PhoneIdx = headers.findIndex(h => h === 'Tél. du contact 2');
    ```
  * Mettre à jour l'insertion / l'écriture dans `membersTable` pour lire et convertir ces valeurs :
    ```typescript
    const rawAmountDue = columns[amountDueIdx] ? parseFloat(columns[amountDueIdx]) : 0;
    const rawAmountReceived = columns[amountReceivedIdx] ? parseFloat(columns[amountReceivedIdx]) : 0;
    const rawAmountRemaining = columns[amountRemainingIdx] ? parseFloat(columns[amountRemainingIdx]) : 0;
    const rawPaid = columns[paidIdx] === 'Oui';

    const parent1Name = columns[parent1NameIdx] || null;
    const parent1Email = columns[parent1EmailIdx] || null;
    const parent1Phone = columns[parent1PhoneIdx] || null;
    const parent2Name = columns[parent2NameIdx] || null;
    const parent2Email = columns[parent2EmailIdx] || null;
    const parent2Phone = columns[parent2PhoneIdx] || null;

    // Ajouter ces champs dans l'objet inséré/mis à jour dans membersTable
    ```

- [ ] **Step 2: Mettre à jour les tests unitaires de l'API d'importation**
  Dans [index.test.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.test.ts), modifier le test `POST /members/import` pour passer un CSV complet avec ces colonnes :
  ```typescript
  const csvContent = `Licence;Nom;Prénom;Sexe;Date de naissance;Email;Téléphone;Statut;Type;Saison;Nom du contact 1;Email du contact 1;Tél. du contact 1;Montant;Montant reçu;Montant restant;Payé
  1111111;Martin;Pierre;M;1985-05-15;pierre.martin@example.com;0600000001;valide;Competiteur;25-26;Martin Jacques;jacques@example.com;0600000003;250.00;100.00;150.00;Non`;
  ```
  Et vérifier dans les assertions que les valeurs numériques ont bien été multipliées par 100 (conversion en centimes) :
  ```typescript
  expect(m1.amountDue).toBe(25000);
  expect(m1.amountReceived).toBe(10000);
  expect(m1.amountRemaining).toBe(15000);
  expect(m1.paid).toBe(false);
  expect(m1.parent1Name).toBe('Martin Jacques');
  ```

- [ ] **Step 3: Exécuter et valider les tests**
  ```bash
  npm test
  ```
  Expected: Tous les tests passent.

- [ ] **Step 4: Commiter**
  ```bash
  git add apps/api
  git commit -m "feat(api): update Poona importer to support financials and parents info"
  ```

---

### Task 3 : Moteur de Rapprochement Workers AI

**Files:**
* Modify: `apps/api/src/index.ts`
* Modify: `apps/api/src/index.test.ts`
* Modify: `apps/api/wrangler.json` (pour déclarer le binding AI)

**Interfaces:**
* Consumes:
  * Table `bank_transactions`, `members`
  * Cloudflare binding `env.AI` (Workers AI)
* Produces:
  * Endpoint `POST /bank-transactions/analyze` (génère et persiste les suggestions).

- [ ] **Step 1: Ajouter le binding AI dans wrangler.json**
  Ouvrir [wrangler.json](file:///Users/david/Lab/nozay-bad/apps/api/wrangler.json) et déclarer le binding AI dans les configurations :
  ```json
  "ai": {
    "binding": "AI"
  }
  ```
  *(Note: En local, Wrangler simule Workers AI automatiquement).*

- [ ] **Step 2: Ajouter le type AI aux Bindings Hono**
  Dans [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts), mettre à jour la définition du type `Bindings` :
  ```typescript
  type Bindings = {
    DB: D1Database;
    AI: any; // Binding Workers AI
  };
  ```

- [ ] **Step 3: Implémenter l'endpoint POST /bank-transactions/analyze**
  Ajouter la route d'analyse dans [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :
  * **Algorithme de présélection** : Pour chaque transaction bancaire en attente, le Worker cherche dans `membersTable` les membres ayant le même nom de famille (ou prénom) que le libellé bancaire, ou dont un des parents a le même nom, ou dont le montant restant dû est exactement égal.
  * **Appel Workers AI** : Si des candidats sont trouvés, on appelle Llama 3 pour obtenir la correspondance.
  ```typescript
  app.post('/bank-transactions/analyze', async (c) => {
    if (!c.env || !c.env.DB || !c.env.AI) {
      return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
    }
    const season = c.req.query('season');
    if (!season) {
      return c.json({ success: false, error: 'Missing season query parameter' }, 400);
    }

    const db = drizzle(c.env.DB);
    
    // 1. Récupérer toutes les transactions bancaires pending de la saison
    const pendingTxs = await db.select()
      .from(bankStatementLinesTable)
      .where(and(
        eq(bankStatementLinesTable.seasonId, season),
        eq(bankStatementLinesTable.status, 'pending')
      ))
      .all();

    // 2. Récupérer tous les adhérents de la saison pour la présélection
    const members = await db.select()
      .from(membersTable)
      .where(eq(membersTable.season, season))
      .all();

    let analyzedCount = 0;

    for (const tx of pendingTxs) {
      // Déterminer la catégorie par défaut par dictionnaire simple
      let suggestedCategory = 'buvette';
      const nameLower = tx.name.toLowerCase();
      if (nameLower.includes('ionos')) suggestedCategory = 'divers_depense';
      else if (nameLower.includes('urssaf')) suggestedCategory = 'salaires';
      else if (nameLower.includes('larde')) suggestedCategory = 'achats_club';
      else if (nameLower.includes('ligue')) suggestedCategory = 'licences_ffbad';
      else if (nameLower.includes('adhesion') || nameLower.includes('cotisation') || nameLower.includes('vir recu')) suggestedCategory = 'adhesions';

      // Présélection des candidats adhérents :
      // On filtre les membres dont le nom de famille ou prénom apparaît dans le libellé/mémo
      const textToSearch = `${tx.name} ${tx.memo || ''}`.toLowerCase();
      const candidates = members.filter(m => {
        const matchesLastName = textToSearch.includes(m.lastName.toLowerCase());
        const matchesFirstName = textToSearch.includes(m.firstName.toLowerCase());
        const matchesParent1 = m.parent1Name && textToSearch.includes(m.parent1Name.toLowerCase());
        const matchesParent2 = m.parent2Name && textToSearch.includes(m.parent2Name.toLowerCase());
        const matchesAmount = Math.abs(m.amountRemaining) === Math.abs(tx.amount);
        
        return matchesLastName || matchesFirstName || matchesParent1 || matchesParent2 || matchesAmount;
      }).slice(0, 5); // Max 5 candidats pour rester rapide

      let suggestionResult = {
        category: suggestedCategory,
        memberId: null as number | null,
        memberName: null as string | null,
        confidence: 0.5
      };

      if (candidates.length > 0) {
        // Appeler Workers AI (Llama 3) pour affiner le matching
        const prompt = `Tu es l'assistant comptable du club Nozay Badminton.
Opération bancaire à rapprocher :
- Libellé : "${tx.name}"
- Détails : "${tx.memo || 'Aucun'}"
- Montant : ${(tx.amount / 100).toFixed(2)} EUR (${tx.amount < 0 ? 'Débit' : 'Crédit'})

Liste des candidats adhérents possibles :
${candidates.map(c => `- ID: ${c.id}, Nom: ${c.lastName} ${c.firstName}, Parent 1: ${c.parent1Name || 'Aucun'}, Montant Restant Dû: ${(c.amountRemaining / 100).toFixed(2)} EUR`).join('\n')}

Trouve quel est l'adhérent le plus probablement associé à cette opération.
Renvoie STRICTEMENT un objet JSON sous la forme suivante (sans aucun autre texte, balises markdown ou commentaires) :
{
  "memberId": <ID de l'adhérent ou null>,
  "memberName": "<Nom Prénom de l'adhérent ou null>",
  "category": "adhesions",
  "confidence": <nombre entre 0.0 et 1.0>,
  "reasoning": "<1 phrase d'explication>"
}`;

        try {
          const aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [{ role: 'user', content: prompt }]
          });
          const textRes = aiResponse.response || aiResponse.text || '';
          // Extraire l'objet JSON de la réponse texte
          const jsonMatch = textRes.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            suggestionResult = {
              category: parsed.category || suggestedCategory,
              memberId: parsed.memberId || null,
              memberName: parsed.memberName || null,
              confidence: parsed.confidence || 0.5
            };
          }
        } catch (e) {
          // Fallback sur le premier candidat si l'IA échoue
          if (candidates.length === 1) {
            suggestionResult.memberId = candidates[0].id;
            suggestionResult.memberName = `${candidates[0].lastName} ${candidates[0].firstName}`;
            suggestionResult.confidence = 0.7;
          }
        }
      }

      // Sauvegarder la suggestion en base de données
      await db.update(bankStatementLinesTable)
        .set({ aiSuggestions: JSON.stringify(suggestionResult) })
        .where(eq(bankStatementLinesTable.id, tx.id))
        .run();
      
      analyzedCount++;
    }

    return c.json({ success: true, count: analyzedCount });
  });
  ```

- [ ] **Step 4: Mettre à jour la route de pointage pour mettre à jour le solde adhérent**
  Dans la route `POST /bank-transactions/:id/reconcile`, si l'action est `create` et qu'un `memberId` est fourni, mettre à jour le solde reçu et restant de l'adhérent dans `membersTable` :
  ```typescript
  if (body.action === 'create') {
    // ... insertion transaction ...
    if (tx.memberId) {
      // Récupérer l'adhérent
      const member = await db.select().from(membersTable).where(eq(membersTable.id, tx.memberId)).get();
      if (member) {
        const newReceived = member.amountReceived + Math.abs(tx.amount);
        const newRemaining = Math.max(0, member.amountDue - newReceived);
        const isPaid = newRemaining === 0;

        await db.update(membersTable)
          .set({
            amountReceived: newReceived,
            amountRemaining: newRemaining,
            paid: isPaid
          })
          .where(eq(membersTable.id, tx.memberId))
          .run();
      }
    }
  }
  ```

- [ ] **Step 5: Écrire les tests d'intégration Vitest**
  Ajouter un test dans [index.test.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.test.ts) pour vérifier que `/bank-transactions/analyze` génère bien les suggestions et que le pointage met à jour le solde de l'adhérent :
  ```typescript
  it('should analyze transactions and update member balances on reconciliation', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Mock adhérent et opération
    const [m] = await db.insert(membersTable).values({
      licence: '1234567',
      season: '25-26',
      lastName: 'PIGNON',
      firstName: 'Eliot',
      gender: 'M',
      birthDate: '2010-01-01',
      amountDue: 25000,
      amountReceived: 0,
      amountRemaining: 25000,
      parent1Name: 'Sébastien PIGNON',
      importedAt: new Date()
    }).returning();

    const [bt] = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-PIGNON-TEST',
      seasonId: '25-26',
      accountId: 'current',
      amount: 25000, // 250.00 €
      date: '2026-02-02',
      name: 'VIR INST RE 653287691266',
      memo: 'DE: M SEBASTIEN PIGNON MOTIF: ADHESION ELIOT PIGNON',
      status: 'pending',
      createdAt: new Date()
    }).returning();

    // Mock du binding AI
    const mockAI = {
      run: async (model: string, input: any) => {
        return {
          response: JSON.stringify({
            memberId: m.id,
            memberName: 'Eliot PIGNON',
            category: 'adhesions',
            confidence: 0.95
          })
        };
      }
    };

    // 1. Appeler l'endpoint d'analyse
    const analyzeRes = await app.request('http://localhost/bank-transactions/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    // 2. Vérifier que la suggestion a été enregistrée
    const getRes = await app.request('http://localhost/bank-transactions?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    const getJson = await getRes.json() as any;
    const updatedBt = getJson.data[0];
    expect(updatedBt.aiSuggestions).not.toBeNull();
    const suggestions = JSON.parse(updatedBt.aiSuggestions);
    expect(suggestions.memberId).toBe(m.id);

    // 3. Réaliser le pointage
    const reconRes = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        btId: bt.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 'adhesions',
          amount: 25000,
          date: '2026-02-02',
          paymentMethod: 'virement',
          description: 'Adhésion Eliot PIGNON',
          memberId: m.id,
          reference: 'FITID-PIGNON-TEST'
        }
      })
    }, { DB: mockD1 as any });
    expect(reconRes.status).toBe(200);

    // 4. Vérifier que l'adhérent a son solde mis à jour à payé = true
    const updatedMember = await db.select().from(membersTable).where(eq(membersTable.id, m.id)).get();
    expect(updatedMember.amountReceived).toBe(25000);
    expect(updatedMember.amountRemaining).toBe(0);
    expect(updatedMember.paid).toBe(true);
  });
  ```

- [ ] **Step 6: Exécuter les tests**
  ```bash
  npm test
  ```
  Expected: Tous les tests (34 tests au total) passent au vert.

- [ ] **Step 7: Commiter**
  ```bash
  git add apps/api wrangler.json
  git commit -m "feat(api): implement Workers AI matching and member balance updates"
  ```

---

### Task 4 : Intégration de l'IA et Suivi dans l'Interface Utilisateur

**Files:**
* Modify: `apps/admin-console/src/components/BankStatementReconciliation.svelte`
* Modify: `apps/admin-console/src/components/BankStatementReconciliation.test.ts`
* Modify: `apps/admin-console/src/pages/admin/compta/import.astro`
* Modify: `apps/admin-console/src/pages/admin/members/[licence].astro`
* Modify: `apps/admin-console/src/components/MemberProfile.svelte`
* Modify: `apps/admin-console/src/components/MemberProfile.test.ts`

**Interfaces:**
* Consumes:
  * Route API `POST /bank-transactions/analyze`
  * Nouveaux champs de `members` et `transactions` dans l'UI.
* Produces:
  * Bouton d'analyse IA et badges dans le workspace.
  * Encart financier et historique des règlements dans le profil adhérent.

- [ ] **Step 1: Ajouter le bouton d'analyse IA dans BankStatementReconciliation.svelte**
  Ouvrir [BankStatementReconciliation.svelte](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/BankStatementReconciliation.svelte) et ajouter :
  * En haut de la liste de gauche, un bouton pour lancer l'analyse IA :
    ```html
    <!-- Script -->
    let isAnalyzing = $state(false);
    let membersList = $state<any[]>([]); // Liste complète pour recherche manuelle
    
    async function handleAnalyze() {
      isAnalyzing = true;
      try {
        const res = await fetch(`/admin/compta/import?action=analyze&season=${selectedSeason}`, {
          method: 'POST'
        });
        if (!res.ok) throw new Error('Erreur analyse.');
        window.location.reload();
      } catch (err: any) {
        alert(err.message);
        isAnalyzing = false;
      }
    }
    ```
  * Mettre à jour l'en-tête de la liste de gauche pour ajouter le bouton :
    ```html
    <div class="p-4 border-b border-border bg-muted flex items-center justify-between">
      <span class="font-bold text-sm">Opérations bancaires en attente ({bankTransactions.length})</span>
      <button onclick={handleAnalyze} disabled={isAnalyzing} class="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded cursor-pointer">
        {isAnalyzing ? 'Analyse IA...' : 'Lancer l\'analyse IA'}
      </button>
    </div>
    ```
  * Affichez la suggestion IA sous forme de badge de couleur dans la liste de gauche et dans le panneau droit.
    ```html
    {#if bt.aiSuggestions}
      {@const sug = JSON.parse(bt.aiSuggestions)}
      {#if sug.memberName}
        <div class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary">
          IA : Suggéré pour {sug.memberName} ({sug.category})
        </div>
      {/if}
    {/if}
    ```
  * Dans le panneau de droite, afficher l'encart d'association rapide IA :
    ```html
    {#if selectedTx.aiSuggestions}
      {@const sug = JSON.parse(selectedTx.aiSuggestions)}
      {#if sug.memberId}
        <div class="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-primary">Suggestion IA (Confiance {Math.round(sug.confidence * 100)}%)</h4>
          <p class="text-xs">Lier cette transaction bancaire à l'adhérent **{sug.memberName}** dans la catégorie **{sug.category}**.</p>
          <button onclick={() => handleMatchWithAI(selectedTx.id, sug.memberId, sug.category)} class="w-full py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded hover:bg-primary/90 cursor-pointer">
            Valider la suggestion IA
          </button>
        </div>
      {/if}
    {/if}
    ```
    *(Écrire la fonction `handleMatchWithAI` qui appelle `handleCreateAndMatch` pré-rempli).*

- [ ] **Step 2: Ajouter la recherche manuelle d'adhérent dans le formulaire de création**
  Ajouter un champ de sélection d'adhérent avec recherche dans le formulaire d'association de `BankStatementReconciliation.svelte` (permettant de lier manuellement un adhérent si l'IA n'a rien suggéré ou s'est trompée).

- [ ] **Step 3: Mettre à jour la page Astro import.astro**
  Modifier [import.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/compta/import.astro) pour intercepter le paramètre d'action `analyze` dans les requêtes POST et le relayer vers l'endpoint de l'API Hono.

- [ ] **Step 4: Mettre à jour le profil de l'adhérent (Component & Page)**
  * Ouvrir [MemberProfile.svelte](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/MemberProfile.svelte) et :
    1. Mettre à jour l'interface `Member` pour y déclarer les nouveaux champs Poona.
    2. Affichez un bloc **« Détails du Règlement (Poona) »** avec les montants Dû, Reçu et Restant.
    3. Affichez un tableau **« Historique des règlements (Grand Livre) »** listant toutes les transactions passées en propriétés où `memberId` correspond.
  * Ouvrir [\[licence\].astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/members/[licence].astro) pour récupérer ces transactions associées depuis l'API Hono Worker (ex: `GET /transactions?memberId=X`) et les passer au composant `MemberProfile.svelte`.

- [ ] **Step 5: Valider et exécuter les tests unitaires et de compilation**
  Lancer :
  ```bash
  npx svelte-check
  npx astro check --root apps/admin-console
  npm test
  ```
  Expected: svelte-check et astro check retournent 0 erreur. Tous les 35 tests passent.

- [ ] **Step 6: Commiter**
  ```bash
  git add apps/admin-console
  git commit -m "feat(ui): add AI suggestions workspace, manual member search, and payment tracking"
  ```
