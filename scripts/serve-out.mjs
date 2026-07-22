/**
 * Minimal static server for the `out/` export, used by the Playwright suite.
 *
 * Written rather than pulling in a serving package: this repo ships an
 * offline-first PWA with a deliberately small dependency surface, and handing
 * CI ~80 transitive packages to answer GET requests for a directory of files
 * is a poor trade. The behaviour needed is narrow and stable.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve(process.argv[2] ?? "out");
const PORT = Number(process.argv[3] ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

async function resolveFile(pathname) {
  // Reject traversal before touching the filesystem. `normalize` collapses
  // `..` segments, so anything still outside ROOT afterwards was an attempt.
  const candidate = resolve(join(ROOT, normalize(decodeURIComponent(pathname))));
  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) return null;

  try {
    const info = await stat(candidate);
    if (info.isDirectory()) {
      const index = join(candidate, "index.html");
      await stat(index);
      return index;
    }
    return candidate;
  } catch {
    // The static export emits extensionless routes as `<route>.html`.
    try {
      const html = `${candidate}.html`;
      await stat(html);
      return html;
    } catch {
      return null;
    }
  }
}

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const file = await resolveFile(pathname);

  if (!file) {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    // The suite rebuilds between runs; a cached asset would test stale output.
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(response);
});

server.listen(PORT, () => {
  console.log(`serving ${ROOT} on http://localhost:${PORT}`);
});
