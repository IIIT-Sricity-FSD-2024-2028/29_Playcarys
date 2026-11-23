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
  async (id, { rejectWithValue }) => {
    try {
      const data = await gamesApi.getGameSave(id);
      return { id: String(id), save: data };
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
      .addCase(fetchGameSave.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchGameSave.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.savesByGameId[action.payload.id] = action.payload.save;
      })
      .addCase(fetchGameSave.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(putGameSave.fulfilled, (state, action) => {
        state.savesByGameId[action.payload.id] = action.payload.save;
      });
  }
});

export const { clearGameSaveError } = gameSaveSlice.actions;

export default gameSaveSlice.reducer;
