<script lang="ts" generics="T = never">
	import { Tooltip as TooltipPrimitive } from "bits-ui";

	let { open = $bindable(false), children, ...restProps }: TooltipPrimitive.RootProps<T> = $props();
</script>

<TooltipPrimitive.Root bind:open {...restProps}>
	{@render children?.()}
</TooltipPrimitive.Root>
