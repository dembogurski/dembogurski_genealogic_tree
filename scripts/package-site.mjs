import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const landingDir = path.join(projectRoot, 'portada');
const treeDir = path.join(projectRoot, 'artifacts', 'arvore-dembogurski', 'apache');
const outputRoot = path.resolve(projectRoot, 'dist');
const siteDir = path.join(outputRoot, 'dembogurski-site');

if (!siteDir.startsWith(`${outputRoot}${path.sep}`)) {
  throw new Error(`Unsafe package destination: ${siteDir}`);
}

for (const requiredDir of [landingDir, treeDir]) {
  if (!(await stat(requiredDir)).isDirectory()) {
    throw new Error(`Required directory not found: ${requiredDir}`);
  }
}

await rm(siteDir, { recursive: true, force: true });
await mkdir(siteDir, { recursive: true });

const landingEntries = await readdir(landingDir, { withFileTypes: true });
for (const entry of landingEntries) {
  if (entry.name === 'previews' || entry.name === 'README.md') {
    continue;
  }
  await cp(
    path.join(landingDir, entry.name),
    path.join(siteDir, entry.name),
    { recursive: entry.isDirectory(), preserveTimestamps: true },
  );
}

await cp(treeDir, path.join(siteDir, 'arvore'), {
  recursive: true,
  preserveTimestamps: true,
});

for (const requiredFile of [
  'index.html',
  path.join('assets', 'styles.css'),
  path.join('assets', 'brasao-dembogurski.webp'),
  path.join('arvore', 'index.html'),
  path.join('arvore', 'api.php'),
]) {
  if (!(await stat(path.join(siteDir, requiredFile))).isFile()) {
    throw new Error(`Packaged site is missing ${requiredFile}`);
  }
}

console.info(`Unified site written to ${siteDir}`);
