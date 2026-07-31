import type { Preview } from '@storybook/svelte';
import { withThemeByClassName } from '@storybook/addon-themes';
import './storybook.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: { disable: true }, // le fond suit le thème (bg-background)
    layout: 'centered',
  },
  // Toggle clair/sombre via la classe `.dark` (variant Tailwind du DS).
  decorators: [
    withThemeByClassName({
      themes: { Clair: '', Sombre: 'dark' },
      defaultTheme: 'Clair',
    }),
  ],
  tags: ['autodocs'],
};

export default preview;
