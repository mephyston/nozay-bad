<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import type { WithElementRef } from "../../../lib/utils.js";

	let { ref = $bindable(null), ...restProps }: WithElementRef<DrawerPrimitive.CloseProps, HTMLButtonElement> = $props();
</script>

<DrawerPrimitive.Close bind:el={ref} data-slot="drawer-close" {...restProps} />
