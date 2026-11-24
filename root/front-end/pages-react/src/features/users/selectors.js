import { createSelector } from '@reduxjs/toolkit';
import { usersAdapter } from './userSlice';
import { toUiUser } from './userView';

const usersSelectors = usersAdapter.getSelectors((state) => state.users);

export const selectAllUsers = usersSelectors.selectAll;

/** Users in the { id, username, role, ... } shape the management components render. */
export const selectUiUsers = createSelector([usersSelectors.selectAll], (users) => users.map(toUiUser));
export const selectUserById = (state, id) => usersSelectors.selectById(state, String(id));
export const selectUserEntities = usersSelectors.selectEntities;
export const selectUsersTotal = usersSelectors.selectTotal;

export const selectUsersStatus = (state) => state.users?.status;
export const selectUsersError = (state) => state.users?.error;
export const selectRoles = (state) => state.users?.roles || [];
