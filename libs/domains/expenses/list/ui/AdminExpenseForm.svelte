<script lang="ts">
  import { Receipt } from '@lucide/svelte';
  import { FormField, FormSheet, SearchableCombobox, submitForm } from '@nba/ui';
  import type { Member, Props } from '../../create/ui/expense-form-types';
  import { formatMemberName, scrollOptionIntoView } from '../../create/ui/expense-form-utils';
  import ExpenseFormDetails from '../../create/ui/ExpenseFormDetails.svelte';
  import ExpenseFormFileInput from '../../create/ui/ExpenseFormFileInput.svelte';

  let {
    open = $bindable(false),
    activeSeasonId,
    members = [],
    categories = []
  }: Props & { open?: boolean } = $props();

  let category = $state('');
  let description = $state('');
  let amountStr = $state('');
  let photoUrl = $state<string | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let selectedMemberId = $state<string | number | undefined>(undefined);

  let submitting = $state(false);
  let errorMsg = $state<string | null>(null);

  const visibleCategories = $derived(
    categories.filter((c) => !c.hideInExpenses).map((c) => ({ value: c.id, label: c.adherentLabel }))
  );

  $effect(() => {
    if (visibleCategories.length > 0 && !category) category = visibleCategories[0].value;
  });

  /*
    Le choix du demandeur passait par une liste déroulante écrite à la main — `<input>`,
    panneau absolu, navigation au clavier, fermeture au `blur` différée de 200 ms. Au
    doigt, ce panneau s'ouvrait sous le clavier logiciel, qui le recouvrait aussitôt.
  */
  const memberItems = $derived(
    [...members]
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
      .map((m) => ({ label: `${formatMemberName(m)} (${m.licence})`, value: m.id }))
  );

  const emitterName = $derived(
    members.find((m) => String(m.id) === String(selectedMemberId))
      ? formatMemberName(members.find((m) => String(m.id) === String(selectedMemberId))!)
      : ''
  );

  function validate(): string | null {
    if (!selectedMemberId) return 'Sélectionnez le demandeur.';
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return 'Montant invalide.';
    if (!photoUrl) return 'Le justificatif est obligatoire.';
    return null;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = null;
    submitting = true;

    await submitForm({
      validate,
      submit: async () => {
        // Le relais du domaine, et non la page hôte.
        const res = await fetch('/admin/api/expenses/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'expense',
            data: {
              seasonId: activeSeasonId,
              description,
              category,
              // `amount`, et non `amountCents` : le validateur de l'API n'accepte que ce
              // nom depuis qu'il a cessé de tolérer `amountCents || amount`. Ce
              // durcissement n'avait corrigé que le formulaire adhérent — celui-ci
              // envoyait un champ hors contrat, et toute création échouait en 400.
              amount: Math.round(parseFloat(amountStr) * 100),
              photoUrl,
              memberId: Number(selectedMemberId),
              emitterName
            }
          })
        });
        const resData = await res.json() as any;
        if (!res.ok || !resData.success) {
          throw new Error(resData.error || "Erreur lors de la création de la note de frais.");
        }
        return resData.message as string | undefined;
      },
      success: (message) => message || "Note de frais créée.",
      close: () => (open = false),
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => { errorMsg = message; }
    });

    submitting = false;
  }
</script>

<!--
  La coquille commune des formulaires de l'admin : au doigt, ses actions vivent dans la
  barre de navigation, là où le clavier recouvrait « Valider ».
-->
<FormSheet
  bind:open
  title="Créer une note de frais"
  icon={Receipt}
  error={errorMsg}
  isSubmitting={submitting}
  submitLabel="Créer la note"
  submittingLabel="Création…"
  onSubmit={handleSubmit}
>
  <FormField id="expense-member-input" label="Demandeur (adhérent)">
    <SearchableCombobox
      id="expense-member-input"
      items={memberItems}
      bind:value={selectedMemberId}
      placeholder="Choisir un adhérent…"
      searchPlaceholder="Nom ou licence…"
      emptyText="Aucun adhérent trouvé."
    />
  </FormField>

  <ExpenseFormDetails bind:category bind:amountStr bind:description {visibleCategories} />

  <ExpenseFormFileInput bind:photoUrl bind:fileInput onError={(msg) => (errorMsg = msg)} />
</FormSheet>
