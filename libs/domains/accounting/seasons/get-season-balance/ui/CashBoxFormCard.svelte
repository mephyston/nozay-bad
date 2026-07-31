<script lang="ts">
  import { Plus, Check, AlertCircle } from '@lucide/svelte';
  import { Button, Input, Alert, FormField } from '@nba/ui';

  let {
    type = $bindable<'recette' | 'depense'>('recette'),
    amount = $bindable(''),
    date = $bindable(''),
    category = $bindable('evenements_buvettes'),
    description = $bindable(''),
    isClosed,
    isSubmitting,
    errorMsg,
    successMsg,
    onSubmit
  }: {
    type: 'recette' | 'depense';
    amount: string;
    date: string;
    category: string;
    description: string;
    isClosed: boolean;
    isSubmitting: boolean;
    errorMsg: string;
    successMsg: string;
    onSubmit: (e: Event) => void;
  } = $props();
</script>

<div class="space-y-4">
    {#if errorMsg}
      <Alert.Root variant="destructive">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <Alert.Description>{errorMsg}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if successMsg}
      <Alert.Root variant="success">
        <Check class="w-4 h-4 shrink-0" />
        <Alert.Description>{successMsg}</Alert.Description>
      </Alert.Root>
    {/if}

    <form onsubmit={onSubmit} class="space-y-4">
        <FormField id="type" label="Type de transaction">
        <select
          id="type"
          bind:value={type}
          disabled={isClosed}
          onchange={() => {
            category = type === 'recette' ? 'evenements_buvettes' : 'evenements_club';
          }}
          class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        >
          <option value="recette">Entrée (Recette - ex: Vente buvette)</option>
          <option value="depense">Sortie (Dépense - ex: Achat boissons)</option>
        </select>
      </FormField>

      <div class="grid grid-cols-2 gap-4">
          <FormField id="amount" label="Montant (€)">
          <Input
            type="number"
            id="amount"
            step="0.01"
            min="0"
            placeholder="0.00"
            bind:value={amount}
            required
            disabled={isClosed}
          />
          </FormField>
          <FormField id="date" label="Date">
          <Input
            type="date"
            id="date"
            bind:value={date}
            required
            disabled={isClosed}
          />
        </FormField>
      </div>

        <FormField id="category" label="Catégorie">
        <select
          id="category"
          bind:value={category}
          disabled={isClosed}
          class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        >
          {#if type === 'recette'}
            <option value="evenements_buvettes">Événements & Buvette</option>
            <option value="boutique">Boutique & Cordages</option>
            <option value="adhesions_inscriptions">Adhésion & Cotisation</option>
            <option value="divers_recette">Divers Recette</option>
          {:else}
            <option value="evenements_club">Événements & Buvette (achats)</option>
            <option value="materiel_club">Matériel club</option>
            <option value="divers_depense">Divers Dépense</option>
          {/if}
        </select>
      </FormField>

        <FormField id="description" label="Description / Motif">
        <Input
          type="text"
          id="description"
          placeholder="Ex: Recette buvette tournoi Jeunes"
          bind:value={description}
          required
          disabled={isClosed}
        />
      </FormField>

      <Button
        type="submit"
        disabled={isSubmitting || isClosed}
        class="w-full font-semibold"
      >
        {isSubmitting ? 'Enregistrement...' : 'Enregistrer le mouvement'}
      </Button>
    </form>
</div>
