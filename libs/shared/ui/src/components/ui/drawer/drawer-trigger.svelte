<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import type { ComponentProps } from "svelte";
	import type { WithElementRef } from "../../../lib/utils.js";

	let { ref = $bindable(null), ...restProps }: WithElementRef<ComponentProps<typeof DrawerPrimitive.Trigger>, HTMLButtonElement> = $props();
</script>

<DrawerPrimitive.Trigger bind:el={ref} data-slot="drawer-trigger" {...restProps} />
