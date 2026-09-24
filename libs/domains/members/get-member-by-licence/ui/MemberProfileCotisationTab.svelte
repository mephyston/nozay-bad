<script lang="ts">
  import { Landmark } from '@lucide/svelte';
  import { Card, Amount, Badge } from '@nba/ui';
  import type { Member } from './member-profile-types';

  let { member }: { member: Member } = $props();

  const dueCents = $derived((member as any).amountDueCents ?? member.amountDue ?? 0);
  const receivedCents = $derived((member as any).amountReceivedCents ?? member.amountReceived ?? 0);
  const remainingCents = $derived((member as any).amountRemainingCents ?? member.amountRemaining ?? (dueCents - receivedCents));

  const progressPercent = $derived(dueCents > 0 ? Math.min(100, Math.round((receivedCents / dueCents) * 100)) : 0);
</script>

<Card.Root>
  <Card.Content class="p-6 space-y-6">
    <!--
      L'état du règlement coiffe les montants qui l'expliquent. Il vivait dans l'en-tête
      de la fiche, où il pesait autant que le nom de l'adhérent : c'est un fait qui se
      lit en un mot, et il annonçait « réglée » loin des trois chiffres qui le disent.
    -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
      <h3 class="font-bold text-lg flex items-center gap-2 text-foreground">
        <Landmark class="w-5 h-5 text-primary" />
        État financier de la cotisation (Poona)
      </h3>
      {#if member.paid}
        <Badge variant="success" size="lg" shape="pill" class="shrink-0">Cotisation réglée</Badge>
      {:else}
        <Badge variant="warning" size="lg" shape="pill" class="shrink-0">Règlement en attente</Badge>
      {/if}
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
      <div class="p-3 bg-muted/40 rounded-lg">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Montant dû</div>
        <div class="text-lg font-bold mt-1 text-foreground">
          <Amount cents={dueCents} />
        </div>
      </div>
      <div class="p-3 bg-muted/40 rounded-lg">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Montant reçu</div>
        <div class="text-lg font-bold mt-1 text-success">
          <Amount cents={receivedCents} />
        </div>
      </div>
      <div class="p-3 bg-muted/40 rounded-lg">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Solde restant</div>
        <div class="text-lg font-bold mt-1 {remainingCents > 0 ? 'text-warning' : 'text-foreground'}">
          <Amount cents={remainingCents} />
        </div>
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex justify-between text-xs text-muted-foreground font-semibold">
        <span>Progression du règlement</span>
        <span>{progressPercent}%</span>
      </div>
      <div class="w-full bg-muted h-3 rounded-full overflow-hidden border border-border">
        <div 
          class="bg-primary h-full transition-all duration-500" 
          style="width: {progressPercent}%"
        ></div>
      </div>
    </div>
  </Card.Content>
</Card.Root>
