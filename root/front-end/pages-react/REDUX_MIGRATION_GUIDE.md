# PlayCarys Redux Migration Guide

Goal: every page reads its data from **Redux feature slices**, and every change goes through a **real NestJS API call**. The legacy browser-side copy of the database (`DB`, `window.DB`, `getDatabase()`, localStorage snapshots) is removed feature by feature, until nothing depends on it.

State is organised **by business feature, not by actor**. A game used by players, publishers, admins and superusers lives in one shared `games` slice.

---

## 1. Where things live

```
src/
├── main.jsx                 <Provider store={store}> (one provider only)
├── app/
│   ├── store.js             registers every slice (root store, locked, see §6)
│   ├── hooks.js             useAppDispatch / useAppSelector
│   └── asyncUtils.js        AsyncStatus, extractErrorMessage, handlePending/Fulfilled/Rejected
├── features/<domain>/
│   ├── <name>Slice.js       state + async thunks
│   └── selectors.js         every read the UI needs
├── services/
│   ├── api.js               the only HTTP client (adds Authorization + role headers)
│   └── endpoints/<x>Api.js  one module per backend controller, normalises ids
└── context/AuthContext.jsx  compatibility wrapper over the auth slice (see §5)
```

Registered slices (state key → file):

| Domain | State keys |
|---|---|
| Identity | `auth`, `users` |
| Profiles | `playerProfile`, `publisherProfile`, `linkedAccounts` |
| Games | `games`, `gameReview`, `gameSaves`, `achievements` |
| Tournaments | `tournaments`, `registrations`, `tournamentPlay` |
| Communities | `teams`, `groups`, `social` |
| Moderation | `reports`, `moderation` |
| Notifications | `notifications` |
| Sessions | `gameSessions`, `matchResults` |
| Economy | `wallet`, `catalogue`, `payouts` |
| Platform | `platform`, `analytics`, `audit` |

## 2. The pattern for every feature

1. **Endpoint module** (`services/endpoints/xApi.js`): thin functions over `api.get/post/patch/del`. Run results through `normalizeEntity` / `normalizeList` so every entity has a string `id` (the backend sends `user_id`, `game_id`, ... and the alias is kept too).
2. **Slice** (`features/x/xSlice.js`): one `createAsyncThunk` per operation, `rejectWithValue(extractErrorMessage(err, 'fallback'))`, and an `createEntityAdapter({ selectId: (e) => String(e.id) })` for collections.
3. **Status/error shape:** every slice has `{ status: 'idle' | 'loading' | 'succeeded' | 'failed', error: string | null }`. Use the helpers from `app/asyncUtils.js` in the reducers.
4. **Selectors** (`features/x/selectors.js`): export `selectAllX`, `selectXById(state, id)` (stringifies the id), `selectXStatus`, `selectXError`, plus any derived reads.
5. **Component:**

   ```jsx
   const dispatch = useAppDispatch();
   const items = useAppSelector(selectAllItems);
   const status = useAppSelector(selectItemsStatus);
   useEffect(() => { dispatch(fetchItems()); }, [dispatch]);
   ```

   Reference implementation: `pages/player/Games.jsx` (games) and `context/AuthContext.jsx` (auth).

## 3. Rules

- **Confirm backend support first.** Use the existing controllers (`back-end/src/*/*.controller.ts`, Swagger at `/api/docs`). Do not invent endpoints and do not treat a local-cache mutation as a successful server operation. If an endpoint is missing, record it in the "API gaps" list below.
- **IDs are strings in Redux.** Never compare `user.id === otherId` without `String(...)`. `normalizeEntity` produces `id`; legacy fields (`user_id`, `userId`) stay on the object.
- **Transient UI state stays local:** search text, filters, modal visibility, route-selected ids, form drafts.
- **Migrate incrementally.** Replace a page's cache reads only once its slice and API flow work. Remove a legacy helper only when no consumer is left (`grep` for it first).
- **Never store tokens or passwords in Redux.** The session token lives in `authService` (sessionStorage / localStorage); Redux holds only the session's user fields.
- **No duplicate sources of truth.** If a page reads a slice, it must not also read `DB` for the same data.

## 4. Ownership

| Member | Owns |
|---|---|
| 1. Foundation, auth, users | `app/*`, `main.jsx`, `services/api.js`, `services/endpoints/normalize.js`, `AuthContext`, `auth`, `users`, admin/superuser user-management pages |
| 2. Games and profiles | `games`, `gameReview`, `gameSaves`, `achievements`, `playerProfile`, `publisherProfile`, `linkedAccounts` |
| 3. Communities and notifications | `teams`, `groups`, `social`, `notifications`, staff Inbox |
| 4. Tournaments and results | `tournaments`, `registrations`, `tournamentPlay`, `gameSessions`, `matchResults` |
| 5. Moderation, economy, platform | `reports`, `moderation`, `wallet`, `catalogue`, `payouts`, `platform`, `analytics`, `audit` |

Edit only your own feature folders and the pages you migrate. Changes to `app/store.js`, `services/api.js`, `normalize.js` or `AuthContext` go through Member 1.

## 5. Auth

- `features/auth/authSlice.js` owns session state: `initSession`, `loginUser`, `logoutUser`, `setUser`.
- `authService` stays the storage layer (session, API token, dev identity). The slice calls it; components do not write the session directly.
- `AuthContext` is kept as a **compatibility layer**: it exposes `{ user, loading, login, logout, refreshIdentity }` backed by the slice, so the many existing consumers keep working. Move consumers to `useAppSelector(selectAuthUser)` over time; delete the context only when none are left.
- One signed-in device per account: the server returns 409 when another device holds the account. `landingAuthService` runs the hand-off flow, then signs in again with `force: true`. This must keep working through the slice.
- **Every portal needs a real sign-in.** The temporary dev identity (`ENABLE_TEMP_DEV_IDENTITY` in `authService`) is off, so `/player`, `/publisher`, `/moderator` and `/superuser` no longer fall back to a demo user. The moderator, publisher and superuser layouts send a visitor without the right role back to `/`.
- Publisher writes need a signed token and a verified studio: `RolesGuard` refuses a header-only publisher, and refuses games / tournaments / API keys until `kyc_status` is `verified` (financial routes also need the payment review). The seeded demo studios (users 5 and 6) are treated as verified; new studios go through `/publisher/onboarding` and the admin's Publisher Applications review.

## 6. Shared files (locked)

`app/store.js`, `app/hooks.js`, `app/asyncUtils.js`, `services/api.js`, `services/endpoints/normalize.js`, `context/AuthContext.jsx`, `main.jsx`. Ask Member 1 before changing them.

## 7. Legacy data layer still to remove

Files that still read the legacy `DB` / `getDatabase()` (at last count) are listed by:

```bash
grep -rlE "window\.DB|getDatabase|getDB\(" src
```

When your feature is fully migrated, that list must no longer contain your files.

## 8. API gaps (add here, do not simulate)

- Admin user suspend with an expiry: the backend `PATCH /users/:id/status` only sets `status`, so the number of days typed in the admin Users dialog is no longer stored. (Nothing ever read the old `suspendUntil` field, so no behaviour was lost.)
- User notification on suspend/ban and the audit entry: these still go through the legacy `DB` helpers (`dispatchUserNotification`, `recordAudit`) after the server accepts the change. They move with the notifications and audit features (Members 3 and 5).
- `GET /users` is staff-only and `GET /users/:id` is staff or the signed-in user's own record. `GET /roles`, `GET /db-export` and `POST /db-import` are still unauthenticated, and `db-export` returns the same user list; the fix is to authenticate `db-export` and move the pages off it.
- Pages ported from the React-only branch call the backend through `services/*Service.js` / `api.js`, not through slices yet: admin Publisher Applications (`/publisher/applications`), publisher Onboarding, Finance and API keys (`/publisher/onboarding`, `/economy/publishers/:id/finance`, `/publisher/api-keys`), and the support tickets API (`/support/tickets`, no page yet). They are real API calls, so they work; move them into the matching slices (publisher profile: Member 2, economy/payouts and moderation: Member 5) when those features are migrated.
- `services/superuserService.js` still has the old `fetchUsers` / `createUserRecord` / `updateUserRecord` / `updateUserStatus` / `updateUserRole` / `deleteUserRecord`, used by `superuser/Reports`, `superuser/Settings` and `adminHubService`. Delete them when those three move to the users slice.

## 9. Definition of done

- `npm run build` passes.
- No `DB` / `getDatabase` reads left in the migrated pages.
- Each page shows loading and error states from the slice status.
- Login, logout and a role-specific page were exercised in a browser for the affected portals.
