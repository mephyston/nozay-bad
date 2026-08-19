<script lang="ts">
  // Lucide n'a pas de volant de badminton. On le dessine au gabarit de ses icônes
  // (24×24, trait de 2, extrémités arrondies) pour qu'il ne détonne pas au milieu
  // des autres onglets de la barre du bas.
  let { class: className = '' }: { class?: string } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
>
  <path d="M5.5 5a9 9 0 0 1 13 0" />
  <path d="M9.3 16.3 5.5 5" />
  <path d="M12 15.6V4.2" />
  <path d="m14.7 16.3 3.8-11.3" />
  <circle cx="12" cy="18" r="3.2" />
</svg>
