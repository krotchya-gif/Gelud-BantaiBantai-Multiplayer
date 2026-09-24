import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildServiceWorker } from './scripts/pwa-build.js';

const engineDirectory = new URL('./public/engine/', import.meta.url);
const engineVersion = createHash('sha256');

for (const name of readdirSync(engineDirectory).filter((file) => file.endsWith('.js')).sort()) {
  engineVersion.update(name);
  engineVersion.update(readFileSync(new URL(name, engineDirectory)));
}

const engineBuildId = engineVersion.digest('hex').slice(0, 12);

export default defineConfig({
  base: './',
  publicDir: 'public',
  plugins: [{
    name: 'offline-game-shell',
    apply: 'build',
    closeBundle() { buildServiceWorker(fileURLToPath(new URL('./dist/', import.meta.url))); },
  }],
  define: {
    __ENGINE_BUILD_ID__: JSON.stringify(engineBuildId),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        studio: fileURLToPath(new URL('./character-studio.html', import.meta.url)),
      },
    },
  },
});
