<script lang="ts">
  import { Plus, Check, AlertCircle } from '@lucide/svelte';
  import { Button, Input, Alert, FormField, SearchableCombobox } from '@nba/ui';

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
        <SearchableCombobox
          id="type"
          items={[{ label: 'Entrée (Recette - ex: Vente buvette)', value: 'recette' }, { label: 'Sortie (Dépense - ex: Achat boissons)', value: 'depense' }]}
          bind:value={type}
          disabled={isClosed}
          onValueChange={() => { category = type === 'recette' ? 'evenements_buvettes' : 'evenements_club'; }}
        />
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
        <SearchableCombobox
          id="category"
          items={type === 'recette' ? [{ label: 'Événements & Buvette', value: 'evenements_buvettes' }, { label: 'Boutique & Cordages', value: 'boutique' }, { label: 'Adhésion & Cotisation', value: 'adhesions_inscriptions' }, { label: 'Divers Recette', value: 'divers_recette' }] : [{ label: 'Événements & Buvette (achats)', value: 'evenements_club' }, { label: 'Matériel club', value: 'materiel_club' }, { label: 'Divers Dépense', value: 'divers_depense' }]}
          bind:value={category}
          disabled={isClosed}
        />
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
