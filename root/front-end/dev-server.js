/* ============================================================
 *  PlayCarys - front-end server
 *
 *  Replaces `http-server`. It does the same job (serve this folder
 *  with caching off) and one extra thing that http-server cannot do:
 *
 *      it reverse-proxies /api/... and /socket.io/... to the NestJS
 *      backend on 127.0.0.1:3000
 *
 *  WHY THAT MATTERS
 *  ----------------
 *  data/db.js used to work out the API address as
 *
 *      http://<whatever host the page was opened on>:3000
 *
 *  That is correct on this PC (localhost:3000) and correct over Wi-Fi
 *  (192.168.x.x:3000). It is WRONG the moment the site is shared through
 *  a public tunnel, because:
 *
 *    1. the tunnel only forwards ONE port - 8080. There is nothing
 *       listening on port 3000 of the tunnel host, so the request dies.
 *    2. the tunnel is https and the guessed API address is http, so the
 *       browser blocks it as mixed content even if 1. were solved.
 *
 *  Either one produces the same message on the sign-in panel:
 *  "Cannot reach the server to verify your password."
 *
 *  With this proxy the browser only ever talks to ONE origin - the one
 *  in the address bar. Localhost, Wi-Fi and the public link then all
 *  behave identically, and no second tunnel is needed.
 *
 *  No dependencies: Node's own http module does all of it, including
 *  the WebSocket upgrade that socket.io needs for live chess.
 * ============================================================ */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const net  = require('net');

const PORT         = Number(process.env.PC_FRONTEND_PORT) || 8080;
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = Number(process.env.PC_BACKEND_PORT) || 3000;
const ROOT         = __dirname;

/* ── The games origin ─────────────────────────────────────────────
 *
 * Uploaded games used to run in an iframe on THIS origin with
 * sandbox="allow-same-origin". Same origin + allow-same-origin means the
 * iframe is not isolated at all: a published game could read the player's
 * localStorage, which holds `playcarys_session` and `playcarys_api_token`.
 * Any publisher could have lifted a session token from every player who
 * opened their game.
 *
 * Dropping allow-same-origin would isolate them, but it also puts the game in
 * an opaque origin where its OWN localStorage throws — breaking the saved
 * best-times in 2048, HexGL and Hextris.
 *
 * Serving the same files on a second port fixes both. The browser treats
 * :8081 as a different origin, so a game gets a real, working storage area
 * that simply is not the platform's. This is the "separate port/origin" fix
 * the comment in play.html has been asking for.
 *
 * Deliberately no /api proxy on this port: a game has no business calling the
 * platform API directly. It talks to the platform through the SDK's
 * postMessage channel, same as before.
 */
const GAMES_PORT = Number(process.env.PC_GAMES_PORT) || 8081;

/* Anything under these prefixes belongs to the backend, not to disk. */
const PROXY_PREFIXES = ['/api/', '/socket.io/'];
const isProxied = (url) => PROXY_PREFIXES.some((p) => url === p.slice(0, -1) || url.startsWith(p));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',   '.jpg':  'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',   '.svg':  'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp',  '.avif': 'image/avif',
  '.woff': 'font/woff',   '.woff2':'font/woff2',  '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3':  'audio/mpeg',  '.ogg':  'audio/ogg',   '.wav': 'audio/wav',
  '.mp4':  'video/mp4',   '.webm': 'video/webm',
  '.wasm': 'application/wasm',
  '.txt':  'text/plain; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
};

/* ---- proxy ------------------------------------------------------- */

/* Hop-by-hop headers belong to ONE connection and must never be forwarded
   (RFC 7230 s6.1). Copying `transfer-encoding: chunked` onto our own response
   while also piping the body makes Node chunk an already-chunked stream: the
   reply goes out malformed, and whatever is in front — a tunnel, a browser —
   reports it as a "502 Bad Gateway" with nothing useful in any log. */
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

function cleanHeaders(headers) {
  const out = {};
  // A Connection header may also NAME further headers to drop.
  const listed = String(headers.connection || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const key of Object.keys(headers)) {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k) || listed.includes(k)) continue;
    out[key] = headers[key];
  }
  return out;
}

/* Reuse sockets to the backend instead of opening one per request. */
const agent = new http.Agent({ keepAlive: true, maxSockets: 64 });

function proxy(req, res) {
  const headers = cleanHeaders(req.headers);
  // Host must name the backend, or Nest builds wrong absolute URLs.
  headers.host = `${BACKEND_HOST}:${BACKEND_PORT}`;

  const upstream = http.request(
    { host: BACKEND_HOST, port: BACKEND_PORT, method: req.method, path: req.url, headers, agent },
    (up) => {
      if (res.destroyed || res.headersSent) { up.resume(); return; }
      res.writeHead(up.statusCode || 502, cleanHeaders(up.headers));
      up.pipe(res);
      up.on('error', () => res.destroy());
    }
  );

  upstream.on('error', () => {
    // The backend is still compiling, or it died. Say so in a shape the
    // frontend's fetch() error handling already understands.
    if (res.destroyed) return;
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({
      statusCode: 503,
      error: 'Backend unavailable',
      message: 'The PlayCarys API is not answering yet. Wait for it to finish starting, then try again.',
    }));
  });

  // If the caller hangs up mid-request, stop talking to the backend about it.
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => upstream.destroy());

  req.pipe(upstream);
}

/* ---- static ------------------------------------------------------ */

function sendFile(res, filePath, stat) {
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stat.size,
    // -c-1 equivalent: an edited game file must show up on refresh.
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveStatic(req, res) {
  let rel;
  try {
    rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  } catch (e) {
    res.writeHead(400).end('Bad request');
    return;
  }

  // Resolve inside ROOT and verify it stayed there, so "/../../keys" cannot
  // walk out of the web root.
  const target = path.resolve(ROOT, '.' + rel);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(target, (err, stat) => {
    if (!err && stat.isDirectory()) {
      const index = path.join(target, 'index.html');
      fs.stat(index, (e2, s2) => {
        if (e2) { res.writeHead(404).end('Not found'); return; }
        sendFile(res, index, s2);
      });
      return;
    }
    if (err) { res.writeHead(404).end('Not found'); return; }
    sendFile(res, target, stat);
  });
}

/* ---- server ------------------------------------------------------ */

const server = http.createServer((req, res) => {
  if (isProxied(req.url)) { proxy(req, res); return; }
  serveStatic(req, res);
});

/* socket.io starts as HTTP then upgrades to a WebSocket. An upgrade is not a
   normal request, so it never reaches the handler above - it has to be piped
   socket-to-socket by hand. Without this, live chess silently falls back to
   long-polling over the tunnel, or fails outright. */
server.on('upgrade', (req, clientSocket, head) => {
  if (!isProxied(req.url)) { clientSocket.destroy(); return; }

  const upstream = net.connect(BACKEND_PORT, BACKEND_HOST, () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const k = req.rawHeaders[i];
      const v = k.toLowerCase() === 'host' ? `${BACKEND_HOST}:${BACKEND_PORT}` : req.rawHeaders[i + 1];
      lines.push(`${k}: ${v}`);
    }
    upstream.write(lines.join('\r\n') + '\r\n\r\n');
    if (head && head.length) upstream.write(head);
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });

  upstream.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => upstream.destroy());
});

/* Node closes an idle keep-alive socket after 5 seconds by default. A tunnel
   client (localtunnel and friends) opens a pool of connections up front and
   holds them open between visitors, so that default quietly kills sockets it
   is still counting on — and a request that lands on one at the wrong moment
   comes back as "502 Bad Gateway". Holding sockets open for 2 minutes matches
   what the tunnel expects. headersTimeout must stay above keepAliveTimeout or
   Node races itself and drops the connection anyway. */
server.keepAliveTimeout = 120000;
server.headersTimeout   = 125000;
server.requestTimeout   = 0;        // uploads of a game bundle can be slow

/**
 * The address other laptops on this Wi-Fi should actually open.
 *
 * Picking the first IPv4 out of `ipconfig` (or os.networkInterfaces) is wrong
 * on any machine with VirtualBox, VMware, Hyper-V, WSL or a VPN: that list is
 * not ordered by usefulness. Measured on this laptop, the naive pick returned
 * 192.168.56.1 — the VirtualBox host-only adapter, reachable by nobody — while
 * the real Wi-Fi address was 10.0.6.93.
 *
 * Asking the OS which source address it would use to reach the internet is
 * right by construction. No packet is sent: connecting a UDP socket just makes
 * the OS run its routing table and bind a local address.
 */
function lanAddress(cb) {
  try {
    const sock = require('dgram').createSocket('udp4');
    sock.connect(53, '8.8.8.8', () => {
      let ip = null;
      try { ip = sock.address().address; } catch (e) { /* ignore */ }
      sock.close();
      cb(ip && ip !== '0.0.0.0' && !ip.startsWith('127.') ? ip : null);
    });
    sock.on('error', () => { try { sock.close(); } catch (e) {} cb(null); });
  } catch (e) { cb(null); }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`front-end   http://localhost:${PORT}`);
  console.log(`api proxy   /api  and  /socket.io  ->  ${BACKEND_HOST}:${BACKEND_PORT}`);
  // run.bat reads this line back out of the log to print the Wi-Fi address.
  lanAddress((ip) => {
    if (ip) console.log(`lan address http://${ip}:${PORT}`);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Close the other server and retry.`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

/* Same files, second origin, no API proxy — see the note on GAMES_PORT. */
const gamesServer = http.createServer((req, res) => {
  if (isProxied(req.url)) {
    // A game reaching for the platform API is either confused or hostile.
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Games cannot call the PlayCarys API directly. Use the SDK.',
    }));
    return;
  }
  serveStatic(req, res);
});

gamesServer.keepAliveTimeout = 120000;
gamesServer.headersTimeout   = 125000;

gamesServer.listen(GAMES_PORT, '0.0.0.0', () => {
  console.log(`games       http://localhost:${GAMES_PORT}   (separate origin, isolated storage)`);
});

gamesServer.on('error', (err) => {
  // Not fatal: without this port games fall back to the main origin, which is
  // how it behaved before. Say so loudly rather than dying.
  if (err.code === 'EADDRINUSE') {
    console.error(`Games port ${GAMES_PORT} is in use — games will run on the main origin (less isolated).`);
  } else {
    console.error(`Games origin unavailable: ${err.message}`);
  }
});
