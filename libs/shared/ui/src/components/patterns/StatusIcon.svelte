<script lang="ts">
  import { cn } from '../../lib/utils.js';
  import type { ComponentType } from 'svelte';
  import type { Icon } from '@lucide/svelte';

  let {
    icon: IconComponent,
    variant = 'muted',
    class: className = '',
    ...restProps
  }: {
    icon: ComponentType<Icon>;
    variant?: 'success' | 'warning' | 'destructive' | 'info' | 'muted' | 'primary';
    class?: string;
  } & Record<string, any> = $props();

  const variantClasses = {
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info',
    muted: 'text-muted-foreground',
    primary: 'text-primary'
  };
</script>

<IconComponent class={cn(variantClasses[variant] || variantClasses.muted, className)} {...restProps} />
