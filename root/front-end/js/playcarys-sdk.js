/**
 * PlayCarys Developer SDK
 * Allows third-party Web Games (HTML5) to communicate securely with the PlayCarys platform via postMessage.
 *
 * Usage:
 * <script src="https://playcarys.com/sdk/playcarys-sdk.js"></script>
 * PlayCarys.init('api_key_here');
 */

const PlayCarys = (function() {
  let isInitialized = false;
  let gameId = null;
  let sessionId = null;

  // Requests waiting on an answer from the host, keyed by the id we sent.
  //
  // The SDK used to be one-way for everything except the init handshake:
  // getSessionState() posted PLAYCARYS_REQ_STATE, the host dutifully replied
  // with PLAYCARYS_STATE — and nothing listened for it. The reply arrived and
  // was dropped, so the function could never return an answer to anybody. Same
  // shape of gap meant there was no way to READ a save, only to be told things.
  const pending = new Map();
  let nextReqId = 1;

  function ask(type, payload) {
    if (!(window.parent && window.parent !== window)) {
      return Promise.reject(new Error('Not running on the PlayCarys platform.'));
    }
    const requestId = 'r' + (nextReqId++);
    return new Promise((resolve, reject) => {
      // Never leave a caller awaiting forever if the host does not answer.
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error('PlayCarys did not respond in time.'));
      }, 8000);
      pending.set(requestId, { resolve, reject, timer });
      window.parent.postMessage(
        Object.assign({ type, requestId, sessionId, gameId }, payload || {}),
        '*'
      );
    });
  }

  function settle(requestId, err, value) {
    const entry = pending.get(requestId);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(requestId);
    if (err) entry.reject(new Error(err)); else entry.resolve(value);
  }

  // Listen for initialization packet from parent wrapper
  window.addEventListener("message", (event) => {
    const d = event.data;
    if (!d || typeof d !== 'object') return;

    if (d.type === 'PLAYCARYS_INIT_ACK') {
      isInitialized = true;
      sessionId = d.sessionId;
      console.log("[PlayCarys SDK] Successfully connected to platform wrapper.");

      if(typeof window.onPlayCarysReady === 'function') {
        window.onPlayCarysReady({ sessionId });
      }
      return;
    }

    // Replies to something this SDK asked for.
    if (d.type === 'PLAYCARYS_STATE')  { settle(d.requestId, d.error, d); return; }
    if (d.type === 'PLAYCARYS_LOADED') { settle(d.requestId, d.error, d.data); return; }
    if (d.type === 'PLAYCARYS_SAVED')  { settle(d.requestId, d.error, d); return; }
  });

  return {
    init: function(developerApiKey, localGameId) {
      gameId = localGameId;
      console.log("[PlayCarys SDK] Initializing...", developerApiKey);
      // Ask parent window to sync session data
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'PLAYCARYS_INIT_REQ',
          gameId: gameId,
          apiKey: developerApiKey
        }, "*");
      } else {
        console.warn("[PlayCarys SDK] Not running inside an iframe. Running in standalone mode.");
      }
    },

    /**
     * Submit final score or match result to the platform.
     * @param {Object} resultData - e.g., { winner: 'user_123', reason: 'checkmate' }
     */
    submitResult: function(resultData) {
      if (!isInitialized && window.parent !== window) {
        console.warn("[PlayCarys SDK] Not initialized yet.");
        return;
      }
      
      console.log("[PlayCarys SDK] Submitting result:", resultData);
      
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'PLAYCARYS_SUBMIT_RESULT',
          sessionId: sessionId,
          result: resultData
        }, "*");
      }
    },

    /**
     * Report that the player earned one of this game's declared achievements.
     *
     * Pass only the CODE you registered on the publish page — never a reward.
     * The platform looks up what that code is worth, grants it once per player,
     * and awards any title attached to it. Calling this again for an
     * achievement the player already has is harmless and does nothing.
     *
     *   PlayCarys.unlockAchievement('first_win');
     *
     * @param {string} code the achievement's code, e.g. 'first_win'
     */
    unlockAchievement: function(code) {
      if (!code || typeof code !== 'string') {
        console.warn('[PlayCarys SDK] unlockAchievement needs an achievement code.');
        return;
      }
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'PLAYCARYS_UNLOCK_ACHIEVEMENT',
          sessionId: sessionId,
          gameId: gameId,
          code: code
        }, "*");
      } else {
        console.warn('[PlayCarys SDK] Not running on the platform — achievement "' + code + '" not recorded.');
      }
    },

    /**
     * Current match and player, as the platform sees them.
     *
     * Returns a Promise now. It used to post the request and return undefined —
     * the host replied with PLAYCARYS_STATE and the SDK had no listener, so the
     * answer was thrown away every single time and this function could not do
     * the one thing its name promises.
     *
     *   const state = await PlayCarys.getSessionState();
     *   console.log(state.player.name);
     */
    getSessionState: function() {
      return ask('PLAYCARYS_REQ_STATE');
    },

    /**
     * Save this game's own state for the current player.
     *
     * The platform gives you the storage and never looks inside it. Coins,
     * diamonds, unlocked levels, settings, whatever your game needs — it is
     * yours. It comes back from PlayCarys.load() on any browser the player
     * signs in from, which is the point: on a phone the OS gives a game durable
     * per-user storage, and localStorage does not, so progress earned on one
     * laptop used to be stranded there.
     *
     * ONE blob per player per game, replaced whole. Max 64 KB.
     *
     *   await PlayCarys.save({ coins: 1250, diamonds: 8 });
     *
     * @param {Object|string} data anything JSON-serialisable
     * @returns {Promise<{bytes:number}>}
     */
    save: function(data) {
      if (data === undefined) return Promise.reject(new Error('save() needs something to save.'));
      return ask('PLAYCARYS_SAVE', { data: data });
    },

    /**
     * Read back whatever this game last saved for the current player.
     *
     * Resolves to null when the player has never saved — a first run is an
     * ordinary case, so handle it with a default rather than as an error:
     *
     *   const wallet = (await PlayCarys.load()) || { coins: 0 };
     *
     * @returns {Promise<Object|null>}
     */
    load: function() {
      return ask('PLAYCARYS_LOAD');
    }
  };
})();

// Auto-export for modern bundlers or attach to window
window.PlayCarys = PlayCarys;
