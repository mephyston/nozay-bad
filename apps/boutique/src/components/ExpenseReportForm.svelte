<script lang="ts">
  import { UploadCloud, FileText, CheckCircle, AlertCircle, Coins, Image, User, Search, ChevronDown, Check } from 'lucide-svelte';
  import { Button, Card, Input, Label, Badge } from '@metacult/shared-ui';

  interface Member {
    id: number;
    firstName: string;
    lastName: string;
    licence: string;
  }

  interface Props {
    activeSeasonId: string;
    members?: Member[];
    categories?: {
      id: string;
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
    }[];
  }

  const { activeSeasonId, members = [], categories = [] }: Props = $props();

  let emitterName = $state('');
  let category = $state('');
  let description = $state('');
  let amountStr = $state('');
  let photoUrl = $state<string | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);

  let selectedMemberId = $state('');
  let memberSearchQuery = $state('');
  let isMemberDropdownOpen = $state(false);
  let highlightedIndex = $state(-1);

  let submitting = $state(false);
  let successMsg = $state<string | null>(null);
  let errorMsg = $state<string | null>(null);

  const fallbackCategories = [
    { value: 'fonctionnement_administratif', label: 'Frais de fonctionnement & administratif' },
    { value: 'materiel_club', label: 'Matériel (hors cordages)' },
    { value: 'volants', label: 'Volants (vente ou achat)' },
    { value: 'evenements_buvettes', label: 'Evénements & Buvettes' },
    { value: 'championnats', label: 'Championnats (frais équipes)' },
    { value: 'stages_formations', label: 'Stages & Formations' },
    { value: 'adhesions_inscriptions', label: 'Adhésions & Inscriptions' },
    { value: 'sponsoring', label: 'Sponsoring' },
    { value: 'subventions', label: 'Subventions (aides publiques)' },
    { value: 'actions_jeunes', label: 'Actions Jeunes (stages jeunes...)' },
    { value: 'tournois_senior', label: 'Tournois Senior' },
    { value: 'cordage_vente', label: 'Cordage (vente aux adhérents)' }
  ];

  const visibleCategories = $derived(
    categories && categories.length > 0
      ? categories
          .filter(c => !c.hideInExpenses)
          .map(c => ({ value: c.id, label: c.adherentLabel }))
      : fallbackCategories
  );

  $effect(() => {
    if (visibleCategories.length > 0 && !category) {
      category = visibleCategories[0].value;
    }
  });

  // Derived member lists for dropdown
  const filteredMembers = $derived(
    memberSearchQuery.trim() === ''
      ? members
      : members.filter(m => 
          `${m.lastName} ${m.firstName}`.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
          m.licence.toLowerCase().includes(memberSearchQuery.toLowerCase())
        )
  );

  const selectedMember = $derived(
    members.find(m => m.id.toString() === selectedMemberId) || null
  );

  const memberDisplayVal = $derived(
    selectedMember ? `${selectedMember.lastName} ${selectedMember.firstName}` : ''
  );

  // Clamp highlightedIndex when filteredMembers changes
  $effect(() => {
    if (highlightedIndex >= filteredMembers.length) {
      highlightedIndex = filteredMembers.length - 1;
    }
  });

  function selectMember(m: Member) {
    selectedMemberId = m.id.toString();
    memberSearchQuery = `${m.lastName} ${m.firstName}`;
    emitterName = `${m.lastName} ${m.firstName}`;
    isMemberDropdownOpen = false;
    highlightedIndex = -1;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isMemberDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        isMemberDropdownOpen = true;
        highlightedIndex = 0;
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      highlightedIndex = (highlightedIndex + 1) % filteredMembers.length;
      e.preventDefault();
      scrollOptionIntoView(highlightedIndex);
    } else if (e.key === 'ArrowUp') {
      highlightedIndex = (highlightedIndex - 1 + filteredMembers.length) % filteredMembers.length;
      e.preventDefault();
      scrollOptionIntoView(highlightedIndex);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredMembers.length) {
        selectMember(filteredMembers[highlightedIndex]);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      isMemberDropdownOpen = false;
      e.preventDefault();
    }
  }

  function scrollOptionIntoView(index: number) {
    setTimeout(() => {
      const container = document.getElementById('expense-member-listbox');
      const option = document.getElementById(`expense-member-option-${index}`);
      if (container && option) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const optionTop = option.offsetTop;
        const optionBottom = optionTop + option.clientHeight;

        if (optionTop < containerTop) {
          container.scrollTop = optionTop;
        } else if (optionBottom > containerBottom) {
          container.scrollTop = optionBottom - container.clientHeight;
        }
      }
    }, 0);
  }

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

    if (!selectedMemberId) {
      errorMsg = "Veuillez sélectionner un demandeur dans la liste.";
      return;
    }

    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errorMsg = "Veuillez saisir un montant supérieur à 0 €.";
      return;
    }

    if (!photoUrl) {
      errorMsg = "Une photo du justificatif est obligatoire pour le remboursement.";
      return;
    }

    // Retrieve Turnstile response token (bypassed in test environment)
    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const turnstileResponse = isTest
      ? 'mock-test-token'
      : (document.getElementsByName('cf-turnstile-response')[0] as HTMLInputElement)?.value;
    if (!turnstileResponse) {
      errorMsg = "Veuillez valider le test de sécurité anti-bot.";
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
            emitterName,
            memberId: parseInt(selectedMemberId)
          },
          turnstileToken: turnstileResponse
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Une erreur est survenue lors de l'envoi de la note de frais.");
      }

      successMsg = "Votre note de frais a été soumise avec succès ! Le trésorier procédera à sa validation et remboursement.";
      
      // Reset form
      emitterName = '';
      selectedMemberId = '';
      memberSearchQuery = '';
      category = visibleCategories[0]?.value || 'fonctionnement_administratif';
      description = '';
      amountStr = '';
      photoUrl = null;
      if (fileInput) fileInput.value = '';

      // Reset Turnstile widget on success
      if (typeof window !== 'undefined' && (window as any).turnstile) {
        (window as any).turnstile.reset();
      }
    } catch (err: any) {
      errorMsg = err.message || "Une erreur est survenue.";
      // Reset Turnstile widget on failure
      if (typeof window !== 'undefined' && (window as any).turnstile) {
        (window as any).turnstile.reset();
      }
    } finally {
      submitting = false;
    }
  }
</script>

<Card.Root class="max-w-2xl mx-auto shadow-xl mt-6">
  <Card.Header class="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white flex flex-row items-center gap-4 rounded-t-xl">
    <div class="bg-white/10 p-3 rounded-xl backdrop-blur-md">
      <Coins class="w-7 h-7 text-white" />
    </div>
    <div>
      <Card.Title class="text-xl font-bold tracking-tight text-white">Saisir une note de frais</Card.Title>
      <p class="text-xs text-white/80 mt-1">Soumettez vos dépenses engagées pour le compte de l'association.</p>
    </div>
  </Card.Header>

  <Card.Content class="p-6">
    <form onsubmit={handleSubmit} class="space-y-5">
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

      <!-- Searchable Member Combobox Dropdown -->
      <div class="space-y-1.5 relative">
        <Label for="expense-member-input" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Demandeur (Adhérent)</Label>
        <div class="relative">
          <Search class="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground z-10" />
          <Input
            id="expense-member-input"
            type="text"
            role="combobox"
            aria-expanded={isMemberDropdownOpen}
            aria-autocomplete="list"
            aria-controls="expense-member-listbox"
            aria-activedescendant={highlightedIndex >= 0 ? `expense-member-option-${highlightedIndex}` : undefined}
            placeholder="Rechercher votre nom (Nom, Prénom, Licence...)"
            class="w-full pl-10 pr-10 h-10 rounded-xl font-semibold"
            value={isMemberDropdownOpen ? memberSearchQuery : memberDisplayVal}
            oninput={(e) => {
              isMemberDropdownOpen = true;
              memberSearchQuery = (e.target as HTMLInputElement).value;
            }}
            onfocus={(e) => {
              isMemberDropdownOpen = true;
              if (selectedMember) {
                memberSearchQuery = `${selectedMember.lastName} ${selectedMember.firstName}`;
              } else {
                memberSearchQuery = '';
              }
              (e.target as HTMLInputElement).select();
            }}
            onblur={() => {
              // Delay to allow onmousedown selection of options
              setTimeout(() => { isMemberDropdownOpen = false; }, 200);
            }}
            onkeydown={handleKeyDown}
            required
          />
          <ChevronDown class="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>

        {#if isMemberDropdownOpen}
          <div
            role="listbox"
            id="expense-member-listbox"
            class="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl divide-y divide-border"
          >
            {#each filteredMembers as m, index}
              <button
                type="button"
                role="option"
                aria-selected={selectedMemberId === m.id.toString()}
                id={`expense-member-option-${index}`}
                class="w-full text-left px-4 py-2.5 text-sm transition-colors font-semibold border-0 cursor-pointer {index === highlightedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-foreground'}"
                onmousedown={() => {
                  selectMember(m);
                }}
              >
                <div class="flex justify-between items-center">
                  <span>{m.lastName} {m.firstName}</span>
                  <Badge variant="outline" class="font-mono">Licence: {m.licence}</Badge>
                </div>
              </button>
            {:else}
              <div class="px-4 py-3 text-sm text-muted-foreground italic bg-popover">Aucun adhérent trouvé</div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <Label for="category" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Catégorie de dépense</Label>
          <select
            id="category"
            bind:value={category}
            class="w-full px-3 h-10 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            {#each visibleCategories as cat}
              <option value={cat.value}>{cat.label}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-1.5">
          <Label for="amount" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant (€)</Label>
          <Input
            type="number"
            id="amount"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            bind:value={amountStr}
            class="w-full h-10 rounded-xl font-semibold"
            required
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <Label for="description" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Description / Motif des frais</Label>
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

      <div class="flex justify-center my-4">
        <div class="cf-turnstile" data-sitekey="0x4AAAAAAD1TY7I_ql47XOjI" data-action="turnstile-spin-v1"></div>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        class="w-full h-auto py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg border-0 mt-4"
      >
        {#if submitting}
          <span class="animate-pulse">Soumission en cours...</span>
        {:else}
          <CheckCircle data-icon="inline-start" />
          Soumettre la note de frais
        {/if}
      </Button>
    </form>
  </Card.Content>
</Card.Root>
