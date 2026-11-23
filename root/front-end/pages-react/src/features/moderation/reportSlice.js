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
  async (_, { rejectWithValue }) => {
    try {
      const data = await moderationApi.getReports();
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
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const data = await moderationApi.updateReportStatus(id, status);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update report status'));
    }
  }
);

const initialState = reportsAdapter.getInitialState({
  activeReport: null,
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
      .addCase(fetchReportById.fulfilled, (state, action) => {
        if (action.payload) {
          reportsAdapter.upsertOne(state, action.payload);
        }
      })
      // createReport
      .addCase(createReport.fulfilled, (state, action) => {
        if (action.payload) {
          reportsAdapter.addOne(state, action.payload);
        }
      })
      // updateReportStatus
      .addCase(updateReportStatus.fulfilled, (state, action) => {
        if (action.payload) {
          reportsAdapter.upsertOne(state, action.payload);
        }
      });
  }
});

export const { setActiveReport, clearReportsError, resetReportsStatus } = reportSlice.actions;

export default reportSlice.reducer;
