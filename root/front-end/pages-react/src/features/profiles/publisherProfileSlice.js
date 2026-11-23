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

const initialState = {
  profilesByUserId: {},
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
      })
      .addCase(fetchPublisherProfile.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.profilesByUserId[action.payload.userId] = action.payload.profile;
      })
      .addCase(fetchPublisherProfile.rejected, (state, action) => {
        handleRejected(state, action);
      });
  }
});

export const { clearPublisherProfileError } = publisherProfileSlice.actions;

export default publisherProfileSlice.reducer;
