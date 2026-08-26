<script lang="ts">
  import { Card, Amount, Alert, Badge } from '@nba/ui';
  import { CheckCircle2, ChevronDown, ChevronRight, TriangleAlert, Info } from '@lucide/svelte';
  import type { ReconciliationStatementView } from './reconciliation-statement-types';

  let { statements = [] }: { statements: ReconciliationStatementView[] } = $props();

  /**
   * Replié par défaut, et ce n'est pas de la timidité.
   *
   * Deux encarts dépliés en permanence poussaient la file sous la ligne de flottaison alors qu'ils
   * ne répondent qu'à une question — le rapprochement boucle-t-il ? — dont la réponse tient en un
   * mot. Le raisonnement qui y mène est une consultation, pas un tableau de bord.
   */
  let expanded = $state<Record<number, boolean>>({});

  function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
</script>

{#if statements.length > 0}
  <div class="space-y-2">
    {#each statements as statement (statement.account.id)}
      {@const isOpen = !!expanded[statement.account.id]}
      <Card.Root class="overflow-hidden">
        <!-- La ligne fermée porte la conclusion : le compte, l'écart, la date d'arrêté. -->
        <button
          type="button"
          class="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 cursor-pointer"
          aria-expanded={isOpen}
          onclick={() => (expanded[statement.account.id] = !isOpen)}
        >
          <span class="flex items-center gap-2 min-w-0">
            {#if isOpen}
              <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
            {:else}
              <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
            {/if}
            <span class="text-sm font-semibold truncate">{statement.account.label}</span>
            {#if statement.statement}
              <span class="text-xs text-muted-foreground shrink-0">
                arrêté au {formatDate(statement.asOfDate)}
              </span>
            {/if}
          </span>

          <span class="flex items-center gap-2 shrink-0">
            <!--
              « Écart expliqué », et non « Bouclé ».

              Un état de rapprochement vérifie une identité : solde du relevé = solde des livres
              − écritures non pointées + lignes non comptabilisées. Quand elle tombe juste, cela
              signifie que la différence s'explique intégralement par des décalages **connus** —
              pas qu'il ne reste rien à traiter. Les lignes en attente sont d'ailleurs comptées
              dans le solde attendu : c'est tout leur intérêt. « Bouclé » se lisait « terminé »,
              et donnait à croire le travail fini alors que la file était pleine. Leur décompte,
              lui, n'est pas répété ici : la file l'annonce déjà, dans son titre et dans son filtre.
            -->
            {#if !statement.statement}
              <Badge variant="warning">Aucun solde de relevé</Badge>
            {:else if statement.reconciled}
              <Badge variant="success">
                <CheckCircle2 class="h-3 w-3" />
                Écart expliqué
              </Badge>
            {:else}
              <Badge variant="destructive">
                <TriangleAlert class="h-3 w-3" />
                Écart
              </Badge>
              <Amount cents={statement.gapCents ?? 0} showSign class="text-sm font-bold text-destructive" />
            {/if}
          </span>
        </button>

        {#if isOpen}
          <Card.Content class="space-y-4 border-t border-border pt-4">
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
                      Écart intégralement expliqué
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
                Les livres et la banque se répondent, ce qui ne veut pas dire que tout est traité :
                les {statement.unrecordedBankLines.length} lignes non encore comptabilisées sont
                comptées dans le solde attendu — c'est ce qui permet à l'identité de tomber juste.
                Elles restent à rapprocher.
              </p>
            {/if}

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

            <!--
              Le détail ne vit plus au fond d'un `<details>` imbriqué : il s'ouvre en panneau depuis
              l'en-tête de la file, où les deux montants sont désormais affichés en permanence.
            -->
          </Card.Content>
        {/if}
      </Card.Root>
    {/each}
  </div>
{/if}
