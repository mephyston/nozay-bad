<script lang="ts">
  import { CheckCircle, UserPlus, RefreshCw, AlertTriangle } from '@lucide/svelte';
  import { Card, Alert } from '@nba/ui';
  import type { ImportResult } from './poona-importer-types';

  let { result }: { result: ImportResult } = $props();
</script>

<div class="mb-6 space-y-4">
  <Alert.Root variant="success">
    <CheckCircle class="w-4 h-4" />
    <Alert.Title class="text-success">Importation complétée</Alert.Title>
    <Alert.Description class="text-success text-xs">
      Le traitement du fichier CSV Poona s'est terminé avec succès.
    </Alert.Description>
  </Alert.Root>

  <div class="grid grid-cols-1 {result.errors > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4">
    <!-- Créations -->
    <Card.Root class="bg-success/10 border-success/20 shadow-none">
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xs font-semibold text-success uppercase tracking-wider">Créations</span>
          <p class="text-2xl font-bold text-success mt-1">{result.inserted}</p>
        </div>
        <div class="p-2 bg-success/10 rounded-lg text-success">
          <UserPlus class="w-5 h-5" />
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Mises à jour -->
    <Card.Root class="bg-info/10 border-info/20 shadow-none">
      <Card.Content class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xs font-semibold text-info uppercase tracking-wider">Mises à jour</span>
          <p class="text-2xl font-bold text-info mt-1">{result.updated}</p>
        </div>
        <div class="p-2 bg-info/10 rounded-lg text-info">
          <RefreshCw class="w-5 h-5" />
        </div>
      </Card.Content>
    </Card.Root>

    {#if result.errors > 0}
      <!-- Rejets / Erreurs -->
      <Card.Root class="bg-destructive/5 border-destructive/20 shadow-none">
        <Card.Content class="p-4 flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-destructive uppercase tracking-wider">Rejets / Erreurs</span>
            <p class="text-2xl font-bold text-destructive mt-1">{result.errors}</p>
          </div>
          <div class="p-2 bg-destructive/10 rounded-lg text-destructive">
            <AlertTriangle class="w-5 h-5" />
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>
</div>
