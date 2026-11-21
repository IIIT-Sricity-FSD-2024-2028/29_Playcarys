import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import playerReducer from './slices/playerSlice';
import publisherReducer from './slices/publisherSlice';
import staffReducer from './slices/staffSlice';
import adminReducer from './slices/adminSlice';
import moderatorReducer from './slices/moderatorSlice';
import superuserReducer from './slices/superuserSlice';

/**
 * Central Redux Store Configuration
 *
 * All domain reducers are registered upfront. Each teammate develops inside their
 * assigned slice file (src/store/slices/*.js) without modifying this file.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    player: playerReducer,
    publisher: publisherReducer,
    staff: staffReducer,
    admin: adminReducer,
    moderator: moderatorReducer,
    superuser: superuserReducer
  },
  devTools: process.env.NODE_ENV !== 'production'
});

export default store;

