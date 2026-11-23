export const selectAuthUser = (state) => state.auth?.user;
export const selectIsAuthenticated = (state) => state.auth?.isAuthenticated;
export const selectAuthStatus = (state) => state.auth?.status;
export const selectAuthError = (state) => state.auth?.error;
export const selectUserRole = (state) => state.auth?.user?.role || state.auth?.user?.role_name || null;
export const selectDevIdentityError = (state) => state.auth?.devIdentityError;
export const selectCurrentUserId = (state) => state.auth?.user?.id || state.auth?.user?.userId || state.auth?.user?.user_id;
