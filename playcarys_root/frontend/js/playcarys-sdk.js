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

  // Listen for initialization packet from parent wrapper
  window.addEventListener("message", (event) => {
    // Basic security check (should be properly validated in prod)
    if (event.data && event.data.type === 'PLAYCARYS_INIT_ACK') {
      isInitialized = true;
      sessionId = event.data.sessionId;
      console.log("[PlayCarys SDK] Successfully connected to platform wrapper.");
      
      if(typeof window.onPlayCarysReady === 'function') {
        window.onPlayCarysReady({ sessionId });
      }
    }
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
     * Request an opponent or fetch current session state.
     */
    getSessionState: function() {
      // In a real SDK, this would return a Promise resolved by postMessage
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'PLAYCARYS_REQ_STATE',
          sessionId: sessionId
        }, "*");
      }
    }
  };
})();

// Auto-export for modern bundlers or attach to window
window.PlayCarys = PlayCarys;
