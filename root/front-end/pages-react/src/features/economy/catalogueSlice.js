import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import economyApi from '../../services/endpoints/economyApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchCatalogue = createAsyncThunk(
  'catalogue/fetchCatalogue',
  async (_, { rejectWithValue }) => {
    try {
      const data = await economyApi.getCatalogue();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch catalogue'));
    }
  }
);

export const fetchSkins = createAsyncThunk(
  'catalogue/fetchSkins',
  async (_, { rejectWithValue }) => {
    try {
      const data = await economyApi.getSkins();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch skins'));
    }
  }
);

export const purchaseItem = createAsyncThunk(
  'catalogue/purchase',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await economyApi.purchaseItem(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Purchase failed'));
    }
  }
);

export const equipItem = createAsyncThunk(
  'catalogue/equip',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await economyApi.equipItem(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to equip item'));
    }
  }
);

export const unequipItem = createAsyncThunk(
  'catalogue/unequip',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await economyApi.unequipItem(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to unequip item'));
    }
  }
);

const initialState = {
  items: [],
  skins: [],
  ...initialAsyncState
};

export const catalogueSlice = createSlice({
  name: 'catalogue',
  initialState,
  reducers: {
    clearCatalogueError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalogue.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchCatalogue.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.items = action.payload;
      })
      .addCase(fetchCatalogue.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchSkins.fulfilled, (state, action) => {
        state.skins = action.payload;
      });
  }
});

export const { clearCatalogueError } = catalogueSlice.actions;

export default catalogueSlice.reducer;
