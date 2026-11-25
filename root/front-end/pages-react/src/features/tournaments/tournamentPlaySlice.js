import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import tournamentPlayApi from '../../services/endpoints/tournamentPlayApi';
import {
  AsyncStatus,
  extractErrorMessage
} from '../../app/asyncUtils';

// ── Async Thunks ─────────────────────────────────────────────

export const fetchTournamentOverview = createAsyncThunk(
  'tournamentPlay/fetchOverview',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.getOverview(id);
      return { id: String(id), overview: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch tournament overview'));
    }
  }
);

export const fetchTournamentLeaderboard = createAsyncThunk(
  'tournamentPlay/fetchLeaderboard',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.getLeaderboard(id);
      return { id: String(id), leaderboard: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch leaderboard'));
    }
  }
);

export const fetchTournamentBracket = createAsyncThunk(
  'tournamentPlay/fetchBracket',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.getBracket(id);
      return { id: String(id), bracket: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch bracket'));
    }
  }
);

export const startTournament = createAsyncThunk(
  'tournamentPlay/startTournament',
  async (organizerIdOrId, { rejectWithValue }) => {
    try {
      const id = typeof organizerIdOrId === 'object' ? organizerIdOrId.id : organizerIdOrId;
      const organizerId = typeof organizerIdOrId === 'object' ? organizerIdOrId.organizerId || organizerIdOrId.organizer_id : undefined;
      const data = await tournamentPlayApi.startTournament(id, organizerId);
      return { id: String(id), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to start tournament'));
    }
  }
);

// ── Multi-game Stages Thunks ─────────────────────────────────

export const fetchOverallLeaderboard = createAsyncThunk(
  'tournamentPlay/fetchOverallLeaderboard',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.getOverallLeaderboard(id);
      return { id: String(id), overallLeaderboard: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch overall leaderboard'));
    }
  }
);

export const fetchStageLeaderboard = createAsyncThunk(
  'tournamentPlay/fetchStageLeaderboard',
  async ({ id, stageId }, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.getStageLeaderboard(id, stageId);
      return { id: String(id), stageId: String(stageId), leaderboard: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch stage leaderboard'));
    }
  }
);

export const fetchStageBracket = createAsyncThunk(
  'tournamentPlay/fetchStageBracket',
  async ({ id, stageId }, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.getStageBracket(id, stageId);
      return { id: String(id), stageId: String(stageId), bracket: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch stage bracket'));
    }
  }
);

export const startTournamentStage = createAsyncThunk(
  'tournamentPlay/startStage',
  async ({ id, stageId, organizerId }, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.startStage(id, stageId, organizerId);
      return { id: String(id), stageId: String(stageId), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to start tournament stage'));
    }
  }
);

export const completeTournamentStage = createAsyncThunk(
  'tournamentPlay/completeStage',
  async ({ id, stageId, organizerId }, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.completeStage(id, stageId, organizerId);
      return { id: String(id), stageId: String(stageId), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to complete tournament stage'));
    }
  }
);

// ── Match Tokens ─────────────────────────────────────────────

export const fetchMatchToken = createAsyncThunk(
  'tournamentPlay/fetchMatchToken',
  async ({ matchId, userId }, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.getMatchToken(matchId, userId);
      return { matchId: String(matchId), tokenData: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to get match token'));
    }
  }
);

// ── Match Results & Disputes ─────────────────────────────────

export const reportMatchResult = createAsyncThunk(
  'tournamentPlay/reportMatchResult',
  async ({ matchId, tournamentId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.reportMatchResult(matchId, dto);
      return { matchId: String(matchId), tournamentId: tournamentId ? String(tournamentId) : undefined, result: data, dto };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to report match result'));
    }
  }
);

export const reportSignedMatchResult = createAsyncThunk(
  'tournamentPlay/reportSignedMatchResult',
  async ({ matchId, tournamentId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.reportSignedMatchResult(matchId, dto);
      return { matchId: String(matchId), tournamentId: tournamentId ? String(tournamentId) : undefined, result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to report signed match result'));
    }
  }
);

export const confirmMatchResult = createAsyncThunk(
  'tournamentPlay/confirmMatchResult',
  async ({ matchId, tournamentId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.confirmMatchResult(matchId, dto);
      return { matchId: String(matchId), tournamentId: tournamentId ? String(tournamentId) : undefined, result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to confirm match result'));
    }
  }
);

export const disputeMatchResult = createAsyncThunk(
  'tournamentPlay/disputeMatchResult',
  async ({ matchId, tournamentId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.disputeMatchResult(matchId, dto);
      return { matchId: String(matchId), tournamentId: tournamentId ? String(tournamentId) : undefined, result: data, dto };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to dispute match result'));
    }
  }
);

export const resolveMatchDispute = createAsyncThunk(
  'tournamentPlay/resolveMatchDispute',
  async ({ matchId, tournamentId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.resolveMatchDispute(matchId, dto);
      return { matchId: String(matchId), tournamentId: tournamentId ? String(tournamentId) : undefined, result: data, dto };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to resolve dispute'));
    }
  }
);

export const fetchOrganizerDisputes = createAsyncThunk(
  'tournamentPlay/fetchDisputes',
  async (organizerId, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.getDisputes(organizerId);
      return { organizerId: String(organizerId), disputes: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch disputes'));
    }
  }
);

// ── Tournament Chat ──────────────────────────────────────────

export const fetchTournamentChat = createAsyncThunk(
  'tournamentPlay/fetchChat',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentPlayApi.getChat(id);
      return { id: String(id), chat: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch chat'));
    }
  }
);

export const sendTournamentChatMessage = createAsyncThunk(
  'tournamentPlay/sendChat',
  async ({ id, message, body, userId }, { rejectWithValue }) => {
    try {
      const payload = {
        user_id: userId,
        body: body || message
      };
      const data = await tournamentPlayApi.postChat(id, payload);
      return { id: String(id), message: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to send chat'));
    }
  }
);

// ── Helpers ──────────────────────────────────────────────────

function ensureTournamentEntry(state, tournamentId) {
  const tid = String(tournamentId);
  if (!state.byTournament[tid]) {
    state.byTournament[tid] = {
      overview: null,
      bracket: null,
      leaderboard: null,
      chat: [],
      overallLeaderboard: null,
      stages: {}
    };
  }
  return state.byTournament[tid];
}

function updateMatchInTournamentState(state, matchId, tournamentId, patchFn) {
  const tids = tournamentId ? [String(tournamentId)] : Object.keys(state.byTournament);
  for (const tid of tids) {
    const tEntry = state.byTournament[tid];
    if (!tEntry) continue;

    // Check in bracket.matches
    if (tEntry.bracket && Array.isArray(tEntry.bracket.matches)) {
      const m = tEntry.bracket.matches.find((x) => String(x.match_id || x.id) === String(matchId));
      if (m) patchFn(m);
    }

    // Check in overview.matches
    if (tEntry.overview && Array.isArray(tEntry.overview.matches)) {
      const m = tEntry.overview.matches.find((x) => String(x.match_id || x.id) === String(matchId));
      if (m) patchFn(m);
    }
  }
}

// ── Slice Definition ─────────────────────────────────────────

const initialState = {
  // Play data indexed by tournamentId:
  // { [tournamentId]: { overview, bracket, leaderboard, chat, overallLeaderboard, stages } }
  byTournament: {},

  // Match rendezvous tokens indexed by matchId: { [matchId]: tokenData }
  tokensByMatch: {},

  // Organizer disputes indexed by organizerId: { [organizerId]: Match[] }
  disputesByOrganizer: {},

  // Granular async tracking avoiding one global flag
  overviewStatus: AsyncStatus.IDLE,
  overviewError: null,

  bracketStatus: AsyncStatus.IDLE,
  bracketError: null,

  leaderboardStatus: AsyncStatus.IDLE,
  leaderboardError: null,

  chatStatus: AsyncStatus.IDLE,
  chatError: null,

  chatSendStatus: AsyncStatus.IDLE,
  chatSendError: null,

  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,

  tokenStatus: AsyncStatus.IDLE,
  tokenError: null,

  disputesStatus: AsyncStatus.IDLE,
  disputesError: null,

  // Status dictionaries per tournament for concurrent views
  statusByTournament: {},
  errorsByTournament: {},

  // Compatibility aliases
  status: AsyncStatus.IDLE,
  error: null
};

export const tournamentPlaySlice = createSlice({
  name: 'tournamentPlay',
  initialState,
  reducers: {
    clearTournamentPlayError(state) {
      state.error = null;
      state.overviewError = null;
      state.bracketError = null;
      state.leaderboardError = null;
      state.chatError = null;
      state.chatSendError = null;
      state.mutationError = null;
      state.tokenError = null;
      state.disputesError = null;
    },
    resetTournamentPlayStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.overviewStatus = AsyncStatus.IDLE;
      state.bracketStatus = AsyncStatus.IDLE;
      state.leaderboardStatus = AsyncStatus.IDLE;
      state.chatStatus = AsyncStatus.IDLE;
      state.chatSendStatus = AsyncStatus.IDLE;
      state.mutationStatus = AsyncStatus.IDLE;
      state.tokenStatus = AsyncStatus.IDLE;
      state.disputesStatus = AsyncStatus.IDLE;
      state.error = null;
      state.statusByTournament = {};
      state.errorsByTournament = {};
    },
    clearMutationStatus(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchTournamentOverview ───────────────────────────
      .addCase(fetchTournamentOverview.pending, (state, action) => {
        state.overviewStatus = AsyncStatus.LOADING;
        state.overviewError = null;
        state.status = AsyncStatus.LOADING;
        state.error = null;
        if (action.meta?.arg) {
          state.statusByTournament[String(action.meta.arg)] = AsyncStatus.LOADING;
          state.errorsByTournament[String(action.meta.arg)] = null;
        }
      })
      .addCase(fetchTournamentOverview.fulfilled, (state, action) => {
        state.overviewStatus = AsyncStatus.SUCCEEDED;
        state.overviewError = null;
        state.status = AsyncStatus.SUCCEEDED;
        state.error = null;
        const { id, overview } = action.payload;
        const entry = ensureTournamentEntry(state, id);
        entry.overview = overview;
        // Keep bracket and leaderboard in sync if overview returned them
        if (overview?.matches && !entry.bracket) {
          entry.bracket = { tournament_id: Number(id), id: String(id), format: 'bracket', matches: overview.matches };
        }
        if (overview?.standings && !entry.leaderboard) {
          entry.leaderboard = { tournament_id: Number(id), id: String(id), format: 'score', standings: overview.standings };
        }
        state.statusByTournament[id] = AsyncStatus.SUCCEEDED;
      })
      .addCase(fetchTournamentOverview.rejected, (state, action) => {
        state.overviewStatus = AsyncStatus.FAILED;
        state.overviewError = action.payload || 'Failed to fetch tournament overview';
        state.status = AsyncStatus.FAILED;
        state.error = state.overviewError;
        if (action.meta?.arg) {
          state.statusByTournament[String(action.meta.arg)] = AsyncStatus.FAILED;
          state.errorsByTournament[String(action.meta.arg)] = state.overviewError;
        }
      })

      // ── fetchTournamentLeaderboard ────────────────────────
      .addCase(fetchTournamentLeaderboard.pending, (state) => {
        state.leaderboardStatus = AsyncStatus.LOADING;
        state.leaderboardError = null;
      })
      .addCase(fetchTournamentLeaderboard.fulfilled, (state, action) => {
        state.leaderboardStatus = AsyncStatus.SUCCEEDED;
        state.leaderboardError = null;
        const { id, leaderboard } = action.payload;
        const entry = ensureTournamentEntry(state, id);
        entry.leaderboard = leaderboard;
        if (entry.overview && leaderboard?.standings) {
          entry.overview.standings = leaderboard.standings;
        }
      })
      .addCase(fetchTournamentLeaderboard.rejected, (state, action) => {
        state.leaderboardStatus = AsyncStatus.FAILED;
        state.leaderboardError = action.payload || 'Failed to fetch leaderboard';
      })

      // ── fetchTournamentBracket ────────────────────────────
      .addCase(fetchTournamentBracket.pending, (state) => {
        state.bracketStatus = AsyncStatus.LOADING;
        state.bracketError = null;
      })
      .addCase(fetchTournamentBracket.fulfilled, (state, action) => {
        state.bracketStatus = AsyncStatus.SUCCEEDED;
        state.bracketError = null;
        const { id, bracket } = action.payload;
        const entry = ensureTournamentEntry(state, id);
        entry.bracket = bracket;
        if (entry.overview && bracket?.matches) {
          entry.overview.matches = bracket.matches;
        }
      })
      .addCase(fetchTournamentBracket.rejected, (state, action) => {
        state.bracketStatus = AsyncStatus.FAILED;
        state.bracketError = action.payload || 'Failed to fetch bracket';
      })

      // ── startTournament ───────────────────────────────────
      .addCase(startTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(startTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { id, result } = action.payload;
        const entry = ensureTournamentEntry(state, id);
        if (result?.matches) {
          entry.bracket = result;
          if (entry.overview) entry.overview.matches = result.matches;
        }
      })
      .addCase(startTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to start tournament';
      })

      // ── Multi-game Stages ─────────────────────────────────
      .addCase(fetchOverallLeaderboard.fulfilled, (state, action) => {
        const { id, overallLeaderboard } = action.payload;
        const entry = ensureTournamentEntry(state, id);
        entry.overallLeaderboard = overallLeaderboard;
      })
      .addCase(fetchStageLeaderboard.fulfilled, (state, action) => {
        const { id, stageId, leaderboard } = action.payload;
        const entry = ensureTournamentEntry(state, id);
        if (!entry.stages[stageId]) entry.stages[stageId] = {};
        entry.stages[stageId].leaderboard = leaderboard;
      })
      .addCase(fetchStageBracket.fulfilled, (state, action) => {
        const { id, stageId, bracket } = action.payload;
        const entry = ensureTournamentEntry(state, id);
        if (!entry.stages[stageId]) entry.stages[stageId] = {};
        entry.stages[stageId].bracket = bracket;
      })
      .addCase(startTournamentStage.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { id, stageId, result } = action.payload;
        const entry = ensureTournamentEntry(state, id);
        if (!entry.stages[stageId]) entry.stages[stageId] = {};
        if (result?.matches) entry.stages[stageId].bracket = result;
      })
      .addCase(completeTournamentStage.fulfilled, (state) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
      })

      // ── Match Tokens ──────────────────────────────────────
      .addCase(fetchMatchToken.pending, (state) => {
        state.tokenStatus = AsyncStatus.LOADING;
        state.tokenError = null;
      })
      .addCase(fetchMatchToken.fulfilled, (state, action) => {
        state.tokenStatus = AsyncStatus.SUCCEEDED;
        state.tokenError = null;
        const { matchId, tokenData } = action.payload;
        state.tokensByMatch[matchId] = tokenData;
      })
      .addCase(fetchMatchToken.rejected, (state, action) => {
        state.tokenStatus = AsyncStatus.FAILED;
        state.tokenError = action.payload || 'Failed to get match token';
      })

      // ── Match Results & Disputes ──────────────────────────
      .addCase(reportMatchResult.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(reportMatchResult.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { matchId, tournamentId, result, dto } = action.payload;
        if (result?.matches && tournamentId) {
          const entry = ensureTournamentEntry(state, tournamentId);
          entry.bracket = result;
          if (entry.overview) entry.overview.matches = result.matches;
        } else {
          updateMatchInTournamentState(state, matchId, tournamentId, (m) => {
            m.status = 'awaiting_confirmation';
            if (dto?.winner_id != null) m.reported_winner_id = dto.winner_id;
          });
        }
      })
      .addCase(reportMatchResult.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to report match result';
      })

      .addCase(reportSignedMatchResult.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { tournamentId, result } = action.payload;
        if (result?.matches && tournamentId) {
          const entry = ensureTournamentEntry(state, tournamentId);
          entry.bracket = result;
          if (entry.overview) entry.overview.matches = result.matches;
        }
      })

      .addCase(confirmMatchResult.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(confirmMatchResult.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { matchId, tournamentId, result } = action.payload;
        const tid = tournamentId || (result?.tournament_id ? String(result.tournament_id) : undefined);
        if (result?.matches && tid) {
          const entry = ensureTournamentEntry(state, tid);
          entry.bracket = result;
          if (entry.overview) entry.overview.matches = result.matches;
        } else {
          updateMatchInTournamentState(state, matchId, tournamentId, (m) => {
            m.status = 'completed';
          });
        }
      })
      .addCase(confirmMatchResult.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to confirm match result';
      })

      .addCase(disputeMatchResult.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(disputeMatchResult.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { matchId, tournamentId, dto } = action.payload;
        updateMatchInTournamentState(state, matchId, tournamentId, (m) => {
          m.status = 'disputed';
          if (dto?.reason) m.dispute_reason = dto.reason;
        });
      })
      .addCase(disputeMatchResult.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to dispute match result';
      })

      .addCase(resolveMatchDispute.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(resolveMatchDispute.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { matchId, tournamentId, result } = action.payload;
        const tid = tournamentId || (result?.tournament_id ? String(result.tournament_id) : undefined);
        if (result?.matches && tid) {
          const entry = ensureTournamentEntry(state, tid);
          entry.bracket = result;
          if (entry.overview) entry.overview.matches = result.matches;
        } else {
          updateMatchInTournamentState(state, matchId, tournamentId, (m) => {
            m.status = 'completed';
          });
        }
      })
      .addCase(resolveMatchDispute.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to resolve dispute';
      })

      .addCase(fetchOrganizerDisputes.pending, (state) => {
        state.disputesStatus = AsyncStatus.LOADING;
        state.disputesError = null;
      })
      .addCase(fetchOrganizerDisputes.fulfilled, (state, action) => {
        state.disputesStatus = AsyncStatus.SUCCEEDED;
        state.disputesError = null;
        const { organizerId, disputes } = action.payload;
        state.disputesByOrganizer[organizerId] = disputes;
      })
      .addCase(fetchOrganizerDisputes.rejected, (state, action) => {
        state.disputesStatus = AsyncStatus.FAILED;
        state.disputesError = action.payload || 'Failed to fetch disputes';
      })

      // ── Tournament Chat ───────────────────────────────────
      .addCase(fetchTournamentChat.pending, (state) => {
        state.chatStatus = AsyncStatus.LOADING;
        state.chatError = null;
      })
      .addCase(fetchTournamentChat.fulfilled, (state, action) => {
        state.chatStatus = AsyncStatus.SUCCEEDED;
        state.chatError = null;
        const { id, chat } = action.payload;
        const entry = ensureTournamentEntry(state, id);
        entry.chat = chat;
      })
      .addCase(fetchTournamentChat.rejected, (state, action) => {
        state.chatStatus = AsyncStatus.FAILED;
        state.chatError = action.payload || 'Failed to fetch chat';
      })

      .addCase(sendTournamentChatMessage.pending, (state) => {
        state.chatSendStatus = AsyncStatus.LOADING;
        state.chatSendError = null;
      })
      .addCase(sendTournamentChatMessage.fulfilled, (state, action) => {
        state.chatSendStatus = AsyncStatus.SUCCEEDED;
        state.chatSendError = null;
        const { id, message } = action.payload;
        const entry = ensureTournamentEntry(state, id);
        if (message) {
          entry.chat.push(message);
        }
      })
      .addCase(sendTournamentChatMessage.rejected, (state, action) => {
        state.chatSendStatus = AsyncStatus.FAILED;
        state.chatSendError = action.payload || 'Failed to send chat';
      });
  }
});

export const {
  clearTournamentPlayError,
  resetTournamentPlayStatus,
  clearMutationStatus
} = tournamentPlaySlice.actions;

export default tournamentPlaySlice.reducer;
