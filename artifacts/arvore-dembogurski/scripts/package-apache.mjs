import { copyFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const artifactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(artifactDir, 'dist', 'public');
const assetsDir = path.join(publicDir, 'assets');
const apacheDir = path.join(artifactDir, 'apache');
const assets = await readdir(assetsDir);
const publicFiles = (await readdir(publicDir)).filter((filename) => filename !== 'assets' && filename !== 'index.html');
const javascript = assets.filter((filename) => filename.endsWith('.js'));
const stylesheets = assets.filter((filename) => filename.endsWith('.css'));

if (javascript.length !== 1 || stylesheets.length !== 1) {
  throw new Error(
    `Expected one JavaScript bundle and one stylesheet; found ${javascript.length} JS and ${stylesheets.length} CSS files.`,
  );
}

const existingFiles = await readdir(apacheDir);
for (const filename of existingFiles) {
  if (/^index-[\w-]+\.(js|css)$/.test(filename) && !assets.includes(filename)) {
    await unlink(path.join(apacheDir, filename));
  }
}
for (const filename of assets) {
  await copyFile(path.join(assetsDir, filename), path.join(apacheDir, filename));
}
for (const filename of publicFiles) {
  await copyFile(path.join(publicDir, filename), path.join(apacheDir, filename));
}
await copyFile(path.join(assetsDir, javascript[0]), path.join(apacheDir, 'app.js'));
await copyFile(path.join(assetsDir, stylesheets[0]), path.join(apacheDir, 'styles.css'));
await writeFile(
  path.join(apacheDir, 'index.html'),
  `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <meta name="description" content="Árvore genealógica e mapa compartilhado da Família Dembogurski.">
    <title>Árvore da Família Dembogurski</title>
    <link rel="icon" type="image/svg+xml" href="./favicon.svg">
    <link rel="stylesheet" href="./styles.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./app.js"></script>
  </body>
</html>
`,
);

console.info(`Apache bundle written to ${apacheDir}`);