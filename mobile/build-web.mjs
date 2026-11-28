import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const output = join(import.meta.dirname, 'www');
const webExtensions = new Set(['.css', '.js', '.png']);
const index = await readFile(join(project, 'index.html'), 'utf8');

if (!index.includes('<html lang="en">') || !index.includes('</head>')) {
  throw Error('Unable to configure the Repbook entry point in index.html.');
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const entries = await readdir(project, { withFileTypes: true });
const webFiles = entries.filter(entry => entry.isFile() && webExtensions.has(extname(entry.name)));
await Promise.all([
  ...webFiles.map(({ name }) => cp(join(project, name), join(output, name))),
  cp(join(project, 'assets'), join(output, 'assets'), { recursive: true }),
  cp(join(project, 'vendor'), join(output, 'vendor'), { recursive: true }),
  cp(join(import.meta.dirname, 'repbook-app-start.js'), join(output, 'repbook-app-start.js')),
  writeFile(join(output, 'index.html'), index
    .replace('<html lang="en">', '<html lang="en" data-repbook-app>')
    .replace('</head>', '<script src="./repbook-app-start.js"></script></head>')),
]);
