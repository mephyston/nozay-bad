import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'shared-preview',
    globals: true,
    // WebCrypto suffit : aucun DOM, comme dans un Worker.
    environment: 'node'
  }
});
