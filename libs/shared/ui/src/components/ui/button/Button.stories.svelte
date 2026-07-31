<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { Button } from '@nba/ui';

  const { Story } = defineMeta({
    title: 'UI/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: 'select',
        options: ['default', 'outline', 'secondary', 'ghost', 'ghost-muted', 'ghost-danger', 'destructive', 'destructive-outline', 'link', 'ai', 'ai-ghost'],
      },
      size: {
        control: 'select',
        options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
      },
      disabled: { control: 'boolean' },
    },
    args: { variant: 'default', size: 'default', disabled: false },
  });
</script>

<!-- Story pilotable par les contrôles -->
<Story name="Playground">
  {#snippet template(args)}
    <Button {...args}>Bouton</Button>
  {/snippet}
</Story>

<!-- Panorama de tous les variants -->
<Story name="Variants">
  {#snippet template()}
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="default">Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="ghost-muted">Ghost muted</Button>
      <Button variant="ghost-danger">Ghost danger</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="destructive-outline">Destructive outline</Button>
      <Button variant="link">Link</Button>
      <Button variant="ai">AI</Button>
      <Button variant="ai-ghost">AI ghost</Button>
    </div>
  {/snippet}
</Story>

<!-- Panorama des tailles -->
<Story name="Sizes">
  {#snippet template()}
    <div class="flex flex-wrap items-center gap-3">
      <Button size="xs">XS</Button>
      <Button size="sm">SM</Button>
      <Button size="default">Default</Button>
      <Button size="lg">LG</Button>
    </div>
  {/snippet}
</Story>
