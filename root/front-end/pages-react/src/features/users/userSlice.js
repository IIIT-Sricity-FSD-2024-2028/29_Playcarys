import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import usersApi from '../../services/endpoints/usersApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const usersAdapter = createEntityAdapter({
  selectId: (user) => String(user.id)
});

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      const data = await usersApi.getUsers(params);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch users'));
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'users/fetchUserById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await usersApi.getUserById(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch user'));
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await usersApi.createUser(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create user'));
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, data: dto }, { rejectWithValue }) => {
    try {
      const data = await usersApi.updateUser(id, dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update user'));
    }
  }
);

export const updateUserStatus = createAsyncThunk(
  'users/updateUserStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const data = await usersApi.updateUserStatus(id, { status });
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update user status'));
    }
  }
);

export const assignUserRole = createAsyncThunk(
  'users/assignUserRole',
  async ({ id, role_id }, { rejectWithValue }) => {
    try {
      const data = await usersApi.assignUserRole(id, { role_id });
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to assign user role'));
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      await usersApi.deleteUser(id);
      return String(id);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete user'));
    }
  }
);

export const fetchRoles = createAsyncThunk(
  'users/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const roles = await usersApi.getRoles();
      return roles;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch roles'));
    }
  }
);

const initialState = usersAdapter.getInitialState({
  roles: [],
  ...initialAsyncState
});

export const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearUsersError(state) {
      state.error = null;
    },
    resetUsersStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchUsers
      .addCase(fetchUsers.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        handleFulfilled(state);
        usersAdapter.setAll(state, action.payload);
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchUserById
      .addCase(fetchUserById.fulfilled, (state, action) => {
        if (action.payload) {
          usersAdapter.upsertOne(state, action.payload);
        }
      })
      // createUser
      .addCase(createUser.fulfilled, (state, action) => {
        if (action.payload) {
          usersAdapter.addOne(state, action.payload);
        }
      })
      // updateUser
      .addCase(updateUser.fulfilled, (state, action) => {
        if (action.payload) {
          usersAdapter.upsertOne(state, action.payload);
        }
      })
      // updateUserStatus
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        if (action.payload) {
          usersAdapter.upsertOne(state, action.payload);
        }
      })
      // assignUserRole
      .addCase(assignUserRole.fulfilled, (state, action) => {
        if (action.payload) {
          usersAdapter.upsertOne(state, action.payload);
        }
      })
      // deleteUser
      .addCase(deleteUser.fulfilled, (state, action) => {
        usersAdapter.removeOne(state, action.payload);
      })
      // fetchRoles
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.roles = action.payload;
      })
      // Synchronize ban status updates from moderation actions
      .addMatcher(
        (action) => action.type === 'moderation/actOnReport/fulfilled',
        (state, action) => {
          if (action.meta?.arg?.action_type === 'ban') {
            const targetId = String(action.meta.arg.target_user_id);
            if (state.entities[targetId]) {
              usersAdapter.updateOne(state, { id: targetId, changes: { status: 'banned' } });
            }
          }
        }
      )
      .addMatcher(
        (action) => action.type === 'moderation/liftBan/fulfilled',
        (state, action) => {
          const targetId = String(action.payload?.playerId || action.meta?.arg?.playerId);
          if (targetId && state.entities[targetId]) {
            usersAdapter.updateOne(state, { id: targetId, changes: { status: 'active' } });
          }
        }
      );
  }
});

export const { clearUsersError, resetUsersStatus } = userSlice.actions;

export default userSlice.reducer;
