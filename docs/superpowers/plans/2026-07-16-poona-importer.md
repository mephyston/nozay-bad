# Plan d'Implémentation : Refonte de l'Importateur Poona

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Améliorer le composant PoonaImporter pour y intégrer une validation locale des en-têtes CSV, une table de prévisualisation avant l'envoi et un tableau de bord (KPI cards) des résultats de l'importation.

**Architecture:** Le composant lira localement le fichier CSV sélectionné avec `FileReader` pour en extraire les métadonnées et prévisualiser les 5 premières lignes dans un tableau. Après soumission et succès, le résultat de l'import sera affiché via des cartes statistiques thématiques.

**Tech Stack:** Svelte 5, TypeScript, Lucide Icons, Shadcn Svelte (@nba/ui : Table, Card, Button, Alert).

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Validation locale des en-têtes CSV et Prévisualisation des données

**Files:**
* Modify: `libs/features/members/ui/src/PoonaImporter.svelte`
* Modify: `libs/features/members/ui/src/PoonaImporter.test.ts`

**Interfaces:**
* Consumes: La zone de dépôt de fichier (Dropzone) et le bouton de soumission existants.
* Produces: Validation locale des en-têtes, calcul du séparateur, compte du nombre de lignes et chargement des 5 premières lignes dans l'état réactif `csvPreview`.

- [ ] **Step 1: Write the failing tests in PoonaImporter.test.ts**

Ouvrir [PoonaImporter.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/members/ui/src/PoonaImporter.test.ts) et ajouter les scénarios de test suivants :

```typescript
  it('should validate missing headers and show local error alert', async () => {
    const target = document.createElement('div');
    const component = mount(PoonaImporter, {
      target,
      props: {}
    });
    flushSync();

    // Simuler le chargement d'un CSV avec des en-têtes invalides
    const file = new File(['Licence;Sexe\n1000001;M'], 'members_invalid.csv', { type: 'text/csv' });
    
    // Simuler l'analyse locale en appelant l'API FileReader (ou en simulant le changement de fichier réactif)
    const input = target.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: true
    });
    input.dispatchEvent(new Event('change'));
    flushSync();

    // Attendre la lecture asynchrone du FileReader
    await new Promise(resolve => setTimeout(resolve, 100));
    flushSync();

    // Vérifier que le message d'erreur locale s'affiche
    expect(target.textContent).toContain('En-têtes obligatoires manquants');
    // Le bouton de soumission doit être désactivé
    const submitBtn = target.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    unmount(component);
  });

  it('should parse valid CSV file and display preview table with 5 rows', async () => {
    const target = document.createElement('div');
    const component = mount(PoonaImporter, {
      target,
      props: {}
    });
    flushSync();

    const csvContent = 'Licence;Saison;Nom;Prénom;Sexe;Date naissance;Type\n1000001;25-26;Dupont;Jean;M;01-01-1990;Competiteur';
    const file = new File([csvContent], 'members_valid.csv', { type: 'text/csv' });
    
    const input = target.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: true
    });
    input.dispatchEvent(new Event('change'));
    flushSync();

    await new Promise(resolve => setTimeout(resolve, 100));
    flushSync();

    // L'aperçu doit s'afficher
    expect(target.textContent).toContain('Aperçu des données');
    expect(target.textContent).toContain('1000001');
    expect(target.textContent).toContain('Dupont');
    expect(target.textContent).toContain('Jean');

    unmount(component);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run libs/features/members/ui/src/PoonaImporter.test.ts`
Expected: FAIL due to missing preview elements and local validation logic.

- [ ] **Step 3: Implement minimal code to parse, validate and display preview**

Modifier [PoonaImporter.svelte](file:///Users/david/Lab/nozay-bad/libs/features/members/ui/src/PoonaImporter.svelte) pour y intégrer :
1. Les en-têtes attendus en constantes.
2. Une fonction asynchrone `parseLocalCSV(file: File)` appelée lors du changement de fichier.
3. Le tableau d'aperçu dynamique (`Table.Root`) et le badge d'informations.

```html
<script lang="ts">
  import { Upload, AlertCircle, CheckCircle, RefreshCw, FileText } from 'lucide-svelte';
  import { Button, Card, Input, Alert, Table } from '@nba/ui';

  interface ImportResult {
    success: boolean;
    inserted: number;
    updated: number;
    errors: number;
  }

  let { result = null, error = null }: { result: ImportResult | null; error: string | null } = $props();

  let dragOver = $state(false);
  let selectedFile = $state<File | null>(null);
  let loading = $state(false);
  let formElement = $state<HTMLFormElement | null>(null);

  // Nouveaux états locaux pour la prévisualisation et la validation
  let csvPreview = $state<any[]>([]);
  let totalRows = $state(0);
  let separator = $state(';');
  let localError = $state<string | null>(null);

  const REQUIRED_HEADERS = ['Licence', 'Saison', 'Nom', 'Prénom', 'Sexe', 'Date naissance', 'Type'];

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      processFile(input.files[0]);
    }
  }

  function processFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      localError = "Le fichier doit être au format CSV (.csv uniquement).";
      selectedFile = null;
      csvPreview = [];
      return;
    }

    localError = null;
    selectedFile = file;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) {
        localError = "Le fichier CSV est vide.";
        return;
      }

      const headerLine = lines[0];
      const sep = headerLine.includes(';') ? ';' : ',';
      separator = sep;

      const headers = headerLine.split(sep).map(h => h.trim().replace(/^"(.*)"$/, '$1').trim().toLowerCase());
      
      // Vérifier les en-têtes requis
      const missing = REQUIRED_HEADERS.filter(req => 
        !headers.includes(req.toLowerCase()) && 
        !(req === 'Date naissance' && headers.includes('date de naissance')) &&
        !(req === 'Type' && headers.includes('tarif'))
      );

      if (missing.length > 0) {
        localError = `En-têtes obligatoires manquants : ${missing.join(', ')}`;
        return;
      }

      totalRows = lines.length - 1;

      // Extraire l'aperçu
      const previewRows: any[] = [];
      const licenceIdx = headers.findIndex(h => h === 'licence');
      const seasonIdx = headers.findIndex(h => h === 'saison');
      const lastNameIdx = headers.findIndex(h => h === 'nom');
      const firstNameIdx = headers.findIndex(h => h === 'prénom' || h === 'prenom');
      const genderIdx = headers.findIndex(h => h === 'sexe');
      const birthDateIdx = headers.findIndex(h => h === 'date naissance' || h === 'date de naissance');
      const typeIdx = headers.findIndex(h => h === 'type' || h === 'tarif');

      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const columns = lines[i].split(sep).map(col => col.trim().replace(/^"(.*)"$/, '$1').trim());
        previewRows.push({
          licence: columns[licenceIdx] || '',
          season: columns[seasonIdx] || '',
          lastName: columns[lastNameIdx] || '',
          firstName: columns[firstNameIdx] || '',
          gender: columns[genderIdx] || '',
          birthDate: columns[birthDateIdx] || '',
          type: columns[typeIdx] || ''
        });
      }
      csvPreview = previewRows;
    };
    reader.readAsText(file);
  }

  function handleSubmit(e: Event) {
    if (!selectedFile || localError) {
      e.preventDefault();
      return;
    }
    loading = true;
  }
</script>

<Card.Root class="max-w-xl mx-auto">
  <Card.Content class="p-6">
    {#if error}
      <Alert.Root variant="destructive" class="mb-6">
        <AlertCircle class="w-4 h-4" />
        <Alert.Title>Erreur d'importation</Alert.Title>
        <Alert.Description>{error}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if localError}
      <Alert.Root variant="destructive" class="mb-6">
        <AlertCircle class="w-4 h-4" />
        <Alert.Title>Erreur de format locale</Alert.Title>
        <Alert.Description>{localError}</Alert.Description>
      </Alert.Root>
    {/if}

    <!-- ... (garder le bloc d'affichage du résultat existant pour l'instant) ... -->

    <form method="POST" enctype="multipart/form-data" onsubmit={handleSubmit} bind:this={formElement}>
      <!-- ... Zone Dropzone existante ... -->
      <div
        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center min-h-[200px] cursor-pointer
        {dragOver ? 'border-primary bg-primary/5' : 'border-muted bg-background hover:bg-muted/10'}"
        ondragenter={handleDragOver}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onclick={() => formElement?.querySelector('input')?.click()}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && formElement?.querySelector('input')?.click()}
      >
        <Input
          type="file"
          name="file"
          accept=".csv"
          class="hidden"
          onchange={handleFileChange}
        />

        <Upload class="w-10 h-10 text-muted-foreground mb-4" />

        {#if selectedFile}
          <div class="flex items-center gap-2">
            <FileText class="w-5 h-5 text-primary" />
            <p class="font-semibold text-sm">{selectedFile.name}</p>
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            {(selectedFile.size / 1024).toFixed(1)} KB — {totalRows} ligne(s) détectée(s)
          </p>
        {:else}
          <p class="font-semibold text-sm">Sélectionnez un fichier CSV ou Glissez et déposez</p>
          <p class="text-xs text-muted-foreground mt-1">
            Fichier d'extraction Poona (.csv uniquement)
          </p>
        {/if}
      </div>

      <!-- Table de Prévisualisation -->
      {#if selectedFile && csvPreview.length > 0 && !localError}
        <div class="mt-6 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Aperçu des données (5 premières lignes)</h3>
            <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
              Séparateur : {separator === ';' ? 'Point-virgule' : 'Virgule'}
            </span>
          </div>
          <div class="border border-border rounded-md overflow-hidden bg-background">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head class="h-9 py-1 px-3">Licence</Table.Head>
                  <Table.Head class="h-9 py-1 px-3">Saison</Table.Head>
                  <Table.Head class="h-9 py-1 px-3">Nom</Table.Head>
                  <Table.Head class="h-9 py-1 px-3">Prénom</Table.Head>
                  <Table.Head class="h-9 py-1 px-3">Sexe</Table.Head>
                  <Table.Head class="h-9 py-1 px-3">Type</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each csvPreview as row}
                  <Table.Row class="hover:bg-muted/30">
                    <Table.Cell class="py-1.5 px-3 font-medium text-xs">{row.licence}</Table.Cell>
                    <Table.Cell class="py-1.5 px-3 text-xs text-muted-foreground">{row.season}</Table.Cell>
                    <Table.Cell class="py-1.5 px-3 text-xs font-semibold">{row.lastName}</Table.Cell>
                    <Table.Cell class="py-1.5 px-3 text-xs">{row.firstName}</Table.Cell>
                    <Table.Cell class="py-1.5 px-3 text-xs">{row.gender}</Table.Cell>
                    <Table.Cell class="py-1.5 px-3 text-xs text-muted-foreground">{row.type}</Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </div>
      {/if}

      <div class="mt-6 flex justify-end gap-3">
        {#if selectedFile}
          <Button
            type="button"
            variant="outline"
            onclick={() => { selectedFile = null; csvPreview = []; localError = null; }}
            disabled={loading}
          >
            Annuler
          </Button>
        {/if}

        <Button
          type="submit"
          disabled={!selectedFile || loading || !!localError}
          class="flex items-center justify-center gap-2"
        >
          {#if loading}
            <RefreshCw class="w-4 h-4 animate-spin" />
            Importation en cours...
          {:else}
            Lancer l'importation
          {/if}
        </Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run libs/features/members/ui/src/PoonaImporter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/features/members/ui/src/PoonaImporter.svelte libs/features/members/ui/src/PoonaImporter.test.ts
git commit -m "feat(members): add client-side CSV parsing, header validation, and data preview table"
```

---

### Task 2: Tableau de bord post-importation (Cartes KPI)

**Files:**
* Modify: `libs/features/members/ui/src/PoonaImporter.svelte`
* Modify: `libs/features/members/ui/src/PoonaImporter.test.ts`

**Interfaces:**
* Consumes: La prop `result` de type `ImportResult`.
* Produces: Affichage des cartes statistiques après importation réussie, remplaçant la zone d'alerte verte.

- [ ] **Step 1: Write tests in PoonaImporter.test.ts**

Ouvrir [PoonaImporter.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/members/ui/src/PoonaImporter.test.ts) et ajouter le test pour le résultat :

```typescript
  it('should render detailed KPI statistics cards when result prop is provided', () => {
    const target = document.createElement('div');
    const component = mount(PoonaImporter, {
      target,
      props: {
        result: {
          success: true,
          inserted: 12,
          updated: 5,
          errors: 2
        }
      }
    });
    flushSync();

    // Vérifier la présence des titres de cartes et des compteurs
    expect(target.textContent).toContain('Créations');
    expect(target.textContent).toContain('12');
    expect(target.textContent).toContain('Mises à jour');
    expect(target.textContent).toContain('5');
    expect(target.textContent).toContain('Rejets / Erreurs');
    expect(target.textContent).toContain('2');

    unmount(component);
  });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run libs/features/members/ui/src/PoonaImporter.test.ts`
Expected: FAIL due to missing cards component structure.

- [ ] **Step 3: Implement KPI Cards layout in PoonaImporter.svelte**

Ouvrir [PoonaImporter.svelte](file:///Users/david/Lab/nozay-bad/libs/features/members/ui/src/PoonaImporter.svelte) et importer les icônes nécessaires. Remplacer l'alerte verte simple par les trois cartes de statistiques :

```html
<script lang="ts">
  import { Upload, AlertCircle, CheckCircle, RefreshCw, FileText, UserPlus, RefreshCw as UpdateIcon, AlertTriangle } from 'lucide-svelte';
  // ... imports existants ...
</script>
```

Et dans le balisage :

```html
    {#if result}
      <div class="mb-6 space-y-4">
        <Alert.Root class="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle class="w-4 h-4" />
          <Alert.Title class="text-emerald-600 dark:text-emerald-400">Importation complétée</Alert.Title>
          <Alert.Description class="text-emerald-600 dark:text-emerald-400 text-xs">
            Le traitement du fichier CSV Poona s'est terminé avec succès.
          </Alert.Description>
        </Alert.Root>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Créations -->
          <Card.Root class="bg-emerald-500/5 border-emerald-500/20 shadow-none">
            <Card.Content class="p-4 flex items-center justify-between">
              <div>
                <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Créations</span>
                <p class="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{result.inserted}</p>
              </div>
              <div class="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                <UserPlus class="w-5 h-5" />
              </div>
            </Card.Content>
          </Card.Root>

          <!-- Mises à jour -->
          <Card.Root class="bg-blue-500/5 border-blue-500/20 shadow-none">
            <Card.Content class="p-4 flex items-center justify-between">
              <div>
                <span class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Mises à jour</span>
                <p class="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{result.updated}</p>
              </div>
              <div class="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                <UpdateIcon class="w-5 h-5" />
              </div>
            </Card.Content>
          </Card.Root>

          <!-- Rejets / Erreurs -->
          <Card.Root class="bg-destructive/5 border-destructive/20 shadow-none">
            <Card.Content class="p-4 flex items-center justify-between">
              <div>
                <span class="text-xs font-semibold text-destructive uppercase tracking-wider">Rejets</span>
                <p class="text-2xl font-bold text-destructive mt-1">{result.errors}</p>
              </div>
              <div class="p-2 bg-destructive/10 rounded-lg text-destructive">
                <AlertTriangle class="w-5 h-5" />
              </div>
            </Card.Content>
          </Card.Root>
        </div>
      </div>
    {/if}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run libs/features/members/ui/src/PoonaImporter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/features/members/ui/src/PoonaImporter.svelte libs/features/members/ui/src/PoonaImporter.test.ts
git commit -m "feat(members): implement detailed KPI stats cards for Poona import results"
```
