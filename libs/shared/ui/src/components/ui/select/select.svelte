<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";
	import { FIELD_SIZE, FIELD_SIZE_SM } from "../../../lib/field.js";

	export const selectVariants = tv({
		base: "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 rounded-lg border bg-transparent transition-colors focus-visible:ring-3 aria-invalid:ring-3 text-foreground w-full min-w-0 outline-none appearance-none cursor-pointer pr-8 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
		variants: {
			size: {
				default: FIELD_SIZE,
				sm: FIELD_SIZE_SM,
			},
		},
		defaultVariants: {
			size: "default",
		},
	});

	export type SelectSize = VariantProps<typeof selectVariants>["size"];
</script>

<script lang="ts">
	import { ChevronDown } from "@lucide/svelte";
	import type { HTMLSelectAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../lib/utils.js";

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		size = "default",
		children,
		...restProps
	}: Omit<WithElementRef<HTMLSelectAttributes>, "size"> & {
		size?: SelectSize;
	} = $props();
</script>

<div class="relative w-full">
	<select
		bind:this={ref}
		bind:value
		data-slot="select"
		class={cn(selectVariants({ size }), className)}
		{...restProps}
	>
		{@render children?.()}
	</select>
	<ChevronDown
		class={cn(
			"text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2",
			size === "sm" ? "size-3.5" : "size-4"
		)}
	/>
</div>
