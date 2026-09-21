<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "../../../lib/utils.js";

	let {
		ref = $bindable(null),
		variant = "default",
		class: className,
		...restProps
	}: TabsPrimitive.TriggerProps & { variant?: "default" | "glass" } = $props();

	/* Segments de largeur égale, actif surélevé : la forme d'un segmented control. */
	const GLASS =
		"h-10 flex-1 rounded-full text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/60";
</script>

<TabsPrimitive.Trigger
	bind:ref
	data-slot="tabs-trigger"
	class={cn(
		"inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground hover:text-foreground cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-xs border-0",
		variant === "glass" && GLASS,
		className
	)}
	{...restProps}
/>
