# Chess page libraries (vendored)

Third-party files this page needs in order to run at all, served from our own
origin instead of from four different CDNs.

| file                        | version | licence | from                          |
| --------------------------- | ------- | ------- | ----------------------------- |
| `jquery-3.6.0.min.js`       | 3.6.0   | MIT     | code.jquery.com               |
| `chessboard-1.0.0.min.js`   | 1.0.0   | MIT     | @chrisoakman/chessboardjs     |
| `chessboard-1.0.0.min.css`  | 1.0.0   | MIT     | @chrisoakman/chessboardjs     |
| `chess.min.js`              | 0.10.3  | BSD-2   | chess.js                      |
| `img/*.png` (12 pieces)     | —       | GFDL/CC | chessboardjs.com "wikipedia"  |

About 176 KB in total. Unmodified upstream builds.

## Why they are in the repo

The page used to load jQuery from `code.jquery.com`, chessboard.js from
`unpkg.com`, chess.js from `cdnjs.cloudflare.com`, and **each of the 32 pieces
on the board** as a separate request to `chessboardjs.com`.

That made a LAN game need the internet. The normal way two people play this is
one laptop running the server and everyone else joining over its Wi-Fi or
hotspot — and on a phone joined to a hotspot with no mobile data, all four of
those hosts are unreachable. jQuery is `undefined`, so the entire page script
dies on its first line and the board never renders. Even if the scripts had
loaded, the pieces would not: 64 empty squares.

The same trap had already been fixed twice elsewhere in this project — the
socket.io client (which killed live chess sync between two laptops) and the
Stockfish engine (which silently downgraded every AI difficulty to a
random-move bot). This is the third and last instance on this page.

## What is still remote, on purpose

* **Google Fonts** — `display=swap`, so a failed request falls back to a system
  font. Cosmetic, never fatal.
* **The Stockfish CDN entry** in `SF_BUILDS` — a last resort tried only after
  both local builds in `../engine/` fail. See `../engine/README.md`.

## Updating

Re-download from the same sources; the piece images mirror at
`https://cdn.jsdelivr.net/gh/oakmac/chessboardjs@master/website/img/chesspieces/wikipedia/<code>.png`
(codes `wK wQ wR wB wN wP bK bQ bR bB bN bP`).

`PIECE_DIR` in `../index.html` is the single place the artwork path is set.
