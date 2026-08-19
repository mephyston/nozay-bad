import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'shared-security-headers',
    globals: true,
    // Environnement Node : la lib ne manipule que Response/Headers, sans DOM.
    environment: 'node'
  }
});
