import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import profilesApi from '../../services/endpoints/profilesApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchPublisherProfile = createAsyncThunk(
  'publisherProfile/fetchProfile',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await profilesApi.getPublisherProfile(userId);
      return { userId: String(userId), profile: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher profile'));
    }
  }
);

export const fetchPublisherProfiles = createAsyncThunk(
  'publisherProfile/fetchProfiles',
  async (_, { rejectWithValue }) => {
    try {
      return await profilesApi.getPublisherProfiles();
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher profiles'));
    }
  }
);

export const fetchPublisherOnboarding = createAsyncThunk(
  'publisherProfile/fetchOnboarding',
  async (userId, { rejectWithValue }) => {
    try {
      const profile = await profilesApi.getPublisherOnboarding(userId);
      return { userId: String(userId), profile };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher onboarding'));
    }
  }
);

export const updatePublisherOnboarding = createAsyncThunk(
  'publisherProfile/updateOnboarding',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const profile = await profilesApi.updatePublisherOnboarding(userId, data);
      return { userId: String(userId), profile };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update publisher onboarding'));
    }
  }
);

export const completePublisherDemoVerification = createAsyncThunk(
  'publisherProfile/completeDemoVerification',
  async (userId, { rejectWithValue }) => {
    try {
      const profile = await profilesApi.completePublisherDemoVerification();
      return { userId: String(userId), profile };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to complete demo verification'));
    }
  }
);

const initialState = {
  profilesByUserId: {},
  listStatus: AsyncStatus.IDLE,
  listError: null,
  detailStatus: AsyncStatus.IDLE,
  detailError: null,
  ...initialAsyncState
};

export const publisherProfileSlice = createSlice({
  name: 'publisherProfile',
  initialState,
  reducers: {
    clearPublisherProfileError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublisherProfile.pending, (state) => {
        handlePending(state);
        state.detailStatus = AsyncStatus.LOADING;
        state.detailError = null;
      })
      .addCase(fetchPublisherProfile.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.profilesByUserId[action.payload.userId] = action.payload.profile;
        state.detailStatus = AsyncStatus.SUCCEEDED;
      })
      .addCase(fetchPublisherProfile.rejected, (state, action) => {
        handleRejected(state, action);
        state.detailStatus = AsyncStatus.FAILED;
        state.detailError = state.error;
      })
      .addCase(fetchPublisherProfiles.pending, (state) => {
        state.listStatus = AsyncStatus.LOADING;
        state.listError = null;
      })
      .addCase(fetchPublisherProfiles.fulfilled, (state, action) => {
        state.listStatus = AsyncStatus.SUCCEEDED;
        action.payload.forEach((profile) => {
          const id = profile.userId ?? profile.user_id ?? profile.id;
          if (id != null) state.profilesByUserId[String(id)] = profile;
        });
      })
      .addCase(fetchPublisherProfiles.rejected, (state, action) => {
        state.listStatus = AsyncStatus.FAILED;
        state.listError = action.payload || action.error?.message;
      })
      .addCase(fetchPublisherOnboarding.fulfilled, (state, action) => {
        state.profilesByUserId[action.payload.userId] = action.payload.profile;
      })
      .addCase(updatePublisherOnboarding.fulfilled, (state, action) => {
        state.profilesByUserId[action.payload.userId] = action.payload.profile;
      })
      .addCase(completePublisherDemoVerification.fulfilled, (state, action) => {
        state.profilesByUserId[action.payload.userId] = action.payload.profile;
      });
  }
});

export const { clearPublisherProfileError } = publisherProfileSlice.actions;

export default publisherProfileSlice.reducer;
