<script lang="ts">
  import { Select } from "../ui/select";
  import ChoicePicker from "./ChoicePicker.svelte";
  import { softNavigate } from "../../lib/navigation";
  import { dockDePage } from "../../lib/page-dock.svelte";
  import { toSeasonOptions, type SeasonLike } from "../../lib/seasons";

  /*
    Le nom est **facultatif**, comme il l'est dans les projections d'API qui alimentent
    cet écran : plusieurs pages passaient des saisons sans lui, et le contrat exigeait
    pourtant qu'il soit là. Le repli — nom, puis code, puis identifiant — et l'ordre
    chronologique viennent de `toSeasonOptions`, pour qu'un sélecteur de saison présente
    la même liste dans le même ordre d'un écran à l'autre.
  */
  let {
    seasons = [],
    current,
    param = "season",
    size = "default" as "default" | "sm"
  }: {
    seasons: SeasonLike[];
    current: string;
    param?: string;
    size?: "default" | "sm";
  } = $props();

  const options = $derived(toSeasonOptions(seasons));

  function allerA(saison: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(param, saison);
    softNavigate(url.toString());
  }

  function handleChange(e: Event) {
    allerA((e.target as HTMLSelectElement).value);
  }

  /**
   * Sur téléphone, la saison descend dans la barre du bas — **en pilule**.
   *
   * Elle occupait le coin haut droit du bandeau de page : le point le plus loin du
   * pouce, et le premier à disparaître dès qu'on défile. C'est pourtant une décision
   * qu'on prend en cours de lecture — « et l'an dernier ? ».
   *
   * Une pilule et non une action du `+` : la saison ne crée rien, elle dit **ce qu'on
   * regarde**. Rangée parmi les créations, elle se lisait « Saison 2026-2027 » à côté
   * de « Créer une équipe », et sa valeur courante n'était plus visible sans ouvrir le
   * menu — or une portée qu'on ne voit pas ne se vérifie jamais.
   *
   * Un écran peut en porter deux : la saison **et** la journée du championnat. Le dock
   * les affiche toutes, quitte à les tronquer, plutôt que d'en cacher une.
   */
  let choixOuvert = $state(false);

  $effect(() => {
    if (options.length === 0) return;
    return dockDePage.declarerPortee({
      label: "Saison",
      valeur: current,
      ouvrir: () => (choixOuvert = true)
    });
  });
</script>

<!-- Au-dessus de 768 px, la barre du bas n'existe pas : le sélecteur reste au bandeau. -->
<div class="hidden w-fit min-w-36 md:block">
  <Select value={current} onchange={handleChange} {size} class="font-semibold" aria-label="Saison">
    {#each options as o (o.value)}
      <option value={o.value} selected={o.value === current}>{o.label}</option>
    {/each}
    {#if options.length === 0}
      <option value={current} selected>Saison {current}</option>
    {/if}
  </Select>
</div>

<ChoicePicker
  bind:open={choixOuvert}
  title="Saison"
  description="Tout l’écran suit la saison choisie."
  value={current}
  options={options.map((o) => ({ value: o.value, label: o.label }))}
  onChoose={allerA}
/>
