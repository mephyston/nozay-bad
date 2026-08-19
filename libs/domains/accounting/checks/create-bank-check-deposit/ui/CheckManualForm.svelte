<script lang="ts">
  import { Button, Input, FormField } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';

  interface Props {
    depositState: CheckDepositState;
  }

  let { depositState }: Props = $props();
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

    <FormField id="check-member-input" label="Adhérent concerné (pour rapprochement cotisation)">
    <div class="relative">
      <Input
        id="check-member-input"
        type="text"
        placeholder="🔍 Rechercher un adhérent par nom ou licence..."
        class="pr-8 font-medium"
        value={depositState.isMemberDropdownOpen ? depositState.memberSearchQuery : depositState.memberDisplayVal}
        oninput={(e) => {
          depositState.isMemberDropdownOpen = true;
          depositState.memberSearchQuery = (e.target as HTMLInputElement).value;
        }}
        onfocus={() => {
          depositState.isMemberDropdownOpen = true;
          depositState.memberSearchQuery = '';
        }}
        onblur={() => {
          setTimeout(() => { depositState.isMemberDropdownOpen = false; }, 200);
        }}
      />
      {#if depositState.checkMemberId}
        <Button
          variant="ghost"
          size="icon-xs"
          onclick={() => {
            depositState.checkMemberId = '';
            depositState.memberSearchQuery = '';
            depositState.matchedMemberName = '';
          }}
          class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Effacer la sélection"
        >
          ✕
        </Button>
      {/if}

    {#if depositState.isMemberDropdownOpen}
      <div class="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg divide-y divide-border">
        {#each depositState.memberOptions as member}
          <Button
            variant="ghost"
            class="w-full text-left justify-start rounded-none px-3 py-2 text-sm hover:bg-muted text-foreground transition-colors font-medium border-0 cursor-pointer bg-popover"
            onmousedown={() => {
              depositState.checkMemberId = member.id.toString();
              depositState.memberSearchQuery = `${member.lastName} ${member.firstName} (${member.licence})`;
              depositState.isMemberDropdownOpen = false;
            }}
          >
            {member.lastName} {member.firstName} ({member.licence})
            {member.parent1Name ? ` - Parent: ${member.parent1Name}` : ''}
          </Button>
        {:else}
          <div class="px-3 py-2 text-xs text-muted-foreground italic bg-popover">Aucun adhérent trouvé</div>
        {/each}
      </div>
    {/if}
  </div>
  </FormField>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField id="check-cat-input" label="Affectation / Catégorie">
      <div class="relative">
        <Input
          id="check-cat-input"
          type="text"
          placeholder="Filtrer les affectations..."
          class="pr-6 font-medium"
          value={depositState.isCategoryDropdownOpen ? depositState.categorySearchQuery : depositState.categoryDisplayVal}
          oninput={(e) => {
            depositState.isCategoryDropdownOpen = true;
            depositState.categorySearchQuery = (e.target as HTMLInputElement).value;
          }}
          onfocus={() => {
            depositState.isCategoryDropdownOpen = true;
            depositState.categorySearchQuery = '';
          }}
          onblur={() => {
            setTimeout(() => { depositState.isCategoryDropdownOpen = false; }, 200);
          }}
        />
        <span class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-[8px]">▼</span>

      {#if depositState.isCategoryDropdownOpen}
        <div class="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg divide-y divide-border">
          {#each depositState.filteredCategories as cat}
            <Button
              variant="ghost"
              class="w-full text-left justify-start rounded-none px-3 py-2 text-sm hover:bg-muted text-foreground transition-colors font-medium border-0 cursor-pointer bg-popover"
              onmousedown={() => {
                depositState.checkCategory = cat.id;
                depositState.categorySearchQuery = cat.name;
                depositState.isCategoryDropdownOpen = false;
              }}
            >
              {cat.name}
            </Button>
          {:else}
            <div class="px-3 py-2 text-xs text-muted-foreground italic bg-popover">Aucune catégorie trouvée</div>
          {/each}
        </div>
      {/if}
    </div>
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
</div>
