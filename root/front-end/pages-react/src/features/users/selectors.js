import { usersAdapter } from './userSlice';

const usersSelectors = usersAdapter.getSelectors((state) => state.users);

export const selectAllUsers = usersSelectors.selectAll;
export const selectUserById = (state, id) => usersSelectors.selectById(state, String(id));
export const selectUserEntities = usersSelectors.selectEntities;
export const selectUsersTotal = usersSelectors.selectTotal;

export const selectUsersStatus = (state) => state.users?.status;
export const selectUsersError = (state) => state.users?.error;
export const selectRoles = (state) => state.users?.roles || [];
