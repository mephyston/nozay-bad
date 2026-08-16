<script lang="ts">
  import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";
  import { mode } from "mode-watcher";

  let { ...restProps }: SonnerProps = $props();

  /*
   * Retrait des bords, îlot dynamique compris.
   *
   * Les applications déclarent `viewport-fit=cover` : la page s'étend donc sous
   * l'encoche, et c'est à chaque élément de se dégager. Les retraits par défaut de
   * `svelte-sonner` — 24 px, 16 px sur mobile — passent sous l'îlot d'un iPhone, où
   * l'inset vaut une soixantaine de pixels : le toast s'affichait bien, mais derrière
   * le matériel. Un message qu'on ne voit pas ne vaut pas mieux qu'un message absent.
   *
   * Seul le haut est corrigé : c'est le seul bord que l'encoche mange, et les toasts
   * peuvent être positionnés en bas par l'appelant sans qu'on lui impose un décalage.
   */
  const SAFE_TOP = (base: string) => `calc(env(safe-area-inset-top, 0px) + ${base})`;
</script>

<Sonner
  theme={mode?.current || "system"}
  offset={{ top: SAFE_TOP("24px"), right: "24px", bottom: "24px", left: "24px" }}
  mobileOffset={{ top: SAFE_TOP("16px"), right: "16px", bottom: "16px", left: "16px" }}
  class="toaster group"
  toastOptions={{
    classes: {
      toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg font-sans",
      description: "group-[.toast]:text-muted-foreground",
      actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-semibold",
      cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium",
      success: "group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-500/10 group-[.toaster]:text-emerald-600 dark:group-[.toaster]:text-emerald-400",
      error: "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive"
    }
  }}
  {...restProps}
/>
