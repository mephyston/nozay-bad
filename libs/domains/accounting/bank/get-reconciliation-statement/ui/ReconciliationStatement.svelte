<script lang="ts">
  import { Card, Amount, Alert, Badge } from '@nba/ui';
  import { CheckCircle2, TriangleAlert, Info } from '@lucide/svelte';
  import type { ReconciliationStatementView } from './reconciliation-statement-types';

  let { statements = [] }: { statements: ReconciliationStatementView[] } = $props();

  function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
</script>

{#if statements.length > 0}
  <div class="space-y-4">
    {#each statements as statement (statement.account.id)}
      <Card.Root>
        <Card.Header class="pb-3">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <Card.Title class="text-base">
              État de rapprochement — {statement.account.label}
            </Card.Title>
            {#if statement.statement}
              <span class="text-xs text-muted-foreground">
                Arrêté au {formatDate(statement.asOfDate)}
              </span>
            {/if}
          </div>
        </Card.Header>

        <Card.Content class="space-y-4">
          {#if !statement.statement}
            <Alert.Root variant="warning" class="flex items-start gap-3">
              <Info class="mt-0.5 h-4 w-4 shrink-0" />
              <Alert.Description class="text-sm">
                Aucun solde de relevé n'a encore été importé pour ce compte. Le rapprochement ne
                peut pas boucler tant qu'il manque le seul chiffre que la comptabilité ne produit
                pas elle-même : celui que la banque annonce.
              </Alert.Description>
            </Alert.Root>
          {/if}

          <!--
            Le raisonnement se lit de haut en bas : on part du solde des livres, on retire ce que
            la banque n'a pas encore vu, on ajoute ce que les livres n'ont pas encore vu, et on
            compare au relevé. Ce qui reste n'est explicable par aucun décalage.
          -->
          <div class="space-y-2 text-sm">
            <div class="flex items-baseline justify-between gap-4 font-semibold">
              <span>Solde comptable au {formatDate(statement.asOfDate)}</span>
              <Amount cents={statement.book.grossCents} />
            </div>

            <div class="flex items-baseline justify-between gap-4 text-muted-foreground">
              <span>
                Écritures non pointées
                <span class="text-xs">({statement.unpointedEntries.length})</span>
              </span>
              <Amount cents={-statement.unpointedEntriesTotalCents} showSign />
            </div>

            <div class="flex items-baseline justify-between gap-4 text-muted-foreground">
              <span>
                Lignes de relevé non comptabilisées
                <span class="text-xs">({statement.unrecordedBankLines.length})</span>
              </span>
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

              <div
                class="flex items-baseline justify-between gap-4 rounded-md px-3 py-2 font-bold {statement.reconciled ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}"
              >
                <span class="flex items-center gap-2">
                  {#if statement.reconciled}
                    <CheckCircle2 class="h-4 w-4" />
                    Rapprochement bouclé
                  {:else}
                    <TriangleAlert class="h-4 w-4" />
                    Écart inexpliqué
                  {/if}
                </span>
                <Amount cents={statement.gapCents ?? 0} showSign />
              </div>
            {/if}
          </div>

          {#if statement.gapCents !== null && !statement.reconciled}
            <p class="text-xs text-muted-foreground">
              Trois causes possibles, de la plus fréquente à la plus rare : un relevé pas encore
              importé jusqu'à la date d'arrêté ; une écriture pointée sur une ligne d'un montant
              différent ; un solde initial d'exercice qui ne correspond pas au solde bancaire
              d'ouverture.
            </p>
          {/if}

          {#if statement.ignoredBankLinesTotalCents !== 0}
            <Alert.Root variant="warning" class="flex items-start gap-3">
              <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
              <Alert.Description class="text-sm">
                <Amount cents={statement.ignoredBankLinesTotalCents} /> de lignes masquées entrent
                dans ce calcul. Masquer une ligne la retire de l'écran, pas du compte en banque :
                l'argent a bel et bien bougé et reste sans écriture.
              </Alert.Description>
            </Alert.Root>
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

          {#if statement.unpointedEntries.length > 0 || statement.unrecordedBankLines.length > 0}
            <details class="text-sm">
              <summary class="cursor-pointer text-muted-foreground hover:text-foreground">
                Voir le détail de l'écart
              </summary>

              <div class="mt-3 grid gap-4 md:grid-cols-2">
                {#if statement.unpointedEntries.length > 0}
                  <div class="space-y-1">
                    <h4 class="text-xs font-semibold uppercase text-muted-foreground">
                      Dans les livres, pas encore en banque
                    </h4>
                    {#each statement.unpointedEntries as entry (entry.id)}
                      <div class="flex items-baseline justify-between gap-3 text-xs">
                        <span class="truncate">
                          {formatDate(entry.date)} · {entry.description}
                        </span>
                        <Amount cents={entry.signedAmountCents} showSign class="shrink-0" />
                      </div>
                    {/each}
                  </div>
                {/if}

                {#if statement.unrecordedBankLines.length > 0}
                  <div class="space-y-1">
                    <h4 class="text-xs font-semibold uppercase text-muted-foreground">
                      En banque, pas encore dans les livres
                    </h4>
                    {#each statement.unrecordedBankLines as line (line.id)}
                      <div class="flex items-baseline justify-between gap-3 text-xs">
                        <span class="truncate">
                          {formatDate(line.date)} · {line.name}
                          {#if line.status === 'ignored'}
                            <span class="text-muted-foreground">(masquée)</span>
                          {/if}
                        </span>
                        <Amount cents={line.amountCents} showSign class="shrink-0" />
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </details>
          {/if}
        </Card.Content>
      </Card.Root>
    {/each}
  </div>
{/if}
