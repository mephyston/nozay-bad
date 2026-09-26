<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import AlertDialogPortal from "./alert-dialog-portal.svelte";
	import AlertDialogOverlay from "./alert-dialog-overlay.svelte";
	import { cn, type WithoutChild, type WithoutChildrenOrChild } from "../../../lib/utils.js";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		size = "default",
		portalProps,
		...restProps
	}: WithoutChild<AlertDialogPrimitive.ContentProps> & {
		size?: "default" | "sm";
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof AlertDialogPortal>>;
	} = $props();
</script>

<!--
	`z-[70]`, au-dessus de tout ce qui peut demander une confirmation.

	Une confirmation naît presque toujours d'une surface déjà ouverte : un tiroir
	(`ResponsiveSheet`, `z-50`), un sélecteur ou une feuille d'actions (`z-[60]`). À
	`z-50` comme eux, c'était l'ordre dans le document qui tranchait — et le portail de
	`GlobalConfirm`, monté une fois pour toutes avec la mise en page, précède celui du
	tiroir ouvert ensuite. La boîte s'ouvrait donc **sous** le tiroir : sur téléphone,
	où il couvre tout l'écran, elle était invisible et captait le focus, et « Retirer »
	un bloc de page semblait ne rien faire.

	Reste sous la recherche (`z-[90]`) et la bannière d'installation (`z-[100]`), qui
	n'ouvrent jamais de confirmation.
-->
<AlertDialogPortal {...portalProps}>
	<AlertDialogOverlay />
	<AlertDialogPrimitive.Content
		bind:ref
		data-slot="alert-dialog-content"
		data-size={size}
		class={cn(
			"data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 bg-popover text-popover-foreground ring-foreground/10 gap-4 rounded-xl p-4 ring-1 duration-100 data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm group/alert-dialog-content fixed top-1/2 left-1/2 z-[70] grid w-full -translate-x-1/2 -translate-y-1/2 outline-none",
			className
		)}
		{...restProps}
	/>
</AlertDialogPortal>
