<script lang="ts">
  import { UploadCloud, FileText, CheckCircle, AlertCircle, Coins, Image, User } from 'lucide-svelte';

  interface Props {
    activeSeasonId: string;
  }

  const { activeSeasonId }: Props = $props();

  let emitterName = $state('');
  let category = $state('deplacement');
  let description = $state('');
  let amountStr = $state('');
  let photoUrl = $state<string | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);

  let submitting = $state(false);
  let successMsg = $state<string | null>(null);
  let errorMsg = $state<string | null>(null);

  const categories = [
    { value: 'deplacement', label: 'Déplacement (km, péage, train...)' },
    { value: 'materiel', label: 'Matériel & Fournitures' },
    { value: 'alimentation', label: 'Repas & Convivialité' },
    { value: 'autre', label: 'Autre' }
  ];

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      errorMsg = "Le fichier est trop volumineux (max 800 Ko pour le stockage D1).";
      target.value = '';
      return;
    }

    errorMsg = null;
    const reader = new FileReader();
    reader.onload = () => {
      photoUrl = reader.result as string;
    };
    reader.onerror = () => {
      errorMsg = "Erreur lors de la lecture du justificatif.";
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = null;
    successMsg = null;

    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errorMsg = "Veuillez saisir un montant supérieur à 0 €.";
      return;
    }

    if (!photoUrl) {
      errorMsg = "Une photo du justificatif est obligatoire pour le remboursement.";
      return;
    }

    submitting = true;

    try {
      const res = await fetch('', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'expense',
          data: {
            seasonId: activeSeasonId,
            description,
            category,
            amount: Math.round(parsedAmount * 100), // convert to cents
            photoUrl,
            emitterName
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Une erreur est survenue lors de l'envoi de la note de frais.");
      }

      successMsg = "Votre note de frais a été soumise avec succès ! Le trésorier procédera à sa validation et remboursement.";
      
      // Reset form
      emitterName = '';
      category = 'deplacement';
      description = '';
      amountStr = '';
      photoUrl = null;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      errorMsg = err.message || "Une erreur est survenue.";
    } finally {
      submitting = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden mt-6">
  <div class="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white flex items-center gap-4">
    <div class="bg-white/10 p-3 rounded-xl backdrop-blur-md">
      <Coins class="w-7 h-7 text-white" />
    </div>
    <div>
      <h2 class="text-xl font-bold tracking-tight">Saisir une note de frais</h2>
      <p class="text-xs text-white/80 mt-1">Soumettez vos dépenses engagées pour le compte de l'association.</p>
    </div>
  </div>

  <form onsubmit={handleSubmit} class="p-6 space-y-5">
    {#if successMsg}
      <div class="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl flex items-start gap-2.5">
        <CheckCircle class="w-5 h-5 shrink-0 mt-0.5" />
        <span>{successMsg}</span>
      </div>
    {/if}

    {#if errorMsg}
      <div class="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-start gap-2.5">
        <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
        <span>{errorMsg}</span>
      </div>
    {/if}

    <div class="space-y-1.5">
      <label for="emitterName" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Votre Nom & Prénom</label>
      <div class="relative">
        <input
          type="text"
          id="emitterName"
          bind:value={emitterName}
          placeholder="Ex: Marie Curie"
          class="w-full pl-10 pr-4 py-2.5 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          required
        />
        <User class="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <label for="category" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Catégorie de dépense</label>
        <select
          id="category"
          bind:value={category}
          class="w-full px-3 py-2.5 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
        >
          {#each categories as cat}
            <option value={cat.value}>{cat.label}</option>
          {/each}
        </select>
      </div>

      <div class="space-y-1.5">
        <label for="amount" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant (€)</label>
        <input
          type="number"
          id="amount"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          bind:value={amountStr}
          class="w-full px-3 py-2.5 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
          required
        />
      </div>
    </div>

    <div class="space-y-1.5">
      <label for="description" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Description / Motif des frais</label>
      <textarea
        id="description"
        bind:value={description}
        rows="3"
        placeholder="Ex: Achat de volants de compétition pour le tournoi régional."
        class="w-full px-3 py-2.5 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
        required
      ></textarea>
    </div>

    <div class="space-y-1.5">
      <span class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Justificatif (reçu, facture...)</span>
      
      <div class="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-4 bg-muted/10 cursor-pointer relative">
        <input
          type="file"
          id="receipt"
          accept="image/*"
          bind:this={fileInput}
          onchange={handleFileChange}
          class="absolute inset-0 opacity-0 cursor-pointer z-10"
        />
        
        {#if photoUrl}
          <div class="flex flex-col items-center space-y-2 py-2">
            <img src={photoUrl} alt="Aperçu du justificatif" class="max-h-40 rounded-lg shadow-md border border-border object-contain" />
            <span class="text-xs text-muted-foreground font-semibold">Justificatif chargé</span>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center py-4 text-center">
            <UploadCloud class="w-10 h-10 text-muted-foreground mb-2" />
            <span class="text-sm font-semibold text-foreground">Cliquez ou glissez-déposez la photo</span>
            <span class="text-xs text-muted-foreground mt-1">PNG, JPG jusqu'à 800 Ko</span>
          </div>
        {/if}
      </div>
    </div>

    <button
      type="submit"
      disabled={submitting}
      class="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0 mt-4"
    >
      {#if submitting}
        <span class="animate-pulse">Soumission en cours...</span>
      {:else}
        <CheckCircle class="w-4 h-4" />
        Soumettre la note de frais
      {/if}
    </button>
  </form>
</div>
