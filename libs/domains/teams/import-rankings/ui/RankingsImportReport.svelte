<script lang="ts">
  import { CircleCheck, UserRoundX } from '@lucide/svelte';
  import { Alert, Badge, Button } from '@nba/ui';
  import type { ImportRankingsOutput } from '../dto';

  let {
    report,
    onDismiss
  }: { report: ImportRankingsOutput; onDismiss: () => void } = $props();
</script>

<div class="space-y-3">
  <Alert.Root variant="success">
    <CircleCheck class="w-4 h-4" />
    <Alert.Title>Classements importés au {report.eloDate}</Alert.Title>
    <Alert.Description>
      <div class="flex flex-wrap gap-2 mt-2">
        <Badge variant="secondary">{report.imported} ligne(s)</Badge>
        {#if report.nonCompetitors > 0}
          <!--
            Les licenciés sans classement ne sont pas des erreurs : ils représentent un
            tiers du fichier, et les compter comme telles ferait passer un import réussi
            pour un échec.
          -->
          <Badge variant="outline">{report.nonCompetitors} non compétiteur(s), ignoré(s)</Badge>
        {/if}
        {#if report.errors.length > 0}
          <Badge variant="destructive">{report.errors.length} ligne(s) illisible(s)</Badge>
        {/if}
      </div>
    </Alert.Description>
  </Alert.Root>

  {#if report.unmatched.length > 0}
    <Alert.Root variant="warning">
      <UserRoundX class="w-4 h-4" />
      <Alert.Title>
        {report.unmatched.length} compétiteur(s) sans adhérent correspondant
      </Alert.Title>
      <Alert.Description class="space-y-2">
        <p>
          Ces licenciés ne figurent pas au référentiel des adhérents de la saison. Leur
          classement est enregistré, mais ils ne pourront être alignés dans aucune
          composition tant qu'ils n'y sont pas. Demandez au bureau de relancer l'import
          des adhérents, puis rejouez cet import.
        </p>
        <ul class="text-sm space-y-0.5">
          {#each report.unmatched as player (player.licence)}
            <li>
              <span class="font-mono text-xs">{player.licence}</span>
              — {player.lastName} {player.firstName}
            </li>
          {/each}
        </ul>
      </Alert.Description>
    </Alert.Root>
  {/if}

  {#if report.errors.length > 0}
    <Alert.Root variant="destructive">
      <Alert.Title>Lignes non importées</Alert.Title>
      <Alert.Description>
        <ul class="text-sm space-y-0.5">
          {#each report.errors as error (error.line)}
            <li>Ligne {error.line} — {error.message}</li>
          {/each}
        </ul>
      </Alert.Description>
    </Alert.Root>
  {/if}

  <div class="flex justify-end">
    <Button variant="ghost" size="sm" onclick={onDismiss}>Masquer le rapport</Button>
  </div>
</div>
