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

const initialState = {
  logs: [],
  ...initialAsyncState
};

export const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    clearAuditError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLog.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchAuditLog.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.logs = action.payload;
      })
      .addCase(fetchAuditLog.rejected, (state, action) => {
        handleRejected(state, action);
      });
  }
});

export const { clearAuditError } = auditSlice.actions;

export default auditSlice.reducer;
