<script lang="ts">
  import { Alert, Amount, Badge, Sheet } from '@nba/ui';
  import { CheckCircle2, Info, TriangleAlert } from '@lucide/svelte';
  import type { ReconciliationStatementView } from './reconciliation-statement-types';

  /**
   * L'état de rapprochement en entier, à la demande.
   *
   * Il occupait deux encarts permanents en haut de page, qui poussaient la file sous la ligne de
   * flottaison pour répondre à une question — l'écart s'explique-t-il ? — dont la réponse tient
   * dans un badge. Ce badge vit désormais dans l'en-tête de la file ; le raisonnement qui y mène,
   * lui, se consulte ici : à pleine hauteur, défilable, sans quitter la file des yeux.
   */
  let {
    open = $bindable(false),
    statements = []
  }: {
    open?: boolean;
    statements: ReconciliationStatementView[];
  } = $props();

  function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

</script>

<Sheet.Root bind:open>
  <Sheet.Content size="lg" class="flex flex-col h-full overflow-hidden">
    <Sheet.Header class="p-6 border-b border-border">
      <Sheet.Title>État de rapprochement</Sheet.Title>
      <Sheet.Description>
        La démonstration que l'écart entre les livres et la banque s'explique intégralement par des
        décalages connus.
      </Sheet.Description>
    </Sheet.Header>

    <div class="flex-1 overflow-y-auto p-6 space-y-8">
      {#each statements as statement (statement.account.id)}
        <section class="space-y-3">
          <div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
            <h3 class="text-sm font-bold">{statement.account.label}</h3>
            {#if statement.statement}
              <span class="text-xs text-muted-foreground">arrêté au {formatDate(statement.asOfDate)}</span>
            {/if}
          </div>

          {#if !statement.statement}
            <Alert.Root variant="warning" class="flex items-start gap-3">
              <Info class="mt-0.5 h-4 w-4 shrink-0" />
              <Alert.Description class="text-sm">
                Aucun solde de relevé n'a encore été importé pour ce compte. Le rapprochement ne peut
                pas boucler tant qu'il manque le seul chiffre que la comptabilité ne produit pas
                elle-même : celui que la banque annonce.
              </Alert.Description>
            </Alert.Root>
          {/if}

          <!--
            Le raisonnement se lit de haut en bas : on part du solde des livres, on retire ce que la
            banque n'a pas encore vu, on ajoute ce que les livres n'ont pas encore vu, et on compare
            au relevé. Ce qui reste n'est explicable par aucun décalage.
          -->
          <div class="space-y-2 text-sm">
            <div class="flex items-baseline justify-between gap-4 font-semibold">
              <span>Solde comptable au {formatDate(statement.asOfDate)}</span>
              <Amount cents={statement.book.grossCents} />
            </div>

            <!--
              Le solde part d'un à-nouveau reconstitué tant que l'exercice précédent n'est pas
              clôturé. Le chiffre est juste — aucune régularisation de fin d'exercice ne peut
              déplacer la trésorerie à la date de clôture, une charge à payer étant par
              définition datée après — mais il n'est pas arrêté, et l'afficher muet laisserait
              croire qu'il fait foi.
            -->
            {#if statement.openingBalanceProvisional}
              <p class="text-xs text-muted-foreground">
                À-nouveau provisoire : l'exercice précédent n'étant pas clôturé, le solde
                d'ouverture est reconstitué. Il sera figé à la clôture.
              </p>
            {/if}

            <div class="flex items-baseline justify-between gap-4 text-muted-foreground">
              <span>Écritures non pointées <span class="text-xs">({statement.unpointedEntries.length})</span></span>
              <Amount cents={-statement.unpointedEntriesTotalCents} showSign />
            </div>

            <div class="flex items-baseline justify-between gap-4 text-muted-foreground">
              <span>Lignes de relevé non comptabilisées <span class="text-xs">({statement.unrecordedBankLines.length})</span></span>
              <Amount cents={statement.unrecordedBankLinesTotalCents} showSign />
            </div>

            <div class="flex items-baseline justify-between gap-4 border-t border-border pt-2 font-semibold">
              <span>Solde bancaire attendu</span>
              <Amount cents={statement.expectedBankBalanceCents} />
            </div>

            {#if statement.statement}
              <div class="flex items-baseline justify-between gap-4 font-semibold">
                <span>Solde annoncé par la banque</span>
                <Amount cents={statement.statement.balanceCents} />
              </div>

              <!--
                Trois verdicts, pas deux. Un écart dû à l'avance de l'arrêté sur son propre
                détail n'est l'anomalie de personne : l'annoncer en rouge comme « inexpliqué »
                envoyait le trésorier chercher une erreur qui n'existe pas, au dernier jour de
                chaque relevé.
              -->
              <div class="flex items-baseline justify-between gap-4 rounded-md px-3 py-2 font-bold {statement.reconciled ? 'bg-success/10 text-success' : statement.statementAheadOfBankLines ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}">
                <span class="flex items-center gap-2">
                  {#if statement.reconciled}
                    <CheckCircle2 class="h-4 w-4" />
                    Écart intégralement expliqué
                  {:else if statement.statementAheadOfBankLines}
                    <Info class="h-4 w-4" />
                    Arrêté en avance sur le détail du relevé
                  {:else}
                    <TriangleAlert class="h-4 w-4" />
                    Écart inexpliqué
                  {/if}
                </span>
                <Amount cents={statement.gapCents ?? 0} showSign />
              </div>
            {/if}
          </div>

          {#if statement.reconciled && statement.unrecordedBankLines.length > 0}
            <p class="text-xs text-muted-foreground">
              Les livres et la banque se répondent, ce qui ne veut pas dire que tout est traité : les
              {statement.unrecordedBankLines.length} lignes non encore comptabilisées sont comptées
              dans le solde attendu — c'est ce qui permet à l'identité de tomber juste. Elles restent
              à rapprocher, et forment la file.
            </p>
          {/if}

          {#if statement.gapCents !== null && !statement.reconciled}
            {#if statement.statementAheadOfBankLines && statement.statement && statement.lastBankLineDate}
              <p class="text-xs text-muted-foreground">
                Le solde est arrêté au {formatDate(statement.statement.date)}, mais la dernière opération
                que le relevé détaille est du {formatDate(statement.lastBankLineDate)}. La banque tient trois
                soldes — comptable, en valeur, instantané — et le fichier porte le <strong>comptable</strong> :
                il compte déjà des opérations dont il ne donne pas encore le détail. Les livres, eux, ne
                reproduisent que ce qui est détaillé. Cet écart-là se résorbe au prochain relevé ; il n'y a
                rien à corriger, et surtout pas le solde annoncé.
              </p>
            {:else}
              <p class="text-xs text-muted-foreground">
                Trois causes possibles, de la plus fréquente à la plus rare : un relevé pas encore
                importé jusqu'à la date d'arrêté ; une écriture pointée sur une ligne d'un montant
                différent ; un solde initial d'exercice qui ne correspond pas au solde bancaire
                d'ouverture.
              </p>
            {/if}
          {/if}

          {#if statement.book.inVaultCents > 0 || statement.book.pendingDebitCents > 0}
            <div class="flex flex-wrap gap-2 text-xs">
              {#if statement.book.inVaultCents > 0}
                <Badge variant="secondary">
                  Chèques en coffre : <Amount cents={statement.book.inVaultCents} class="ml-1" />
                </Badge>
              {/if}
              {#if statement.book.pendingDebitCents > 0}
                <Badge variant="secondary">
                  En attente de débit : <Amount cents={statement.book.pendingDebitCents} class="ml-1" />
                </Badge>
              {/if}
            </div>
          {/if}

          {#if statement.unpointedEntries.length > 0}
            <div class="space-y-1 pt-1">
              <h4 class="text-xs font-semibold uppercase text-muted-foreground">
                Dans les livres, pas encore en banque
              </h4>
              <div class="divide-y divide-border/60">
                {#each statement.unpointedEntries as entry (entry.id)}
                  <div class="flex items-baseline justify-between gap-3 py-1.5 text-xs">
                    <span class="min-w-0 flex items-baseline gap-2">
                      <span class="text-muted-foreground tabular-nums shrink-0">{formatDate(entry.date)}</span>
                      <span class="truncate">{entry.description}</span>
                    </span>
                    <Amount cents={entry.signedAmountCents} showSign class="shrink-0" />
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </section>
      {/each}
    </div>
  </Sheet.Content>
</Sheet.Root>
