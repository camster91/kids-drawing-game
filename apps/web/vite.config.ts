import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  server: { port: 3456, host: '0.0.0.0' },
  resolve: {
    alias: {
      // Allow importing from the shared engine directory
    },
  },
});
