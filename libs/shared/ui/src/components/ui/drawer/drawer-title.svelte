<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import { cn, type WithElementRef } from "libs/shared/ui/src/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithElementRef<DrawerPrimitive.TitleProps, HTMLHeadingElement> = $props();
</script>

<DrawerPrimitive.Title
	bind:el={ref}
	data-slot="drawer-title"
	class={cn("text-foreground text-base font-medium", className)}
	{...restProps}
/>
