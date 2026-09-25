<script lang="ts">
  import { Input, FormField, SearchableCombobox } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';
  import { DEPOSIT_MONTH_OPTIONS } from '../../../shared/deposit-month';

  interface Props {
    depositState: CheckDepositState;
  }

  let { depositState }: Props = $props();

  /*
    L'adhérent est facultatif : « aucun » devient une option du choix plutôt qu'un bouton
    d'effacement, que l'écran de choix plein cadre n'a pas d'endroit où poser.
  */
  const memberOptions = $derived([
    { value: '', label: 'Aucun adhérent' },
    ...depositState.memberItems
  ]);

  const monthOptions = [
    { value: '', label: 'Dès que possible' },
    ...DEPOSIT_MONTH_OPTIONS.map((mois) => ({ value: String(mois.value), label: mois.label }))
  ];
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField id="check-num" label="N° de chèque (7 chiffres)">
      <Input
        id="check-num"
        type="text"
        bind:value={depositState.checkNumber}
        placeholder="Ex: 1234567"
        required
      />
      </FormField>
      <FormField id="check-amt" label="Montant (€)">
      <Input
        id="check-amt"
        type="number"
        step="0.01"
        bind:value={depositState.checkAmount}
        placeholder="Ex: 150.00"
        required
        class="font-outfit tabular-nums"
      />
    </FormField>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField id="check-emitter" label="Émetteur (Nom sur le chèque)">
      <Input
        id="check-emitter"
        type="text"
        bind:value={depositState.checkEmitter}
        placeholder="Ex: Dupont Marc"
        required
      />
      </FormField>
      <FormField id="check-bank" label="Banque (optionnel)">
      <Input
        id="check-bank"
        type="text"
        bind:value={depositState.checkBank}
        placeholder="Ex: LCL, SG..."
      />
    </FormField>
  </div>

  <!--
    Les trois choix passent par `SearchableCombobox` : au doigt, un écran dédié avec sa
    recherche ; à la souris, un menu ancré. Les autocomplétions maison qui vivaient ici
    dépliaient une liste flottante sous un champ que le clavier recouvrait aussitôt.
  -->
  <FormField id="check-member-input" label="Adhérent concerné (pour rapprochement cotisation)">
    <SearchableCombobox
      id="check-member-input"
      items={memberOptions}
      bind:value={depositState.checkMemberId}
      placeholder="Aucun adhérent"
      searchPlaceholder="Nom, licence ou parent…"
      emptyText="Aucun adhérent trouvé."
      onValueChange={() => (depositState.matchedMemberName = '')}
    />
  </FormField>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <FormField id="check-cat-input" label="Affectation / Catégorie">
      <SearchableCombobox
        id="check-cat-input"
        items={depositState.categoryItems}
        bind:value={depositState.checkCategory}
        placeholder="Choisir une catégorie"
        searchPlaceholder="Rechercher une catégorie…"
        emptyText="Aucune catégorie trouvée."
      />
    </FormField>

      <FormField id="check-date" label="Date d'émission">
      <Input
        id="check-date"
        type="date"
        bind:value={depositState.checkDate}
        required
      />
    </FormField>
  </div>

  <!--
    Une consigne, pas un rattachement : « à remettre en novembre » se note ici, et le
    tableau des chèques en attente se trie dessus, de septembre à août. Le bordereau ne
    le lit pas — on remet ce qu'on coche.
  -->
  <FormField id="check-planned-month" label="Remise prévue (indicatif)">
    <SearchableCombobox
      id="check-planned-month"
      items={monthOptions}
      bind:value={depositState.checkPlannedDepositMonth}
      placeholder="Dès que possible"
      searchPlaceholder="Rechercher un mois…"
    />
  </FormField>
</div>
