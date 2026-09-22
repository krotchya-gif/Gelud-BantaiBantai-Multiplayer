import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export function buildServiceWorker(directory) {
  const files = [];
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name !== 'sw.js') files.push(relative(directory, file).replaceAll('\\', '/'));
    }
  }
  walk(directory);
  files.sort();
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update(readFileSync(join(directory, file)));
  const template = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8');
  // Worker changes must also invalidate the cache, even if game assets are unchanged.
  hash.update(template);
  writeFileSync(join(directory, 'sw.js'), template
    .replace('__PRECACHE_FILES__', JSON.stringify(files))
    .replace('__CACHE_VERSION__', hash.digest('hex').slice(0, 16)));
}
