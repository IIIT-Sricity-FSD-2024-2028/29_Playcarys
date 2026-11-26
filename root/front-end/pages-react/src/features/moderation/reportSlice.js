import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import moderationApi from '../../services/endpoints/moderationApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const reportsAdapter = createEntityAdapter({
  selectId: (report) => String(report.id)
});

export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (params, { rejectWithValue }) => {
    try {
      const data = await moderationApi.getReports(params);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch reports'));
    }
  }
);

export const fetchReportById = createAsyncThunk(
  'reports/fetchReportById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await moderationApi.getReportById(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch report'));
    }
  }
);

export const createReport = createAsyncThunk(
  'reports/createReport',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await moderationApi.createReport(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to submit report'));
    }
  }
);

export const updateReportStatus = createAsyncThunk(
  'reports/updateStatus',
  async ({ id, requester_user_id, status, actionNote }, { rejectWithValue }) => {
    try {
      const data = await moderationApi.updateReportStatus(id, { requester_user_id, status, actionNote });
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update report status'));
    }
  }
);

const initialState = reportsAdapter.getInitialState({
  activeReport: null,
  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,
  ...initialAsyncState
});

export const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setActiveReport(state, action) {
      state.activeReport = action.payload;
    },
    clearReportsError(state) {
      state.error = null;
    },
    resetReportsStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    },
    clearReportsMutationStatus(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchReports
      .addCase(fetchReports.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        handleFulfilled(state);
        reportsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchReports.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchReportById
      .addCase(fetchReportById.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchReportById.fulfilled, (state, action) => {
        if (action.payload) {
          reportsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(fetchReportById.rejected, (state, action) => {
        state.error = action.payload || 'Failed to fetch report';
      })
      // createReport
      .addCase(createReport.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          reportsAdapter.addOne(state, action.payload);
        }
      })
      .addCase(createReport.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to submit report';
      })
      // updateReportStatus
      .addCase(updateReportStatus.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(updateReportStatus.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          reportsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(updateReportStatus.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to update report status';
      })
      // Cross-slice: actOnReport resolves a report if report_id was provided
      .addMatcher(
        (action) => action.type === 'moderation/actOnReport/fulfilled',
        (state, action) => {
          if (action.payload && action.payload.report_id) {
            const reportId = String(action.payload.report_id);
            reportsAdapter.updateOne(state, {
              id: reportId,
              changes: {
                status: 'resolved',
                actionNote: action.payload.action_reason
              }
            });
          }
        }
      );
  }
});

export const {
  setActiveReport,
  clearReportsError,
  resetReportsStatus,
  clearReportsMutationStatus
} = reportSlice.actions;

export default reportSlice.reducer;
