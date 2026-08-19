import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'shared-push',
    globals: true,
    // Environnement Node : la lib n'utilise que WebCrypto, disponible tel quel.
    environment: 'node'
  }
});
