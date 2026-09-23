<script lang="ts">
  import CalendarRange from "@lucide/svelte/icons/calendar-range";
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
   * Sur téléphone, la saison descend dans le menu de la barre du bas.
   *
   * Elle occupait le coin haut droit du bandeau de page — le point le plus loin du
   * pouce, et le premier à disparaître dès qu'on défile. C'est pourtant une décision
   * qu'on prend en cours de lecture : « et l'an dernier ? ».
   *
   * Une action et non la pilule de portée : celle-ci est souvent déjà prise par un
   * autre axe — la journée d'un championnat, le compte d'un rapport — et deux pilules
   * côte à côte ne se distinguent plus. Le dock cumule les déclarations, donc celle-ci
   * ne chasse pas celles de l'écran qui l'héberge.
   */
  let choixOuvert = $state(false);

  const libelleCourant = $derived(
    options.find((o) => o.value === current)?.label ?? `Saison ${current}`
  );

  $effect(() => {
    if (options.length === 0) return;
    return dockDePage.declarerActions([
      {
        id: "saison",
        label: libelleCourant,
        icon: CalendarRange,
        run: () => (choixOuvert = true)
      }
    ]);
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
