import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authApi from '../../services/endpoints/authApi';
import authService from '../../services/authService';
import { normalizeEntity } from '../../services/endpoints/normalize';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

/**
 * Thunk: auth/initSession
 * Initializes the current session from authService or development identity fallback.
 * Note: Tokens/passwords are NOT stored in the Redux state.
 */
export const initSession = createAsyncThunk(
  'auth/initSession',
  async (_, { rejectWithValue }) => {
    try {
      if (authService.hasAuthenticatedSession()) {
        const session = authService.getSession();
        return sessionUser(session);
      }
      if (authService.ENABLE_TEMP_DEV_IDENTITY) {
        const isPlayerRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/player');
        const existingSession = authService.getSession();

        if (existingSession && existingSession.role === 'player' && Number(existingSession.userId || existingSession.id) === 7) {
          try {
            const fresh = await authService.resolveDragonSlayerIdentity();
            return sessionUser(fresh);
          } catch (e) {
            return sessionUser(existingSession);
          }
        }

        if (isPlayerRoute || (existingSession && existingSession.role === 'player')) {
          try {
            const resolved = await authService.resolveDragonSlayerIdentity();
            return sessionUser(resolved);
          } catch (err) {
            throw err;
          }
        }

        return existingSession ? sessionUser(existingSession) : null;
      }

      const sess = authService.getSession();
      return sess?.role === 'guest' ? sessionUser(sess) : null;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to initialize session'));
    }
  }
);

/**
 * Thunk: auth/establishSession
 * Used after the landing page has already verified the password with the server
 * (landingAuthService.serverLogin, which also handles the 409 device hand-off) or
 * after a registration. Persists the session + API token through authService and
 * publishes the user to Redux, so the slice is the single owner of session state.
 * Note: the token is handed to authService / storage, NOT stored in Redux state.
 */
export const establishSession = createAsyncThunk(
  'auth/establishSession',
  async ({ session, token }, { rejectWithValue }) => {
    try {
      if (!session) return null;
      authService.setSession(session, token);
      return sessionUser(session);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to start session'));
    }
  }
);

/**
 * Thunk: auth/logout
 * Releases backend session and clears local session.
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const currentUser = state.auth?.user;
      const sess = authService.getSession();
      const uid = Number(currentUser?.id || currentUser?.userId || currentUser?.user_id || sess?.userId || sess?.id);
      const sToken = sess?.sessionToken || sess?.session_token;

      if (uid && sToken) {
        await authApi.release({ user_id: uid, session_token: sToken }).catch(() => {});
      }
      authService.clearSession();
      return true;
    } catch (err) {
      authService.clearSession();
      return rejectWithValue(extractErrorMessage(err, 'Logout failed'));
    }
  }
);

// Keep session credentials in authService, not in the Redux user object.
function sessionUser(session) {
  if (!session) return null;
  const { token, access_token, apiToken, sessionToken, session_token, active_session_token, password, ...user } = session;
  return normalizeEntity(user);
}

const initialState = {
  user: null,
  isAuthenticated: false,
  devIdentityError: null,
  ...initialAsyncState
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      const user = action.payload ? sessionUser(action.payload) : null;
      state.user = user;
      state.isAuthenticated = Boolean(user);
      state.error = null;
    },
    clearUser(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.status = AsyncStatus.IDLE;
      state.error = null;
      state.devIdentityError = null;
    },
    setDevIdentityError(state, action) {
      state.devIdentityError = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
    },
    resetAuthStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // initSession
      .addCase(initSession.pending, (state) => {
        handlePending(state);
      })
      .addCase(initSession.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.user = action.payload;
        state.isAuthenticated = Boolean(action.payload);
        state.devIdentityError = null;
      })
      .addCase(initSession.rejected, (state, action) => {
        handleRejected(state, action);
        state.user = null;
        state.isAuthenticated = false;
        state.devIdentityError = action.payload;
      })
      // establishSession
      .addCase(establishSession.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.user = action.payload;
        state.isAuthenticated = Boolean(action.payload);
        state.devIdentityError = null;
      })
      .addCase(establishSession.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // logoutUser
      .addCase(logoutUser.pending, (state) => {
        handlePending(state);
      })
      .addCase(logoutUser.fulfilled, (state) => {
        handleFulfilled(state);
        state.user = null;
        state.isAuthenticated = false;
        state.devIdentityError = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        handleFulfilled(state);
        state.user = null;
        state.isAuthenticated = false;
      });
  }
});

export const {
  setUser,
  clearUser,
  setDevIdentityError,
  clearAuthError,
  resetAuthStatus
} = authSlice.actions;

export default authSlice.reducer;
