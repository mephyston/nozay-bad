<script lang="ts">
  import { Landmark } from '@lucide/svelte';
  import { Card } from '@nba/ui';
  import type { Member } from './member-profile-types';

  let { member }: { member: Member } = $props();
</script>

<Card.Root>
  <Card.Content class="p-6 space-y-6">
    <h3 class="font-bold text-lg flex items-center gap-2 border-b border-border pb-2 text-foreground">
      <Landmark class="w-5 h-5 text-primary" />
      État financier de la cotisation (Poona)
    </h3>
    <div class="grid grid-cols-3 gap-4 text-center">
      <div class="p-3 bg-muted/40 rounded-lg">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Montant dû</div>
        <div class="text-lg font-bold mt-1">{(member.amountDue / 100).toFixed(2)} €</div>
      </div>
      <div class="p-3 bg-muted/40 rounded-lg">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Montant reçu</div>
        <div class="text-lg font-bold mt-1 text-emerald-600 font-semibold">{(member.amountReceived / 100).toFixed(2)} €</div>
      </div>
      <div class="p-3 bg-muted/40 rounded-lg">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Solde restant</div>
        <div class="text-lg font-bold mt-1 {member.amountRemaining > 0 ? 'text-amber-600' : 'text-foreground'}">
          {(member.amountRemaining / 100).toFixed(2)} €
        </div>
      </div>
    </div>
    
    <div class="space-y-2">
      <div class="flex justify-between text-xs text-muted-foreground font-semibold">
        <span>Progression du règlement</span>
        <span>{member.amountDue > 0 ? Math.round((member.amountReceived / member.amountDue) * 100) : 0}%</span>
      </div>
      <div class="w-full bg-muted h-3 rounded-full overflow-hidden border border-border">
        <div 
          class="bg-primary h-full transition-all duration-500" 
          style="width: {member.amountDue > 0 ? Math.min(100, Math.round((member.amountReceived / member.amountDue) * 100)) : 0}%"
        ></div>
      </div>
    </div>
  </Card.Content>
</Card.Root>
