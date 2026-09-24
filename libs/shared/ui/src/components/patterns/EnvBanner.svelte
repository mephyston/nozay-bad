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
  // serrer l'angle d'aussi près que le texte le permet.
  //
  // Sa distance au coin vaut `(largeur/2 − décalage à droite + demi-épaisseur) / √2`.
  // Elle est passée de 71 px à 40, puis à 26 : le bouton du compte vit dans ce même
  // coin, et chaque pixel gagné le dégage d'autant. Le ruban est aussi aminci — demi
  // interligne et dix pixels de texte — ce qui retire huit pixels de plus à son emprise.
  //
  // On ne va pas plus près : le texte est centré sur le ruban, donc son centre se
  // rapproche du bord droit à mesure qu'on serre. À 84 px de décalage pour 224 de large,
  // il reste 28 px entre ce centre et le bord — juste de quoi écrire « TEST » sans le
  // couper. La fenêtre de rognage de 160 px, elle, contient toujours la diagonale.
  //
  // Le retrait à gauche recentre le mot sur la **portion visible**, et non sur le ruban.
  // Les deux ne coïncident pas : le ruban est long de 224 px dont on ne voit que la
  // corde qui traverse le coin, et le milieu de cette corde est le pied de la
  // perpendiculaire abaissée depuis l'angle — soit 12 px plus bas que le centre du
  // ruban. Sans ce décalage, « DEV » paraissait poussé vers le haut de sa bande.
</script>

{#if label}
  <div
    class="fixed top-0 inset-x-0 z-[10000] pointer-events-none overflow-hidden h-40"
    style="padding-top: env(safe-area-inset-top, 0px)"
    aria-hidden="true"
  >
    <div
      class="absolute top-0 -right-[84px] w-56 py-0.5 pl-[25px] text-center text-[10px] font-bold tracking-widest text-white rotate-45 shadow-md border-y border-white/20"
      style={`background:${color}`}
    >
      {label}
    </div>
  </div>
{/if}
