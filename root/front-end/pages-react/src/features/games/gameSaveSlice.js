import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import gamesApi from '../../services/endpoints/gamesApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchGameSave = createAsyncThunk(
  'gameSaves/fetchSave',
  async (arg, { rejectWithValue }) => {
    try {
      const { id, userId } = typeof arg === 'object' ? arg : { id: arg };
      const data = await gamesApi.getGameSave(id, userId);
      return { id: String(id), userId: userId != null ? String(userId) : null, save: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch game save'));
    }
  }
);

export const putGameSave = createAsyncThunk(
  'gameSaves/putSave',
  async ({ id, saveData }, { rejectWithValue }) => {
    try {
      const data = await gamesApi.putGameSave(id, saveData);
      return { id: String(id), save: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to put game save'));
    }
  }
);

const initialState = {
  savesByGameId: {},
  statusByGameId: {},
  errorByGameId: {},
  ...initialAsyncState
};

export const gameSaveSlice = createSlice({
  name: 'gameSaves',
  initialState,
  reducers: {
    clearGameSaveError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGameSave.pending, (state, action) => {
        handlePending(state);
        const id = String(typeof action.meta.arg === 'object' ? action.meta.arg.id : action.meta.arg);
        state.statusByGameId[id] = AsyncStatus.LOADING;
        state.errorByGameId[id] = null;
      })
      .addCase(fetchGameSave.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.savesByGameId[action.payload.id] = action.payload.save;
        state.statusByGameId[action.payload.id] = AsyncStatus.SUCCEEDED;
      })
      .addCase(fetchGameSave.rejected, (state, action) => {
        handleRejected(state, action);
        const id = String(typeof action.meta.arg === 'object' ? action.meta.arg.id : action.meta.arg);
        state.statusByGameId[id] = AsyncStatus.FAILED;
        state.errorByGameId[id] = state.error;
      })
      .addCase(putGameSave.pending, (state, action) => {
        state.statusByGameId[String(action.meta.arg.id)] = AsyncStatus.LOADING;
        state.errorByGameId[String(action.meta.arg.id)] = null;
      })
      .addCase(putGameSave.fulfilled, (state, action) => {
        state.savesByGameId[action.payload.id] = action.payload.save;
        state.statusByGameId[action.payload.id] = AsyncStatus.SUCCEEDED;
      })
      .addCase(putGameSave.rejected, (state, action) => {
        const id = String(action.meta.arg.id);
        state.statusByGameId[id] = AsyncStatus.FAILED;
        state.errorByGameId[id] = action.payload || action.error?.message;
      });
  }
});

export const { clearGameSaveError } = gameSaveSlice.actions;

export default gameSaveSlice.reducer;
