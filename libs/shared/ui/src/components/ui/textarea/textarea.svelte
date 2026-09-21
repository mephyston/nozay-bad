<script lang="ts">
	import { getContext } from "svelte";
	import { cn, type WithElementRef, type WithoutChildren } from "../../../lib/utils.js";
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import { creerIsMobile } from "../../../lib/hooks/is-mobile.svelte.js";
	import { CLE_CHAMP, type ContexteChamp } from "../../patterns/FormField.svelte";

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		"data-slot": dataSlot = "textarea",
		placeholder,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();

	/* Même règle que pour `Input` : voir `FormField`. */
	const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);
	const requete = creerIsMobile();
	const absorbable = $derived(!!champ && champ.absorbable && requete.current);
	const invite = $derived(absorbable ? champ!.label : placeholder);

	$effect(() => {
		if (absorbable) champ!.absorberLabel();
	});
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		"border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors focus-visible:ring-3 aria-invalid:ring-3 md:text-sm placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full outline-none disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
	bind:value
	placeholder={invite}
	{...restProps}
></textarea>
