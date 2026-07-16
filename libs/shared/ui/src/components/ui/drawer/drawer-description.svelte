<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import { cn, type WithElementRef } from "../../../lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithElementRef<DrawerPrimitive.DescriptionProps, HTMLDivElement> = $props();
</script>

<DrawerPrimitive.Description
	bind:el={ref}
	data-slot="drawer-description"
	class={cn("text-muted-foreground text-sm", className)}
	{...restProps}
/>
