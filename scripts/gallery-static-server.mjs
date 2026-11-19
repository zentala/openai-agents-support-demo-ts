/** Serve the local gallery on an ephemeral loopback port for browser verification, then close it explicitly. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function galleryServer() {
  const root = path.resolve(import.meta.dirname, "../site");
  const types = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp" };
  const server = createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, "http://loopback").pathname);
      const file = path.resolve(root, `.${name === "/" ? "/index.html" : name}`);
      if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" }).end(body);
    } catch { res.writeHead(404).end("Not found"); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(resolve => server.close(resolve)) };
}
