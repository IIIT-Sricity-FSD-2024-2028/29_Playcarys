# Playcarys Redux Migration Guide

This guide establishes the shared Redux Toolkit architecture, ownership boundaries, and coding conventions for converting `root/front-end/pages-react` to React Redux.

---

## 1. Team Ownership Map

Each teammate has an isolated domain. **Do not modify files owned by another teammate.**
Shared core files (`store.js`, `main.jsx`, `package.json`, `routes/`, `layouts/`, and `services/api.js`) are locked and do not need edits.

| Teammate | Assigned Domain | Owned Slice File | Owned Pages & Components |
|---|---|---|---|
| **Teammate 1** | Player Pages & Features | `src/store/slices/playerSlice.js` | `src/pages/player/*` (Dashboard, Games, Tournaments, MyTournaments, CreateTournament, Community, Shop, Profile, Leaderboard, MatchHistory, Notifications) |
| **Teammate 2** | Publisher & Staff Inbox | `src/store/slices/publisherSlice.js`<br/>`src/store/slices/staffSlice.js` | `src/pages/publisher/*` (Dashboard, PublishGame, PublishTournament, MyGames, Profile, Earnings)<br/>`src/pages/staff/Inbox.jsx` |
| **Teammate 3** | Admin & Moderator | `src/store/slices/adminSlice.js`<br/>`src/store/slices/moderatorSlice.js` | `src/pages/admin/*` (Dashboard, Settings, Approvals, Users, GameReview, Hub)<br/>`src/pages/moderator/*` (Dashboard, Reports, Sessions, Bans) |
| **Teammate 4** | Superuser Platform Oversight | `src/store/slices/superuserSlice.js` | `src/pages/superuser/*` (Dashboard, Hub, Users, Admins, Games, Reports, Settings) |
| **Teammate 5** | Auth, Landing, Setup & Integration | `src/store/slices/authSlice.js`<br/>`src/store/store.js`<br/>`src/store/asyncUtils.js`<br/>`src/store/hooks.js` | `src/pages/Landing.jsx`<br/>`src/context/AuthContext.jsx`<br/>`src/context/ChatContext.jsx`<br/>Redux foundation & final integration |

---

## 2. Store Structure & State Shapes

All domain reducers are registered upfront in `src/store/store.js`:

```javascript
store.getState() => {
  auth:      authSliceState,
  player:    playerSliceState,
  publisher: publisherSliceState,
  staff:     staffSliceState,
  admin:     adminSliceState,
  moderator: moderatorSliceState,
  superuser: superuserSliceState
}
```

### Domain State Shapes

#### `auth` (`src/store/slices/authSlice.js`)
```javascript
{
  user: null,           // { id, username, email, role, avatar, status } (NO passwords, NO tokens)
  isAuthenticated: false,
  status: 'idle',       // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null           // string | null
}
```

#### `player` (`src/store/slices/playerSlice.js`)
```javascript
{
  games: [],
  currentGame: null,
  tournaments: [],
  currentTournament: null,
  leaderboard: [],
  matchHistory: [],
  notifications: [],
  profile: null,
  status: 'idle',
  error: null
}
```

#### `publisher` (`src/store/slices/publisherSlice.js`)
```javascript
{
  myGames: [],
  myTournaments: [],
  earnings: null,
  stats: null,
  currentDraft: null,
  status: 'idle',
  error: null
}
```

#### `staff` (`src/store/slices/staffSlice.js`)
```javascript
{
  notifications: [],
  unreadCount: 0,
  directory: null,
  activeThread: null,
  status: 'idle',
  error: null
}
```

#### `admin` (`src/store/slices/adminSlice.js`)
```javascript
{
  stats: null,
  users: [],
  pendingApprovals: [],
  auditLogs: [],
  settings: {},
  gameReviewItem: null,
  status: 'idle',
  error: null
}
```

#### `moderator` (`src/store/slices/moderatorSlice.js`)
```javascript
{
  stats: null,
  reports: [],
  sessions: [],
  bans: [],
  activeReport: null,
  status: 'idle',
  error: null
}
```

#### `superuser` (`src/store/slices/superuserSlice.js`)
```javascript
{
  platformStats: null,
  users: [],
  admins: [],
  games: [],
  reports: [],
  recentActivity: [],
  systemSettings: {},
  status: 'idle',
  error: null
}
```

---

## 3. Consistent `createAsyncThunk` Conventions

All asynchronous actions across every slice **MUST** follow these standard conventions.

### 1. Naming Standard
- Format: `<domain>/<actionName>` (camelCase for action name)
- Examples:
  - `player/fetchGames`
  - `publisher/fetchMyGames`
  - `admin/fetchPendingApprovals`
  - `moderator/fetchReports`
  - `superuser/fetchPlatformStats`
  - `auth/login`

### 2. Implementation Pattern
Always wrap API calls in a `try...catch` block, call backend endpoints using existing `services/api.js` or service helpers, and return `rejectWithValue(extractErrorMessage(err))` on error.

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../asyncUtils';

export const fetchPlayerGames = createAsyncThunk(
  'player/fetchGames',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/games');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player games'));
    }
  }
);
```

### 3. Extra Reducers Lifecycle Handling
Use builder callback notation with standardized helper utilities or inline state mutation:

```javascript
extraReducers: (builder) => {
  builder
    .addCase(fetchPlayerGames.pending, (state) => {
      handlePending(state); // sets state.status = 'loading', state.error = null
    })
    .addCase(fetchPlayerGames.fulfilled, (state, action) => {
      handleFulfilled(state); // sets state.status = 'succeeded', state.error = null
      state.games = action.payload;
    })
    .addCase(fetchPlayerGames.rejected, (state, action) => {
      handleRejected(state, action); // sets state.status = 'failed', state.error = action.payload
    });
}
```

---

## 4. Reading State and Dispatching in Components

Components use the shared hooks from `src/store/hooks.js` (or `src/store`):

```jsx
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchPlayerGames,
  selectPlayerGames,
  selectPlayerStatus,
  selectPlayerError
} from '../../store/slices/playerSlice';

export function PlayerGames() {
  const dispatch = useAppDispatch();
  const games = useAppSelector(selectPlayerGames);
  const status = useAppSelector(selectPlayerStatus);
  const error = useAppSelector(selectPlayerError);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchPlayerGames());
    }
  }, [dispatch, status]);

  if (status === 'loading') return <div>Loading games...</div>;
  if (status === 'failed') return <div className="error">{error}</div>;

  return (
    <div>
      {games.map(game => (
        <div key={game.id || game.game_id}>{game.title || game.name}</div>
      ))}
    </div>
  );
}
```

---

## 5. Non-Interference & Integration Rules

1. **Independent Slices**: Teammates work only in their assigned domain slice file in `src/store/slices/*.js`.
2. **Never Edit Core Config**: Do **NOT** edit `store.js`, `main.jsx`, `package.json`, routes, or layouts to add or change slice logic.
3. **Real Backend Integration**:
   - Never inject mock/fake arrays or silently stub API responses.
   - Use `services/api.js` or domain service functions.
4. **Security & Data Hygiene**:
   - Never store passwords, tokens, API keys, or raw secrets in Redux state or actions.
   - Session tokens remain managed by `services/authService.js` and HTTP headers in `services/api.js`.
5. **Preserve Existing UI**:
   - Do not alter page CSS, DOM layout, or routing parameters while hooking up Redux selectors and dispatches.

