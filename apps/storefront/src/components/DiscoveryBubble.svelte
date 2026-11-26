<script lang="ts">
  /**
   * La bulle de découverte de l'espace adhérent : une fois par appareil, elle désigne de sa
   * pointe ce qui est nouveau ou caché, et se range sur « Compris ».
   *
   * Née sous l'avatar du compte (`UserMenu`) ; l'onglet Calendrier et l'onglet Interclubs
   * reprennent la même, pour que toutes les découvertes se ressemblent. L'appelant la place
   * (`class`, `style`) et dit où tombe la pointe (`arrow`, `arrowStyle`) ; la bulle ne décide
   * ni de son emplacement ni du moment où elle paraît.
   */
  interface Action {
    label: string;
    href?: string;
    onclick: () => void;
  }

  let {
    title,
    text,
    testid,
    arrow = 'top',
    arrowStyle = 'right: 1rem',
    class: className = '',
    style = '',
    primary,
    secondary = null
  }: {
    title: string;
    text: string;
    testid: string;
    /** La pointe sort du haut (bulle sous sa cible) ou du bas (bulle au-dessus). */
    arrow?: 'top' | 'bottom';
    /** Position horizontale de la pointe, en CSS (`right: 1rem`, `left: calc(…)`). */
    arrowStyle?: string;
    class?: string;
    style?: string;
    primary: Action;
    secondary?: Action | null;
  } = $props();

  const button = 'inline-flex min-h-[36px] items-center rounded-md px-3 py-1.5 text-xs font-semibold';
</script>

<div
  role="status"
  data-testid={testid}
  class={`z-50 rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg ${className}`}
  {style}
>
  <span
    class={`absolute h-3 w-3 rotate-45 border-border bg-popover ${arrow === 'top' ? '-top-1.5 border-l border-t' : '-bottom-1.5 border-b border-r'}`}
    style={arrowStyle}
    aria-hidden="true"
  ></span>
  <p class="font-semibold text-foreground">{title}</p>
  <p class="mt-1 text-muted-foreground">{text}</p>
  <div class="mt-2 flex gap-2">
    {#if primary.href}
      <a href={primary.href} onclick={primary.onclick} class={`${button} bg-primary text-primary-foreground hover:bg-primary/90`}>{primary.label}</a>
    {:else}
      <button type="button" onclick={primary.onclick} class={`${button} bg-primary text-primary-foreground hover:bg-primary/90`}>{primary.label}</button>
    {/if}
    {#if secondary}
      <button type="button" onclick={secondary.onclick} class={`${button} border border-border`}>{secondary.label}</button>
    {/if}
  </div>
</div>
