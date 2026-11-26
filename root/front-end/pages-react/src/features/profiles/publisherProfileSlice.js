import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import profilesApi from '../../services/endpoints/profilesApi';
import publisherService from '../../services/publisherService';
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

export const fetchPublisherApplications = createAsyncThunk(
  'publisherProfile/fetchApplications',
  async (_, { rejectWithValue }) => {
    try {
      return await profilesApi.getPublisherApplications();
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher applications'));
    }
  }
);

export const reviewPublisherApplication = createAsyncThunk(
  'publisherProfile/reviewApplication',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      return { userId: String(userId), profile: await profilesApi.reviewPublisherApplication(userId, data) };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to save publisher review'));
    }
  }
);

export const fetchPublisherProfileSuite = createAsyncThunk(
  'publisherProfile/fetchProfileSuite',
  async (userId, { rejectWithValue }) => {
    try {
      const [profile, onboarding, apiKeys] = await Promise.all([
        publisherService.getPublisherFullProfile(userId),
        publisherService.getOnboarding(userId),
        publisherService.getApiKeys(userId)
      ]);
      return { userId: String(userId), profile, onboarding, apiKeys };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher profile'));
    }
  }
);

export const updatePublisherProfileDetails = createAsyncThunk(
  'publisherProfile/updateProfileDetails',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const result = await publisherService.updatePublisherProfile(userId, data);
      return { userId: String(userId), result };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update publisher profile'));
    }
  }
);

export const fetchPublisherApiKeys = createAsyncThunk(
  'publisherProfile/fetchApiKeys',
  async (userId, { rejectWithValue }) => {
    try {
      return { userId: String(userId), apiKeys: await publisherService.getApiKeys(userId) };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher API keys'));
    }
  }
);

export const createPublisherApiKey = createAsyncThunk(
  'publisherProfile/createApiKey',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      return { userId: String(userId), result: await publisherService.createApiKey(data) };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create publisher API key'));
    }
  }
);

export const revokePublisherApiKey = createAsyncThunk(
  'publisherProfile/revokeApiKey',
  async ({ userId, keyId }, { rejectWithValue }) => {
    try {
      await publisherService.revokeApiKey(keyId);
      return { userId: String(userId), keyId: String(keyId) };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to revoke publisher API key'));
    }
  }
);

const initialState = {
  profilesByUserId: {},
  profileSuitesByUserId: {},
  apiKeysByUserId: {},
  suiteStatus: AsyncStatus.IDLE,
  suiteError: null,
  apiKeysStatus: AsyncStatus.IDLE,
  apiKeysError: null,
  profileMutationStatus: AsyncStatus.IDLE,
  profileMutationError: null,
  applications: [],
  applicationsStatus: AsyncStatus.IDLE,
  applicationsError: null,
  reviewStatus: AsyncStatus.IDLE,
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
      })
      .addCase(fetchPublisherApplications.pending, (state) => {
        state.applicationsStatus = AsyncStatus.LOADING;
        state.applicationsError = null;
      })
      .addCase(fetchPublisherApplications.fulfilled, (state, action) => {
        state.applicationsStatus = AsyncStatus.SUCCEEDED;
        state.applications = action.payload;
      })
      .addCase(fetchPublisherApplications.rejected, (state, action) => {
        state.applicationsStatus = AsyncStatus.FAILED;
        state.applicationsError = action.payload || action.error?.message;
      })
      .addCase(reviewPublisherApplication.pending, (state) => {
        state.reviewStatus = AsyncStatus.LOADING;
        state.applicationsError = null;
      })
      .addCase(reviewPublisherApplication.fulfilled, (state, action) => {
        state.reviewStatus = AsyncStatus.SUCCEEDED;
        state.profilesByUserId[action.payload.userId] = action.payload.profile;
        state.applications = state.applications.filter((application) => String(application.user_id || application.id) !== action.payload.userId);
      })
      .addCase(reviewPublisherApplication.rejected, (state, action) => {
        state.reviewStatus = AsyncStatus.FAILED;
        state.applicationsError = action.payload || action.error?.message;
      })
      .addCase(fetchPublisherProfileSuite.pending, (state) => {
        state.suiteStatus = AsyncStatus.LOADING;
        state.suiteError = null;
      })
      .addCase(fetchPublisherProfileSuite.fulfilled, (state, action) => {
        const { userId, profile, onboarding, apiKeys } = action.payload;
        state.suiteStatus = AsyncStatus.SUCCEEDED;
        state.profileSuitesByUserId[userId] = profile;
        state.profilesByUserId[userId] = onboarding;
        state.apiKeysByUserId[userId] = apiKeys || [];
      })
      .addCase(fetchPublisherProfileSuite.rejected, (state, action) => {
        state.suiteStatus = AsyncStatus.FAILED;
        state.suiteError = action.payload || 'Failed to fetch publisher profile';
      })
      .addCase(updatePublisherProfileDetails.pending, (state) => {
        state.profileMutationStatus = AsyncStatus.LOADING;
        state.profileMutationError = null;
      })
      .addCase(updatePublisherProfileDetails.fulfilled, (state, action) => {
        state.profileMutationStatus = AsyncStatus.SUCCEEDED;
        const suite = state.profileSuitesByUserId[action.payload.userId];
        if (suite) {
          suite.user = { ...suite.user, ...action.payload.result.updatedUser };
          suite.profile = { ...suite.profile, ...action.payload.result.updatedProfile };
        }
      })
      .addCase(updatePublisherProfileDetails.rejected, (state, action) => {
        state.profileMutationStatus = AsyncStatus.FAILED;
        state.profileMutationError = action.payload || 'Failed to update publisher profile';
      })
      .addCase(fetchPublisherApiKeys.pending, (state) => {
        state.apiKeysStatus = AsyncStatus.LOADING;
        state.apiKeysError = null;
      })
      .addCase(fetchPublisherApiKeys.fulfilled, (state, action) => {
        state.apiKeysStatus = AsyncStatus.SUCCEEDED;
        state.apiKeysByUserId[action.payload.userId] = action.payload.apiKeys || [];
      })
      .addCase(fetchPublisherApiKeys.rejected, (state, action) => {
        state.apiKeysStatus = AsyncStatus.FAILED;
        state.apiKeysError = action.payload || 'Failed to fetch publisher API keys';
      })
      .addCase(createPublisherApiKey.fulfilled, (state, action) => {
        const keys = state.apiKeysByUserId[action.payload.userId] || [];
        state.apiKeysByUserId[action.payload.userId] = [action.payload.result, ...keys];
      })
      .addCase(revokePublisherApiKey.fulfilled, (state, action) => {
        state.apiKeysByUserId[action.payload.userId] = (state.apiKeysByUserId[action.payload.userId] || [])
          .filter((key) => String(key.id || key.key_id) !== action.payload.keyId);
      });
  }
});

export const { clearPublisherProfileError } = publisherProfileSlice.actions;

export default publisherProfileSlice.reducer;
