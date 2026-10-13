# Chess engine (vendored)

Stockfish 10.0.2, compiled to WebAssembly and JavaScript by Niklas Fiekas
(<https://github.com/niklasf/stockfish.js>), taken from the npm package
`stockfish.js@10.0.2`.

| file                | what it is                                    | size   |
| ------------------- | --------------------------------------------- | ------ |
| `stockfish.wasm.js` | WebAssembly loader — **the one normally used** | 97 KB  |
| `stockfish.wasm`    | the engine itself                              | 546 KB |
| `stockfish.js`      | asm.js build — fallback only                   | 1.5 MB |
| `COPYING.txt`       | GPL-3.0, the licence Stockfish ships under     |        |

## Why these files are in the repo

**Speed.** The asm.js build the page used to download runs at ~250k nodes/sec in
this browser; the WebAssembly build runs at ~500k. Measured on one middlegame
position, same engine version, hash cleared between runs:

| build   | `go depth 16` | `movetime 3000` | `movetime 6000` |
| ------- | ------------- | --------------- | --------------- |
| asm.js  | 2.8 s         | depth 17        | depth 19        |
| **wasm**| **1.5 s**     | **depth 19**    | **depth 21**    |

That is what let the Elite Grandmaster tier drop from 6 seconds a move to 3
while playing exactly the same depth.

**Offline.** The engine used to be fetched from `cdnjs.cloudflare.com` at run
time. On a LAN with no internet — two laptops on a phone hotspot with no data,
or a campus network that blocks the CDN — the fetch failed and *every*
difficulty silently fell back to the built-in random-move bot. Serving the
engine from our own origin means the AI works with no internet at all.

Note the WASM build is also **smaller** than the asm.js one it replaces.

## Licence

Stockfish is GPL-3.0. `COPYING.txt` is included as that licence requires, and
the files are unmodified upstream builds — re-download them from
`https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/` to verify or update.
