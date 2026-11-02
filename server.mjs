import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {prepareCatalog} from './prepare-catalog.mjs';
await prepareCatalog();
const root = fileURLToPath(new URL('./dist', import.meta.url));
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml' };
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const target = path.resolve(root,`.${pathname === '/' ? '/index.html' : pathname}`);
    if (!target.startsWith(root+path.sep)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(target);
    res.writeHead(200,{'Content-Type':mime[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-store'});
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(4175,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4175'));
