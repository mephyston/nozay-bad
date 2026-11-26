<script lang="ts">
  import FormField from '../../patterns/FormField.svelte';
  import Input from './input.svelte';

  let { type = undefined, value = '' }: { type?: string; value?: string } = $props();
</script>

<FormField id="champ" label="Places par créneau">
  <Input id="champ" type={type as any} {value} />
</FormField>
