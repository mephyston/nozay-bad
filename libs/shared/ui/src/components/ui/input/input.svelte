<script lang="ts">
	import { getContext, type Component, type Snippet } from "svelte";
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../lib/utils.js";
	import { creerIsMobile } from "../../../lib/hooks/is-mobile.svelte.js";
	import { CLE_CHAMP, type ContexteChamp } from "../../patterns/FormField.svelte";

	type InputType = Exclude<HTMLInputTypeAttribute, "file">;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, "type"> &
			({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })
	> & {
		icon?: Snippet | Component<any>;
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		"data-slot": dataSlot = "input",
		icon: Icon,
		placeholder,
		...restProps
	}: Props = $props();

	/*
	  Sur téléphone, l'intitulé descend dans le champ — la disposition iOS, qui rend
	  une ligne par champ. Le bloc ne masque le sien qu'une fois qu'on l'a pris : un
	  texte d'invite déjà fourni par l'appelant l'emporte, et le libellé reste alors
	  au-dessus puisqu'il dit autre chose.
	*/
	const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);
	const requete = creerIsMobile();
	const absorbable = $derived(!!champ && !placeholder && requete.current && type !== "file");
	const invite = $derived(absorbable ? champ!.label : placeholder);

	$effect(() => {
		if (absorbable) champ!.absorberLabel();
	});
</script>

<div class="relative w-full flex items-center">
	{#if Icon}
		<div class="absolute left-2.5 text-muted-foreground pointer-events-none flex items-center justify-center">
			<Icon class="w-4 h-4" />
		</div>
	{/if}
	{#if type === "file"}
		<input
			bind:this={ref}
			data-slot={dataSlot}
			class={cn(
				"dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-11 sm:h-8 rounded-lg border bg-transparent px-3 sm:px-2.5 py-2 sm:py-1 text-base sm:text-sm transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				Icon && "!pl-9",
				className
			)}
			type="file"
			placeholder={invite}
			bind:files
			bind:value
			{...restProps}
		/>
	{:else}
		<input
			bind:this={ref}
			data-slot={dataSlot}
			class={cn(
				"dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-11 sm:h-8 rounded-lg border bg-transparent px-3 sm:px-2.5 py-2 sm:py-1 text-base sm:text-sm transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				Icon && "!pl-9",
				className
			)}
			{type}
			placeholder={invite}
			bind:value
			{...restProps}
		/>
	{/if}
</div>
