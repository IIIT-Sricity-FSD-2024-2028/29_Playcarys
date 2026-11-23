/**
 * Shared Async Status Constants and Error Extractors
 *
 * Provides standard async lifecycle statuses and consistent error formatting
 * across all domain slices in the Playcarys Redux architecture.
 */

export const AsyncStatus = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed'
});

export const initialAsyncState = Object.freeze({
  status: AsyncStatus.IDLE,
  error: null
});

/**
 * Extracts a human-readable error message from an API error or rejected thunk action.
 * Gracefully handles backend error objects, arrays, and standard Error instances.
 *
 * @param {any} err - The caught error or payload
 * @param {string} fallback - Fallback message if extraction fails
 * @returns {string} Clean error string
 */
export function extractErrorMessage(err, fallback = 'An unexpected error occurred') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err.message) {
    if (Array.isArray(err.message)) return err.message.join(', ');
    if (typeof err.message === 'string') return err.message;
  }
  if (err.error && typeof err.error === 'string') return err.error;
  if (err.statusText && typeof err.statusText === 'string') return err.statusText;
  return fallback;
}

/**
 * Helper to mutate slice state on async pending.
 */
export function handlePending(state, statusKey = 'status') {
  state[statusKey] = AsyncStatus.LOADING;
  state.error = null;
}

/**
 * Helper to mutate slice state on async fulfilled.
 */
export function handleFulfilled(state, statusKey = 'status') {
  state[statusKey] = AsyncStatus.SUCCEEDED;
  state.error = null;
}

/**
 * Helper to mutate slice state on async rejected.
 */
export function handleRejected(state, action, statusKey = 'status') {
  state[statusKey] = AsyncStatus.FAILED;
  state.error = action.payload || action.error?.message || 'Operation failed';
}
