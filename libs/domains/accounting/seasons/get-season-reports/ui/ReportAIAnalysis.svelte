<script lang="ts">
  import { Button } from '@nba/ui';
  import { Sparkles, Loader2 } from '@lucide/svelte';

  let { report, section, seasonId, canUseAi = false }: { report: any; section: 'tresorerie' | 'resultat', seasonId: string, canUseAi?: boolean } = $props();


  let loading = $state(false);
  let analysis = $state<string>('');
  let error = $state<string | null>(null);

  async function generateAnalysis() {
    loading = true;
    error = null;
    analysis = '';

    try {
      const response = await fetch(`/api/accounting/seasons/${seasonId}/ai/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, section })
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la génération de l'analyse");
      }

      if (!response.body) throw new Error('No body returned');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (let line of lines) {
            line = line.trim();
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.response) {
                  analysis += data.response;
                }
              } catch (e) {
                // ignore incomplete JSON or other events
              }
            }
          }
        }
      }
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

{#if canUseAi}
<div class="mt-6 pt-6 border-t border-border no-print">
  {#if !analysis && !loading && !error}
    <Button variant="outline" class="w-full flex items-center justify-center gap-2 border-primary/20 text-primary hover:bg-primary/5" onclick={generateAnalysis}>
      <Sparkles class="w-4 h-4" />
      Générer une synthèse avec l'IA
    </Button>
  {:else}
    <div class="bg-muted/30 border border-border rounded-xl p-5 space-y-3 relative">
      <div class="flex items-center gap-2 font-semibold text-primary mb-2">
        <Sparkles class="w-4 h-4" />
        <span>Synthèse IA (Llama 3.1)</span>
      </div>
      
      {#if error}
        <div class="text-destructive text-sm">{error}</div>
        <Button variant="outline" size="sm" class="mt-2" onclick={generateAnalysis}>Réessayer</Button>
      {:else}
        <div class="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {analysis}
        </div>
        {#if loading}
          <div class="flex items-center gap-2 text-muted-foreground text-xs mt-4">
            <Loader2 class="w-3 h-3 animate-spin" />
            <span>Génération en cours...</span>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>
{/if}
