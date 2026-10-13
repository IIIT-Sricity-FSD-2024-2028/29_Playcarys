/**
 * AuthStore: Gateway module for Authentication and User Management.
 * Phase 1 Migration: Wraps DB.js calls. Future phases will swap this to use API.js.
 */
const AuthStore = {
    /**
     * Anti-corruption mapper: DB/API format to canonical Frontend format
     */
    normalizeUser: function(user) {
        if (!user) return null;
        return {
            ...user,
            id: user.id || user.user_id,
            username: user.username || user.user_name,
            role: user.role,
            avatar: user.avatar,
            password: user.password,
            createdAt: user.created_at || user.createdAt
        };
    },

    /**
     * Anti-corruption mapper: Canonical Frontend format to DB format
     */
    denormalizeUser: function(user) {
        if (!user) return null;
        // Prefer an existing user_id and never emit an undefined one. Writing
        // `user_id: undefined` here is where the "undefined" identity started:
        // JSON.stringify drops the key entirely, and the compat layer in db.js
        // then re-derived it from the id getter as the STRING "undefined",
        // permanently orphaning that account's match history.
        const resolvedId = (user.user_id != null) ? user.user_id : user.id;
        if (resolvedId == null) {
            console.warn('[authStore] denormalizeUser: user has no id — refusing to mint one', user);
        }
        return {
            ...user,
            user_id: resolvedId,
            id: resolvedId,
            user_name: user.username,
            username: user.username,
            role: user.role,
            avatar: user.avatar,
            password: user.password,
            created_at: user.createdAt || user.created_at || new Date().toISOString()
        };
    },

    /**
     * Authenticate a user and create a session
     */
    login: async function(username, password) {
        // Passwords are verified BY THE SERVER, never here.
        //
        // This used to be `u.password === password` against the local store, which
        // is wrong twice over. /db-export strips `password` from every user row on
        // purpose, so `u.password` is undefined for any row that came from the
        // backend — meaning this never matched a real account, and worse, a caller
        // passing an undefined password would have compared undefined === undefined
        // and been let straight in. Nothing calls this today (the landing page has
        // its own doPanelLogin), but leaving a local password check lying around is
        // how one gets wired up by accident later.
        const user = DB.users.find(u =>
            u.user_name === username || u.username === username
        );
        if (!user) throw new Error('Invalid credentials');
        if (!password) throw new Error('Invalid credentials');

        const body = { password: password, role_id: Number(user.role_id) };
        if (user.email) body.email = user.email; else body.username = username;

        let res;
        try {
            res = await fetch(window.PC_API + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } catch (e) {
            // Never fall back to a local check when the server is unreachable —
            // "offline" must fail closed, not become an authentication bypass.
            throw new Error('Cannot reach the server to verify your password.');
        }
        if (!res.ok) throw new Error('Invalid credentials');

        return this.normalizeUser(user);
    },

    /**
     * Register a new user
     */
    register: async function(userData) {
        // In the future: return await API.post('/auth/register', userData);
        
        // Ensure required fields
        if (!userData.username || !userData.password || !userData.role) {
            throw new Error('Missing required fields for registration');
        }
        
        const newId = DB.users.length > 0 ? Math.max(...DB.users.map(u => u.user_id || u.id)) + 1 : 1;
        const canonicalUser = {
            id: newId,
            username: userData.username,
            password: userData.password,
            role: userData.role,
            avatar: userData.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + userData.username,
            createdAt: new Date().toISOString()
        };
        
        DB.users.push(this.denormalizeUser(canonicalUser));
        DB.save();
        return canonicalUser;
    },

    /**
     * Fetch a user by ID
     */
    getUserById: async function(userId) {
        // In the future: return await API.get(`/users/${userId}`);
        const user = DB.users.find(u => String(u.user_id) === String(userId) || String(u.id) === String(userId));
        return this.normalizeUser(user);
    },

    /**
     * Update a user's details
     */
    updateUser: async function(userId, updates) {
        // In the future: return await API.patch(`/users/${userId}`, updates);
        const index = DB.users.findIndex(u => String(u.user_id) === String(userId) || String(u.id) === String(userId));
        if (index === -1) throw new Error('User not found');
        const updatedUser = { ...this.normalizeUser(DB.users[index]), ...updates };
        DB.users[index] = this.denormalizeUser(updatedUser);
        DB.save();
        return updatedUser;
    }
};

window.AuthStore = AuthStore;
