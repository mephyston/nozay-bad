<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export const tabsListVariants = tv({
		base: "inline-flex h-10 items-center justify-start md:justify-center rounded-lg p-1 text-muted-foreground border border-border/40 shadow-xs flex-row overflow-x-auto overflow-y-hidden no-scrollbar whitespace-nowrap",
		variants: {
			variant: {
				default: "bg-muted",
				line: "gap-1 bg-transparent border-0 shadow-none",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	});

	export type TabsListVariant = VariantProps<typeof tabsListVariants>["variant"];
</script>

<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "../../../lib/utils.js";
	import { ChevronLeft, ChevronRight } from "@lucide/svelte";

	let {
		ref = $bindable(null),
		variant = "default",
		class: className,
		...restProps
	}: TabsPrimitive.ListProps & {
		variant?: TabsListVariant;
	} = $props();

	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);

	function checkScroll() {
		if (!ref) return;
		canScrollLeft = ref.scrollLeft > 0;
		canScrollRight = Math.ceil(ref.scrollLeft + ref.clientWidth) < ref.scrollWidth;
	}

	$effect(() => {
		if (ref) {
			setTimeout(checkScroll, 50);
			const observer = new ResizeObserver(checkScroll);
			observer.observe(ref);
			return () => observer.disconnect();
		}
	});

	let bgGradientStart = $derived(variant === 'default' ? 'from-muted' : 'from-background');
</script>

<style>
	/* Hide scrollbar for Chrome, Safari and Opera */
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	/* Hide scrollbar for IE, Edge and Firefox */
	.no-scrollbar {
		-ms-overflow-style: none;  /* IE and Edge */
		scrollbar-width: none;  /* Firefox */
	}
</style>

<div class="relative w-full flex group">
	<div class="absolute left-0 top-0 z-10 h-10 flex items-center justify-start bg-gradient-to-r {bgGradientStart} via-background/50 to-transparent w-10 pointer-events-none transition-opacity duration-300 {canScrollLeft ? 'opacity-100' : 'opacity-0'}">
		<ChevronLeft class="w-6 h-6 text-muted-foreground/80 -ml-1" />
	</div>

	<TabsPrimitive.List
		bind:ref
		onscroll={checkScroll}
		data-slot="tabs-list"
		data-variant={variant}
		class={cn(tabsListVariants({ variant }), "w-full", className)}
		{...restProps}
	/>

	<div class="absolute right-0 top-0 z-10 h-10 flex items-center justify-end bg-gradient-to-l {bgGradientStart} via-background/50 to-transparent w-10 pointer-events-none transition-opacity duration-300 {canScrollRight ? 'opacity-100' : 'opacity-0'}">
		<ChevronRight class="w-6 h-6 text-muted-foreground/80 -mr-1" />
	</div>
</div>
