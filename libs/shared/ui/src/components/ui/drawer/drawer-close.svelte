<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import type { WithElementRef } from "libs/shared/ui/src/lib/utils.js";

	let { ref = $bindable(null), ...restProps }: WithElementRef<DrawerPrimitive.CloseProps, HTMLButtonElement> = $props();
</script>

<DrawerPrimitive.Close bind:ref data-slot="drawer-close" {...restProps} />
