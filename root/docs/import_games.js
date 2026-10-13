#!/usr/bin/env node
/**
 * PlayCarys — bulk game catalogue importer
 * ----------------------------------------
 * Pulls games from GameDistribution (and optionally GamePix) and merges them
 * into front-end/live_database.json in your existing `games` schema.
 *
 * IMPORTANT — these games are EMBEDS. They cannot report scores back to
 * PlayCarys, so they are imported with tournament_eligible = false.
 * Only self-hosted games with the PlayCarys SDK can run tournaments.
 *
 * Usage:
 *   node import_games.js --count 200                  # dry run, prints summary
 *   node import_games.js --count 200 --write          # writes to live_database.json
 *   node import_games.js --count 200 --write --gamepix-sid YOUR_SID
 *
 * Requires Node 18+ (built-in fetch). No dependencies.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- config

const DB_PATH = path.join(__dirname, 'front-end', 'live_database.json');

// The publisher row these imported games are attributed to.
// Create this publisher account first, or point at an existing user_id.
const SYSTEM_PUBLISHER_ID = 5;

const GD_FEED = 'https://catalog.api.gamedistribution.com/api/v2.0/rss/All/';
const GP_FEED = 'https://feeds.gamepix.com/v2/json';

// GameDistribution categories -> your genres table.
// Anything unmapped becomes 'Casual' (added to genres below).
const GENRE_MAP = {
  Puzzle: 'Puzzle', Match3: 'Puzzle', Bejeweled: 'Puzzle', Mahjong: 'Puzzle',
  Cards: 'Board', Boardgames: 'Board', Strategy: 'Board', Quiz: 'Board',
  Racing: 'Racing', 'Racing & Driving': 'Racing', Car: 'Racing', Bike: 'Racing',
  Shooter: 'FPS', Shooting: 'FPS', 'Battle': 'Battle Royale', '.io': 'Battle Royale',
  Sports: 'Sports', Basketball: 'Sports', Football: 'Sports', Soccer: 'Sports',
  Pool: 'Sports', Snooker: 'Sports', Golf: 'Sports',
  Agility: 'Arcade', Adventure: 'Arcade', Action: 'Arcade', Arcade: 'Arcade',
  Jump: 'Arcade', Platform: 'Arcade', Casual: 'Casual', Girls: 'Casual',
  Dress: 'Casual', Cooking: 'Casual', Care: 'Casual', Simulation: 'Casual',
  Multiplayer: 'Arcade', Horror: 'Horror',
};

// Genres that must exist in db.genres for the mapping above to resolve.
const REQUIRED_GENRES = [
  { name: 'Sports',  definition: 'Digital versions of real-world sports and cue games.' },
  { name: 'Arcade',  definition: 'Fast, reflex-driven games with short sessions and high scores.' },
  { name: 'Casual',  definition: 'Light, easy-to-learn games playable in a few minutes.' },
];

// ---------------------------------------------------------------- helpers

const args = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true);
};
const WRITE       = args.includes('--write');
const TARGET      = parseInt(flag('count', 200), 10);
const GAMEPIX_SID = flag('gamepix-sid', null);

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const today = () => new Date().toISOString().slice(0, 10);

function mapGenre(categories = []) {
  for (const c of categories) if (GENRE_MAP[c]) return GENRE_MAP[c];
  return 'Casual';
}

// Titles that carry third-party trademark risk. Imported feeds are licensed,
// but you still do not want "Tetris" or "Pac-Man" clones headlining your
// catalogue. These are skipped by default.
const BLOCKED_TITLE = /\b(tetris|pac[\s-]?man|mario|pokemon|pok[eé]mon|minecraft|roblox|among\s?us|fortnite|fnaf|sonic|zelda|candy\s?crush|subway\s?surfer|8\s?ball\s?pool|ludo\s?king|carrom\s?pool|teen\s?patti\s?gold|rummy\s?circle)\b/i;

// Real-money / gambling adjacent. Hard block — India's Online Gaming Act 2025.
const BLOCKED_GAMBLING = /\b(casino|slots?|roulette|blackjack|poker|betting|bet365|baccarat|jackpot|lottery|teen\s?patti|andar\s?bahar|rummy|satta)\b/i;

// ---------------------------------------------------------------- fetchers

async function fetchGameDistribution(want) {
  const out = [];
  const perPage = 100;
  for (let page = 1; out.length < want && page <= 60; page++) {
    const url = `${GD_FEED}?format=json&amount=${perPage}&page=${page}` +
                `&collection=all&subType=All&mobile=All&rewarded=All&type=html5`;
    let batch;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'PlayCarys/1.0' } });
      if (!res.ok) { console.warn(`  GD page ${page}: HTTP ${res.status}, stopping`); break; }
      batch = await res.json();
    } catch (e) { console.warn(`  GD page ${page} failed: ${e.message}`); break; }

    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const g of batch) {
      if (!g.Title || !g.Md5 || !g.Url) continue;
      if (BLOCKED_GAMBLING.test(g.Title) || BLOCKED_GAMBLING.test(g.Description || '')) continue;
      if (BLOCKED_TITLE.test(g.Title)) continue;
      out.push({
        source: 'gamedistribution',
        external_id: g.Md5,
        title: g.Title.trim(),
        desc: (g.Description || '').trim().slice(0, 400),
        instructions: (g.Instructions || '').trim().slice(0, 300),
        // gd_sdk_referrer_url is REQUIRED by GD's terms — it identifies you as
        // the publisher and is how your revenue share is attributed.
        embed_url: `${g.Url}?gd_sdk_referrer_url=https://playcarys.com/games/${slug(g.Title)}`,
        img: (g.Asset || []).find(a => a.includes('512x384')) || (g.Asset || [])[0] || '',
        genre: mapGenre(g.Category),
        mobile: !!g.Mobile,
        width: g.Width || 1280,
        height: g.Height || 720,
      });
      if (out.length >= want) break;
    }
    process.stdout.write(`\r  GameDistribution: ${out.length} games…`);
  }
  console.log('');
  return out;
}

async function fetchGamePix(want, sid) {
  if (!sid) { console.log('  GamePix: skipped (no --gamepix-sid). Free signup at partners.gamepix.com'); return []; }
  const out = [];
  let url = `${GP_FEED}?sid=${encodeURIComponent(sid)}&pagination=96&page=1&order=quality`;
  for (let i = 0; out.length < want && url && i < 40; i++) {
    let feed;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'PlayCarys/1.0' } });
      if (!res.ok) { console.warn(`  GamePix: HTTP ${res.status}, stopping`); break; }
      feed = await res.json();
    } catch (e) { console.warn(`  GamePix failed: ${e.message}`); break; }

    for (const g of (feed.items || [])) {
      if (!g.title || !g.url) continue;
      if (BLOCKED_GAMBLING.test(g.title) || BLOCKED_TITLE.test(g.title)) continue;
      out.push({
        source: 'gamepix',
        external_id: g.id || g.namespace,
        title: g.title.trim(),
        desc: (g.description || '').trim().slice(0, 400),
        instructions: '',
        embed_url: g.url,
        img: g.banner_image || g.image || '',
        genre: mapGenre([g.category]),
        mobile: true,
        width: g.width || 1280,
        height: g.height || 720,
      });
      if (out.length >= want) break;
    }
    url = feed.next_url || null;
    process.stdout.write(`\r  GamePix: ${out.length} games…`);
  }
  console.log('');
  return out;
}

// ---------------------------------------------------------------- transform

function toGameRow(g, id) {
  return {
    game_id: id,
    game_name: g.title,
    game_type: g.genre,
    game_status: 'enabled',
    game_approval_status: 'approved',
    game_publisher: SYSTEM_PUBLISHER_ID,
    desc: g.desc || g.instructions || `${g.title} — instant-play browser game.`,
    players: '1',
    tournamentFormat: null,
    img: g.img,
    rating: 0,
    views: 0,
    submittedDate: today(),
    sessions: 0,

    // --- new fields. These are what keep embeds out of tournaments. ---
    delivery_kind:      'embed',        // embed | builtin | hosted
    game_mode:          'single',       // single | multi
    embed_url:          g.embed_url,
    embed_width:        g.width,
    embed_height:       g.height,
    mobile_ready:       g.mobile,
    catalogue_source:   g.source,       // gamedistribution | gamepix | self
    external_id:        g.external_id,
    tournament_eligible: false,         // <-- CRITICAL. Embeds cannot report scores.
    achievements_eligible: false,       // same reason
    carys_eligible:     false,          // cannot verify play, so cannot award currency
  };
}

// ---------------------------------------------------------------- main

(async () => {
  console.log(`\nPlayCarys catalogue importer — target ${TARGET} games\n`);

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Cannot find ${DB_PATH}. Run this from the project root.`);
    process.exit(1);
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  db.games   = db.games   || [];
  db.genres  = db.genres  || [];

  const existingExternal = new Set(db.games.map(g => g.external_id).filter(Boolean));
  const existingNames    = new Set(db.games.map(g => String(g.game_name).toLowerCase()));
  let nextId = Math.max(0, ...db.games.map(g => Number(g.game_id) || 0)) + 1;

  console.log('Fetching…');
  const half = Math.ceil(TARGET / (GAMEPIX_SID ? 2 : 1));
  const raw = [
    ...await fetchGameDistribution(half),
    ...await fetchGamePix(TARGET - half, GAMEPIX_SID),
  ];

  const fresh = raw.filter(g =>
    !existingExternal.has(g.external_id) &&
    !existingNames.has(g.title.toLowerCase())
  );

  const rows = fresh.slice(0, TARGET).map(g => toGameRow(g, nextId++));

  // ensure genres referenced by the new rows exist
  let genreId = Math.max(0, ...db.genres.map(x => Number(x.id) || 0));
  for (const rg of REQUIRED_GENRES) {
    if (!db.genres.some(x => x.name === rg.name)) db.genres.push({ id: ++genreId, ...rg });
  }

  // ---- summary
  const byGenre = rows.reduce((a, r) => (a[r.game_type] = (a[r.game_type] || 0) + 1, a), {});
  console.log(`\nFetched ${raw.length}, new after dedupe ${fresh.length}, importing ${rows.length}`);
  console.log(`Catalogue: ${db.games.length} -> ${db.games.length + rows.length}`);
  console.log('\nBy genre:');
  for (const [k, v] of Object.entries(byGenre).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(15)} ${String(v).padStart(4)}`);
  }
  console.log('\nSample:');
  rows.slice(0, 5).forEach(r => console.log(`  #${r.game_id} ${r.game_name} [${r.game_type}]`));

  if (!WRITE) {
    fs.writeFileSync('imported_games_preview.json', JSON.stringify(rows, null, 2));
    console.log('\nDRY RUN. Wrote imported_games_preview.json — inspect it, then re-run with --write');
    return;
  }

  const backup = `${DB_PATH}.backup-${Date.now()}`;
  fs.copyFileSync(DB_PATH, backup);
  db.games.push(...rows);
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log(`\nWritten. Backup at ${path.basename(backup)}`);
  console.log(`\nNOTE: live_database.json is now ~${Math.round(fs.statSync(DB_PATH).size / 1024)} KB.`);
  console.log('Every page load ships this whole file to the browser. Paginate the games');
  console.log('table before importing more than ~200 games, or the catalogue page will crawl.');
})();
