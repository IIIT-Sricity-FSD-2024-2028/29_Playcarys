import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import userReducer from '../features/users/userSlice';
import playerProfileReducer from '../features/profiles/playerProfileSlice';
import publisherProfileReducer from '../features/profiles/publisherProfileSlice';
import linkedAccountReducer from '../features/profiles/linkedAccountSlice';
import gameReducer from '../features/games/gameSlice';
import gameReviewReducer from '../features/games/gameReviewSlice';
import gameSaveReducer from '../features/games/gameSaveSlice';
import achievementReducer from '../features/games/achievementSlice';
import tournamentReducer from '../features/tournaments/tournamentSlice';
import registrationReducer from '../features/tournaments/registrationSlice';
import tournamentPlayReducer from '../features/tournaments/tournamentPlaySlice';
import teamReducer from '../features/communities/teamSlice';
import groupReducer from '../features/communities/groupSlice';
import socialReducer from '../features/communities/socialSlice';
import reportReducer from '../features/moderation/reportSlice';
import moderationReducer from '../features/moderation/moderationSlice';
import notificationReducer from '../features/notifications/notificationSlice';
import gameSessionReducer from '../features/sessions/gameSessionSlice';
import matchResultReducer from '../features/sessions/matchResultSlice';
import walletReducer from '../features/economy/walletSlice';
import catalogueReducer from '../features/economy/catalogueSlice';
import payoutReducer from '../features/economy/payoutSlice';
import platformReducer from '../features/platform/platformSlice';
import analyticsReducer from '../features/platform/analyticsSlice';
import auditReducer from '../features/platform/auditSlice';

/**
 * Central Feature-Based Redux Store Configuration
 *
 * Implements domain-driven shared feature state:
 * - Identity and access: auth, users
 * - Profiles and accounts: playerProfile, publisherProfile, linkedAccounts
 * - Games: games, gameReview, gameSaves, achievements
 * - Tournaments: tournaments, registrations, tournamentPlay
 * - Communities: teams, groups, social
 * - Moderation: reports, moderation
 * - Notifications: notifications
 * - Sessions & Results: gameSessions, matchResults
 * - Economy: wallet, catalogue, payouts
 * - Platform operations: platform, analytics, audit
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    playerProfile: playerProfileReducer,
    publisherProfile: publisherProfileReducer,
    linkedAccounts: linkedAccountReducer,
    games: gameReducer,
    gameReview: gameReviewReducer,
    gameSaves: gameSaveReducer,
    achievements: achievementReducer,
    tournaments: tournamentReducer,
    registrations: registrationReducer,
    tournamentPlay: tournamentPlayReducer,
    teams: teamReducer,
    groups: groupReducer,
    social: socialReducer,
    reports: reportReducer,
    moderation: moderationReducer,
    notifications: notificationReducer,
    gameSessions: gameSessionReducer,
    matchResults: matchResultReducer,
    wallet: walletReducer,
    catalogue: catalogueReducer,
    payouts: payoutReducer,
    platform: platformReducer,
    analytics: analyticsReducer,
    audit: auditReducer
  },
  devTools: process.env.NODE_ENV !== 'production'
});

export default store;
