<script lang="ts">
	import { Switch as SwitchPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "../../../lib/utils.js";

	/**
	 * L'interrupteur.
	 *
	 * Une case à cocher demande « cet élément fait-il partie de la sélection ? » ;
	 * un interrupteur demande « ce réglage est-il actif ? ». iOS distingue les deux
	 * strictement — coche pour choisir dans une liste, interrupteur pour régler — et
	 * c'est une distinction utile : elle dit si l'effet est immédiat ou s'il attend
	 * une validation.
	 */
	let {
		ref = $bindable(null),
		checked = $bindable(false),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> = $props();
</script>

<SwitchPrimitive.Root
	bind:ref
	bind:checked
	data-slot="switch"
	class={cn(
		"peer focus-visible:ring-ring/50 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
		"data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30",
		className
	)}
	{...restProps}
>
	<SwitchPrimitive.Thumb
		data-slot="switch-thumb"
		class={cn(
			"bg-background pointer-events-none block size-6 rounded-full shadow-sm ring-0 transition-transform",
			"data-[state=checked]:translate-x-[1.375rem] data-[state=unchecked]:translate-x-0.5"
		)}
	/>
</SwitchPrimitive.Root>
