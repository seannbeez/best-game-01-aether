// Aether Forge — local development server. Serves this repository over HTTP
// so the game can be opened at http://localhost:8080/game/ and played in a
// desktop browser. Static files only; nothing is built or bundled.
//
//   node serve.ts              # serves on :8080
//   PORT=8081 node serve.ts    # serves on :8081 instead

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  if (path === '/') path = '/game/index.html';
  // A directory URL serves its index: /game/ must open the game, not 404.
  if (path.endsWith('/')) path += 'index.html';
  if (path === '/game') path = '/game/index.html';
  const file = join(repoRoot, path);
  // Never serve a path outside this repository.
  if (!file.startsWith(repoRoot)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': contentTypes[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(Number(process.env.PORT ?? 8080), () => {
  console.log(`Aether Forge at http://localhost:${process.env.PORT ?? 8080}/game/`);
});
