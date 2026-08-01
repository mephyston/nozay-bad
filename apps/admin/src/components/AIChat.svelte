<script lang="ts">
  import { Send, Sparkles, Database, BookOpen, User, RefreshCcw } from "@lucide/svelte";
  import { onMount } from "svelte";
  
  type Message = { role: "user" | "ai", content: string, type?: "sql" | "rag" };
  
  let prompt = $state("");
  let messages = $state<Message[]>([]);
  let isTyping = $state(false);
  let chatEndRef = $state<HTMLElement | null>(null);

  // Suggestions for empty state
  const suggestions = [
    { text: "Quelle est la somme des subventions reçues cette saison ?", icon: Database, type: "sql" },
    { text: "Comment valider un paiement en espèces dans la caisse ?", icon: BookOpen, type: "rag" },
    { text: "Montre-moi les dépenses du pôle Événements", icon: Database, type: "sql" },
    { text: "C'est quoi la différence entre libellé admin et adhérent ?", icon: BookOpen, type: "rag" },
  ];

  function scrollToBottom() {
    setTimeout(() => {
      if (chatEndRef) chatEndRef.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    
    messages = [...messages, { role: "user", content: text }];
    prompt = "";
    isTyping = true;
    scrollToBottom();
    
    try {
      const res = await fetch('/admin/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });
      const data = await res.json();
      
      if (data.success) {
        messages = [...messages, { 
          role: "ai", 
          content: data.text,
          type: data.type
        }];
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (err: any) {
      messages = [...messages, { 
        role: "ai", 
        content: `Désolé, une erreur est survenue : ${err.message}` 
      }];
    } finally {
      isTyping = false;
      scrollToBottom();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(prompt);
    }
  }

  function clearChat() {
    messages = [];
  }
</script>

<div class="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden shadow-sm relative">
  <!-- Header -->
  <div class="h-16 px-6 border-b border-border flex items-center justify-between shrink-0 bg-card/80 backdrop-blur-md z-10">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles class="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 class="text-sm font-semibold text-foreground">Assistant NBA</h2>
        <p class="text-xs text-muted-foreground flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-success"></span> Propulsé par Cloudflare AI
        </p>
      </div>
    </div>
    <button onclick={clearChat} class="p-2 rounded-md hover:bg-accent text-muted-foreground transition-colors" title="Nouvelle conversation">
      <RefreshCcw class="w-4 h-4" />
    </button>
  </div>

  <!-- Messages Area -->
  <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
    {#if messages.length === 0}
      <div class="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2">
          <Sparkles class="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 class="text-xl font-bold text-foreground mb-2">Bonjour ! Comment puis-je vous aider ?</h3>
          <p class="text-sm text-muted-foreground">Posez-moi des questions sur le fonctionnement du logiciel ou interrogez-moi directement sur les données financières de l'association.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-4">
          {#each suggestions as { text, icon: Icon, type }}
            <button 
              onclick={() => sendMessage(text)}
              class="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:shadow-md transition-all text-left group"
            >
              <div class="flex items-center gap-2">
                <Icon class="w-4 h-4 {type === 'sql' ? 'text-info' : 'text-warning'}" />
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{type === 'sql' ? 'Base de données' : 'Centre d\'aide'}</span>
              </div>
              <span class="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{text}</span>
            </button>
          {/each}
        </div>
      </div>
    {:else}
      {#each messages as msg}
        <div class="flex gap-4 {msg.role === 'user' ? 'flex-row-reverse' : ''}">
          <div class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center mt-1 {msg.role === 'user' ? 'bg-secondary' : 'bg-primary/10'}">
            {#if msg.role === 'user'}
              <User class="w-4 h-4 text-secondary-foreground" />
            {:else}
              <Sparkles class="w-4 h-4 text-primary" />
            {/if}
          </div>
          
          <div class="flex flex-col gap-1 max-w-[85%] md:max-w-[75%]">
            {#if msg.role === 'ai' && msg.type}
              <div class="flex items-center gap-1.5 mb-1 px-1">
                {#if msg.type === 'sql'}
                  <Database class="w-3 h-3 text-info" />
                  <span class="text-[10px] font-bold text-info uppercase tracking-wider">Interrogation Base de Données</span>
                {:else}
                  <BookOpen class="w-3 h-3 text-warning" />
                  <span class="text-[10px] font-bold text-warning uppercase tracking-wider">Recherche Centre d'Aide</span>
                {/if}
              </div>
            {/if}
            
            <div class="px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm {msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-background border border-border text-foreground rounded-tl-sm'}">
              {msg.content}
            </div>
          </div>
        </div>
      {/each}
      
      {#if isTyping}
        <div class="flex gap-4">
          <div class="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center mt-1">
            <Sparkles class="w-4 h-4 text-primary" />
          </div>
          <div class="px-5 py-3.5 rounded-2xl bg-background border border-border rounded-tl-sm flex items-center gap-1.5 h-[52px]">
            <span class="w-2 h-2 rounded-full bg-foreground opacity-50 typing-dot"></span>
            <span class="w-2 h-2 rounded-full bg-foreground opacity-50 typing-dot"></span>
            <span class="w-2 h-2 rounded-full bg-foreground opacity-50 typing-dot"></span>
          </div>
        </div>
      {/if}
      <div bind:this={chatEndRef}></div>
    {/if}
  </div>

  <!-- Input Area -->
  <div class="p-4 bg-card border-t border-border shrink-0 z-10">
    <div class="flex items-end gap-3 max-w-4xl mx-auto">
      <div class="flex-1 relative rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all shadow-sm">
        <textarea 
          bind:value={prompt}
          onkeydown={handleKeydown}
          placeholder="Posez votre question à l'IA..."
          class="w-full max-h-32 min-h-[56px] py-4 px-4 bg-transparent border-0 focus:ring-0 resize-none outline-none text-sm"
          rows="1"
        ></textarea>
      </div>
      <button 
        onclick={() => sendMessage(prompt)}
        disabled={!prompt.trim() || isTyping}
        class="mb-1 p-3.5 h-[50px] rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-all hover:bg-primary/90 flex items-center justify-center shrink-0 cursor-pointer"
      >
        <Send class="w-5 h-5" />
      </button>
    </div>
    <div class="text-center mt-3">
      <p class="text-[10px] text-muted-foreground">L'IA peut faire des erreurs. Vérifiez toujours les données comptables importantes.</p>
    </div>
  </div>
</div>

<style>
  .typing-dot {
    animation: typing-wave 1.4s infinite ease-in-out both;
  }
  .typing-dot:nth-child(1) { animation-delay: -0.32s; }
  .typing-dot:nth-child(2) { animation-delay: -0.16s; }
  .typing-dot:nth-child(3) { animation-delay: 0s; }

  @keyframes typing-wave {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-5px); }
  }
</style>
