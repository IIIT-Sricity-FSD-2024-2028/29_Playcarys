import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import authService from '../../services/authService';
import { AsyncStatus, initialAsyncState, extractErrorMessage, handlePending, handleFulfilled, handleRejected } from '../asyncUtils';

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
        return session;
      }
      if (authService.ENABLE_TEMP_DEV_IDENTITY) {
        const resolved = await authService.resolveDragonSlayerIdentity();
        return resolved;
      }
      return null;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to initialize session'));
    }
  }
);

/**
 * Thunk: auth/login
 * Calls backend auth login endpoint. Stores session metadata in Redux.
 * Note: Token is handled via authService / storage, NOT stored in Redux state.
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res && res.session) {
        authService.setSession(res.session, res.token || res.access_token);
        return res.session;
      }
      if (res && (res.user || res.userId || res.user_id)) {
        const sessionData = res.user || res;
        authService.setSession(sessionData, res.token || res.access_token);
        return sessionData;
      }
      return res;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Login failed'));
    }
  }
);

/**
 * Thunk: auth/logout
 * Releases backend session and clears local session.
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const session = authService.getSession();
      const uid = Number(session?.userId || session?.user_id || session?.id);
      const sToken = session?.sessionToken || session?.session_token;
      if (uid && sToken) {
        await api.post('/auth/release', { user_id: uid, session_token: sToken }).catch(() => {});
      }
      authService.clearSession();
      return true;
    } catch (err) {
      authService.clearSession();
      return rejectWithValue(extractErrorMessage(err, 'Logout failed'));
    }
  }
);

const initialState = {
  user: null,
  isAuthenticated: false,
  ...initialAsyncState
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.error = null;
    },
    clearUser(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.status = AsyncStatus.IDLE;
      state.error = null;
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
      })
      .addCase(initSession.rejected, (state, action) => {
        handleRejected(state, action);
        state.user = null;
        state.isAuthenticated = false;
      })
      // loginUser
      .addCase(loginUser.pending, (state) => {
        handlePending(state);
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        handleRejected(state, action);
        state.user = null;
        state.isAuthenticated = false;
      })
      // logoutUser
      .addCase(logoutUser.pending, (state) => {
        handlePending(state);
      })
      .addCase(logoutUser.fulfilled, (state) => {
        handleFulfilled(state);
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        handleRejected(state, action);
        state.user = null;
        state.isAuthenticated = false;
      });
  }
});

export const { setUser, clearUser, clearAuthError, resetAuthStatus } = authSlice.actions;

// Selectors
export const selectAuthUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError = (state) => state.auth.error;
export const selectUserRole = (state) => state.auth.user?.role || state.auth.user?.role_name || null;

export default authSlice.reducer;

