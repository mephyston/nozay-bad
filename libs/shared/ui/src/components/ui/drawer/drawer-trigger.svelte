<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import type { ComponentProps } from "svelte";
	import type { WithElementRef } from "libs/shared/ui/src/lib/utils.js";

	let { ref = $bindable(null), ...restProps }: WithElementRef<ComponentProps<typeof DrawerPrimitive.Trigger>, HTMLButtonElement> = $props();
</script>

<DrawerPrimitive.Trigger bind:ref data-slot="drawer-trigger" {...restProps} />
