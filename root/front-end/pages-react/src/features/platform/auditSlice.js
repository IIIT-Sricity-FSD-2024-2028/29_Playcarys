import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import platformApi from '../../services/endpoints/platformApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchAuditLog = createAsyncThunk(
  'audit/fetchAuditLog',
  async (params, { rejectWithValue }) => {
    try {
      const data = await platformApi.getAuditLog(params);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch audit log'));
    }
  }
);

export const recordAuditLog = createAsyncThunk(
  'audit/recordAuditLog',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await platformApi.postAuditLog(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to record audit log'));
    }
  }
);

export const clearAuditLog = createAsyncThunk(
  'audit/clearAuditLog',
  async (_, { rejectWithValue }) => {
    try {
      await platformApi.clearAuditLog();
      return true;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to clear audit log'));
    }
  }
);

const initialState = {
  logs: [],
  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,
  ...initialAsyncState
};

export const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    clearAuditError(state) {
      state.error = null;
    },
    resetAuditMutation(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchAuditLog ─────────────────────────────────────
      .addCase(fetchAuditLog.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchAuditLog.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.logs = action.payload;
      })
      .addCase(fetchAuditLog.rejected, (state, action) => {
        handleRejected(state, action);
      })

      // ── recordAuditLog ────────────────────────────────────
      .addCase(recordAuditLog.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(recordAuditLog.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          state.logs.unshift(action.payload);
        }
      })
      .addCase(recordAuditLog.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || action.error?.message || 'Failed to record audit log';
      })

      // ── clearAuditLog ─────────────────────────────────────
      .addCase(clearAuditLog.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(clearAuditLog.fulfilled, (state) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        state.logs = [];
      })
      .addCase(clearAuditLog.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || action.error?.message || 'Failed to clear audit log';
      });
  }
});

export const { clearAuditError, resetAuditMutation } = auditSlice.actions;

export default auditSlice.reducer;
