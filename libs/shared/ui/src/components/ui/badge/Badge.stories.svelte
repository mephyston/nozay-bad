<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { Badge } from '@nba/ui';

  const { Story } = defineMeta({
    title: 'UI/Badge',
    component: Badge,
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: 'select',
        options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'success', 'warning', 'info', 'primary-soft', 'ai'],
      },
      size: { control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
      shape: { control: 'select', options: ['default', 'pill', 'square'] },
    },
    args: { variant: 'default', size: 'default', shape: 'default' },
  });
</script>

<Story name="Playground">
  {#snippet template(args)}
    <Badge {...args}>Badge</Badge>
  {/snippet}
</Story>

<Story name="Variants">
  {#snippet template()}
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="ghost">Ghost</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="primary-soft">Primary soft</Badge>
      <Badge variant="ai">AI</Badge>
    </div>
  {/snippet}
</Story>

<Story name="Sizes">
  {#snippet template()}
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="success" size="xs">XS</Badge>
      <Badge variant="success" size="sm">SM</Badge>
      <Badge variant="success" size="default">Default</Badge>
      <Badge variant="success" size="lg">LG</Badge>
    </div>
  {/snippet}
</Story>

<Story name="Shapes">
  {#snippet template()}
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="info" shape="default">rounded-4xl</Badge>
      <Badge variant="info" shape="pill">pill</Badge>
      <Badge variant="info" shape="square">square</Badge>
    </div>
  {/snippet}
</Story>
