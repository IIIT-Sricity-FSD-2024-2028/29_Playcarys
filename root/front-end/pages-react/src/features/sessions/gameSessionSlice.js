import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import sessionsApi from '../../services/endpoints/sessionsApi';
import {
  AsyncStatus,
  extractErrorMessage
} from '../../app/asyncUtils';

export const sessionsAdapter = createEntityAdapter({
  selectId: (session) => String(session.id ?? session.session_id ?? session.match_id)
});

export const fetchSessions = createAsyncThunk(
  'gameSessions/fetchSessions',
  async (params, { rejectWithValue }) => {
    try {
      const data = await sessionsApi.getSessions(params);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch sessions'));
    }
  }
);

export const fetchSessionById = createAsyncThunk(
  'gameSessions/fetchSessionById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await sessionsApi.getSessionById(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch session details'));
    }
  }
);

export const fetchPlayerSessions = createAsyncThunk(
  'gameSessions/fetchPlayerSessions',
  async (playerId, { rejectWithValue }) => {
    try {
      const data = await sessionsApi.getPlayerSessions(playerId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player sessions'));
    }
  }
);

export const endSession = createAsyncThunk(
  'gameSessions/endSession',
  async (idOrObj, { rejectWithValue }) => {
    try {
      const id = typeof idOrObj === 'object' ? idOrObj.id : idOrObj;
      const data = typeof idOrObj === 'object' && idOrObj.data ? idOrObj.data : (typeof idOrObj === 'object' ? idOrObj : {});
      const cleanData = { ...data };
      delete cleanData.id;
      const res = await sessionsApi.endSession(id, cleanData);
      return res;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to end session'));
    }
  }
);

const initialState = sessionsAdapter.getInitialState({
  listStatus: AsyncStatus.IDLE,
  listError: null,
  detailStatus: AsyncStatus.IDLE,
  detailError: null,
  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,

  // Compatibility aliases
  status: AsyncStatus.IDLE,
  error: null,

  // UI state for moderator sessions view
  ui: {
    statusFilter: '',
    modeFilter: '',
    monitorModalOpen: false,
    selectedSessionId: null,
    confirmEndModalOpen: false,
    copiedSessionId: null,
    toast: null
  }
});

export const gameSessionSlice = createSlice({
  name: 'gameSessions',
  initialState,
  reducers: {
    clearSessionsError(state) {
      state.error = null;
      state.listError = null;
      state.detailError = null;
      state.mutationError = null;
    },
    resetSessionsStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.listStatus = AsyncStatus.IDLE;
      state.detailStatus = AsyncStatus.IDLE;
      state.mutationStatus = AsyncStatus.IDLE;
      state.error = null;
      state.listError = null;
      state.detailError = null;
      state.mutationError = null;
    },

    // UI actions
    setSessionStatusFilter(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.statusFilter = action.payload || '';
    },
    setSessionModeFilter(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.modeFilter = action.payload || '';
    },
    openSessionMonitor(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.monitorModalOpen = true;
      state.ui.selectedSessionId = action.payload != null ? String(action.payload) : null;
    },
    closeSessionMonitor(state) {
      if (!state.ui) state.ui = {};
      state.ui.monitorModalOpen = false;
      state.ui.selectedSessionId = null;
      state.ui.copiedSessionId = null;
    },
    openConfirmEndSession(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.confirmEndModalOpen = true;
      if (action.payload != null) {
        state.ui.selectedSessionId = String(action.payload);
      }
    },
    closeConfirmEndSession(state) {
      if (!state.ui) state.ui = {};
      state.ui.confirmEndModalOpen = false;
    },
    setSessionCopiedId(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.copiedSessionId = action.payload != null ? String(action.payload) : null;
    },
    setSessionToast(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.toast = action.payload || null;
    },
    clearSessionToast(state) {
      if (!state.ui) state.ui = {};
      state.ui.toast = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchSessions ──────────────────────────────────────
      .addCase(fetchSessions.pending, (state) => {
        state.listStatus = AsyncStatus.LOADING;
        state.listError = null;
        state.status = AsyncStatus.LOADING;
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.listStatus = AsyncStatus.SUCCEEDED;
        state.listError = null;
        state.status = AsyncStatus.SUCCEEDED;
        state.error = null;
        sessionsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.listStatus = AsyncStatus.FAILED;
        state.listError = action.payload || 'Failed to fetch sessions';
        state.status = AsyncStatus.FAILED;
        state.error = state.listError;
      })

      // ── fetchSessionById ───────────────────────────────────
      .addCase(fetchSessionById.pending, (state) => {
        state.detailStatus = AsyncStatus.LOADING;
        state.detailError = null;
      })
      .addCase(fetchSessionById.fulfilled, (state, action) => {
        state.detailStatus = AsyncStatus.SUCCEEDED;
        state.detailError = null;
        if (action.payload) {
          sessionsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(fetchSessionById.rejected, (state, action) => {
        state.detailStatus = AsyncStatus.FAILED;
        state.detailError = action.payload || 'Failed to fetch session';
      })

      // ── fetchPlayerSessions ────────────────────────────────
      .addCase(fetchPlayerSessions.fulfilled, (state, action) => {
        if (action.payload && action.payload.length > 0) {
          sessionsAdapter.upsertMany(state, action.payload);
        }
      })

      // ── endSession ─────────────────────────────────────────
      .addCase(endSession.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(endSession.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          sessionsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(endSession.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to end session';
      });
  }
});

export const {
  clearSessionsError,
  resetSessionsStatus,

  // UI actions
  setSessionStatusFilter,
  setSessionModeFilter,
  openSessionMonitor,
  closeSessionMonitor,
  openConfirmEndSession,
  closeConfirmEndSession,
  setSessionCopiedId,
  setSessionToast,
  clearSessionToast
} = gameSessionSlice.actions;

export default gameSessionSlice.reducer;
