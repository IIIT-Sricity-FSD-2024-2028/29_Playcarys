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
  async (viewerId, { rejectWithValue }) => {
    try {
      const data = await economyApi.getCatalogue(viewerId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch catalogue'));
    }
  }
);

export const fetchSkins = createAsyncThunk(
  'catalogue/fetchSkins',
  async (userIds, { rejectWithValue }) => {
    try {
      const data = await economyApi.getSkins(userIds);
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
  plans: [],
  subscription: null,
  skins: {},
  balanceCarys: 0,
  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,
  ...initialAsyncState
};

export const catalogueSlice = createSlice({
  name: 'catalogue',
  initialState,
  reducers: {
    clearCatalogueError(state) {
      state.error = null;
    },
    resetCatalogueStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    },
    clearCatalogueMutationStatus(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchCatalogue
      .addCase(fetchCatalogue.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchCatalogue.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.items = action.payload.items || [];
        state.plans = action.payload.plans || [];
        state.subscription = action.payload.subscription || null;
        if (action.payload.balance_carys != null) {
          state.balanceCarys = action.payload.balance_carys;
        }
      })
      .addCase(fetchCatalogue.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchSkins
      .addCase(fetchSkins.fulfilled, (state, action) => {
        state.skins = action.payload;
      })
      // purchaseItem
      .addCase(purchaseItem.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(purchaseItem.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload?.balance_carys != null) {
          state.balanceCarys = action.payload.balance_carys;
        }
        const grantedId = action.payload?.item?.id;
        if (grantedId != null) {
          state.items = state.items.map((i) =>
            String(i.id) === String(grantedId) ? { ...i, owned: true } : i
          );
        }
      })
      .addCase(purchaseItem.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Purchase failed';
      })
      // equipItem
      .addCase(equipItem.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(equipItem.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const equipped = action.payload?.equipped;
        if (equipped) {
          const category = equipped.category;
          state.items = state.items.map((i) => {
            if (i.category === category) {
              return {
                ...i,
                is_equipped: String(i.id) === String(equipped.id)
              };
            }
            return i;
          });
        }
      })
      .addCase(equipItem.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to equip item';
      })
      // unequipItem
      .addCase(unequipItem.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(unequipItem.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const targetId = String(action.meta?.arg?.item_id || action.payload?.unequipped?.id);
        state.items = state.items.map((i) =>
          String(i.id) === targetId ? { ...i, is_equipped: false } : i
        );
      })
      .addCase(unequipItem.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to unequip item';
      })
      // Cross-slice: updates from wallet subscriptions/stipends
      .addMatcher(
        (action) => action.type === 'wallet/subscribe/fulfilled',
        (state, action) => {
          if (action.payload?.subscription) {
            state.subscription = action.payload.subscription;
          }
        }
      )
      .addMatcher(
        (action) => action.type === 'wallet/claimStipend/fulfilled',
        (state, action) => {
          if (action.payload?.balance_carys != null) {
            state.balanceCarys = action.payload.balance_carys;
          }
        }
      );
  }
});

export const {
  clearCatalogueError,
  resetCatalogueStatus,
  clearCatalogueMutationStatus
} = catalogueSlice.actions;

export default catalogueSlice.reducer;
