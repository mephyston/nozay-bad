<script lang="ts">
  // Bandeau d'environnement (DEV / TEST) affiché en coin d'écran hors production.
  // L'environnement est inliné au build via PUBLIC_APP_ENV (voir astro.config.mjs de
  // chaque application), ce qui évite la lecture runtime de `Astro.locals.runtime.env`
  // qui throw en prod v6. Rendu serveur sans directive client : aucun JS embarqué.
  const APP_ENV = import.meta.env.PUBLIC_APP_ENV || 'production';
  const label = APP_ENV === 'development' ? 'DEV' : APP_ENV === 'staging' ? 'TEST' : null;
  // DEV = ambre, TEST = rouge.
  const color = APP_ENV === 'development' ? '#d97706' : '#dc2626';
  // Le ruban se décale sous l'encoche : avec `viewport-fit=cover`, le haut de la page
  // passe derrière l'îlot dynamique, et un bandeau qui dit « TEST » n'a d'utilité que
  // s'il se voit.
  //
  // Géométrie du coin. Le ruban doit **sortir des deux bords**, en haut et à droite, et
  // serrer l'angle d'aussi près que possible.
  //
  // Sa distance au coin vaut `(décalage à droite + hauteur du haut) / √2`. Elle était de
  // 71 px — le ruban flottait au large de l'angle — et la fenêtre qui le rogne s'arrêtait
  // à 128 px, juste où sa pointe basse traversait le bord droit : il paraissait coupé net
  // et décollé. À `top-3` et `-right-24`, elle tombe à 40 px, et la fenêtre de 160 px
  // contient la diagonale du ruban (222 px) autour de son centre.
  //
  // On ne va pas plus près : le texte est centré sur les 256 px du ruban, et plus on
  // serre l'angle, plus la portion visible est courte. À 40 px il reste une centaine de
  // pixels de corde, de quoi lire « DEV » ou « TEST ».
</script>

{#if label}
  <div
    class="fixed top-0 inset-x-0 z-[10000] pointer-events-none overflow-hidden h-40"
    style="padding-top: env(safe-area-inset-top, 0px)"
    aria-hidden="true"
  >
    <div
      class="absolute top-3 -right-24 w-64 text-white text-center text-xs font-bold py-1 rotate-45 shadow-md border-y border-white/20 tracking-widest"
      style={`background:${color}`}
    >
      {label}
    </div>
  </div>
{/if}
