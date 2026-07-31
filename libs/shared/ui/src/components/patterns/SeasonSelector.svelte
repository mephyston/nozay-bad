<script lang="ts">
  import { Select } from "../ui/select";

  interface SeasonOption {
    id?: number | string;
    code?: string;
    name: string;
  }

  let {
    seasons = [],
    current,
    param = "season",
    size = "default" as "default" | "sm"
  }: {
    seasons: SeasonOption[];
    current: string;
    param?: string;
    size?: "default" | "sm";
  } = $props();

  const optionValue = (s: SeasonOption) => s.code || String(s.id);

  function handleChange(e: Event) {
    const newSeason = (e.target as HTMLSelectElement).value;
    const url = new URL(window.location.href);
    url.searchParams.set(param, newSeason);
    window.location.href = url.toString();
  }
</script>

<div class="w-fit min-w-36">
  <Select value={current} onchange={handleChange} {size} class="font-semibold" aria-label="Saison">
    {#each seasons as s (optionValue(s))}
      <option value={optionValue(s)} selected={optionValue(s) === current}>{s.name}</option>
    {/each}
    {#if seasons.length === 0}
      <option value={current} selected>Saison {current}</option>
    {/if}
  </Select>
</div>
