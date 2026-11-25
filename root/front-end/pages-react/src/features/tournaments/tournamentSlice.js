import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import tournamentsApi from '../../services/endpoints/tournamentsApi';
import { registerForTournament, withdrawFromTournament } from './registrationSlice';
import {
  AsyncStatus,
  extractErrorMessage
} from '../../app/asyncUtils';

/**
 * Entity adapter for tournament records.
 * Uses normalized String(id) as entity key.
 */
export const tournamentsAdapter = createEntityAdapter({
  selectId: (tournament) => String(tournament.id)
});

// ── Async Thunks ─────────────────────────────────────────────

export const fetchTournaments = createAsyncThunk(
  'tournaments/fetchTournaments',
  async (params, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getTournaments(params);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch tournaments'));
    }
  }
);

export const fetchTournamentById = createAsyncThunk(
  'tournaments/fetchTournamentById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getTournamentById(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch tournament'));
    }
  }
);

export const fetchPlayerTournaments = createAsyncThunk(
  'tournaments/fetchPlayerTournaments',
  async (playerId, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getPlayerTournaments(playerId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player tournaments'));
    }
  }
);

export const createTournament = createAsyncThunk(
  'tournaments/createTournament',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.createTournament(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create tournament'));
    }
  }
);

export const updateTournament = createAsyncThunk(
  'tournaments/updateTournament',
  async ({ id, data: dto, changes }, { rejectWithValue }) => {
    try {
      const payload = dto || changes;
      const data = await tournamentsApi.updateTournament(id, payload);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update tournament'));
    }
  }
);

export const deleteTournament = createAsyncThunk(
  'tournaments/deleteTournament',
  async (id, { rejectWithValue }) => {
    try {
      await tournamentsApi.deleteTournament(id);
      return String(id);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete tournament'));
    }
  }
);

export const startTournament = createAsyncThunk(
  'tournaments/startTournament',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.startTournament(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to start tournament'));
    }
  }
);

export const fetchTournamentStages = createAsyncThunk(
  'tournaments/fetchStages',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getStages(id);
      return { id: String(id), stages: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch tournament stages'));
    }
  }
);

export const addTournamentStage = createAsyncThunk(
  'tournaments/addStage',
  async ({ tournamentId, stage: dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.addStage(tournamentId, dto);
      return { tournamentId: String(tournamentId), stage: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to add tournament stage'));
    }
  }
);

export const removeTournamentStage = createAsyncThunk(
  'tournaments/removeStage',
  async ({ tournamentId, stageId }, { rejectWithValue }) => {
    try {
      await tournamentsApi.removeStage(tournamentId, stageId);
      return { tournamentId: String(tournamentId), stageId: String(stageId) };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to remove tournament stage'));
    }
  }
);

// ── Slice Definition ─────────────────────────────────────────

const initialState = tournamentsAdapter.getInitialState({
  // Dedicated stages dictionary indexed by tournament id: { [tournamentId]: Stage[] }
  stagesByTournamentId: {},

  // Player tournaments mapping indexed by player id: { [playerId]: string[] }
  playerTournamentIdsByPlayerId: {},

  // Granular request statuses and errors avoiding one global loading flag
  listStatus: AsyncStatus.IDLE,
  listError: null,

  detailStatus: AsyncStatus.IDLE,
  detailError: null,

  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,

  stageStatus: AsyncStatus.IDLE,
  stageError: null,

  // Compatibility aliases for existing consumers (e.g. Tournaments.jsx)
  status: AsyncStatus.IDLE,
  error: null,

  // UI state for tournament pages and components
  ui: {
    activeTab: 'all',
    searchQuery: '',
    formatFilter: '',
    kindFilter: '',
    gameFilter: '',
    detailsModalOpen: false,
    selectedTournamentId: null,
    registrationModalOpen: false,
    registrationTournamentId: null,
    joinByIdModalOpen: false,
    withdrawConfirmationTournamentId: null,

    // Create Tournament wizard UI
    createStep: 1,
    createKind: 'casual',
    createVisibility: 'public',
    createTeamMode: false,
    createTeamSize: 2,
    createGroupId: '',
    createSelectedGameId: null,
    createSelectedFormat: 'score',
    createIsMulti: false,
    createStages: [],
    createName: '',
    createDesc: '',
    createPrize: '',
    createMaxParticipants: 16,
    createRegClose: '',
    createStartDate: '',
    createEndDate: '',
    createdInviteCode: null,
    createToast: null,

    // Publisher Tournament page UI
    publisherView: 'list',
    publisherCurrentStep: 1,
    publisherSelectedType: 'single',
    publisherSelectedVisibility: 'public',
    publisherStages: [],
    publisherForm: {
      name: '',
      description: '',
      prize: '₹',
      maxPlayers: '32',
      regDeadline: '',
      startDate: '',
      endDate: ''
    },
    publisherStatusFilter: 'all',
    publisherSelectedGameId: '',
    publisherEditId: null,
    publisherActiveTournamentId: null,
    publisherConfirmModal: {
      isOpen: false,
      title: '',
      message: '',
      confirmText: 'Confirm',
      variant: 'primary',
      actionKey: null,
      actionPayload: null
    },
    publisherToast: null,
    publisherMgmt: {
      showDeadlineModal: false,
      deadlineInput: '',
      showWinnerModal: false,
      selectedWinnerId: '',
      customWinnerName: '',
      showCancelModal: false,
      cancelReasonInput: ''
    }
  }
});

export const tournamentSlice = createSlice({
  name: 'tournaments',
  initialState,
  reducers: {
    clearTournamentsError(state) {
      state.error = null;
      state.listError = null;
      state.detailError = null;
      state.mutationError = null;
      state.stageError = null;
    },
    resetTournamentsStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.listStatus = AsyncStatus.IDLE;
      state.detailStatus = AsyncStatus.IDLE;
      state.mutationStatus = AsyncStatus.IDLE;
      state.stageStatus = AsyncStatus.IDLE;
      state.error = null;
      state.listError = null;
      state.detailError = null;
      state.mutationError = null;
      state.stageError = null;
    },
    resetMutationStatus(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    },

    // UI actions
    setTournamentActiveTab(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.activeTab = action.payload;
    },
    setTournamentFilters(state, action) {
      if (!state.ui) state.ui = {};
      state.ui = { ...state.ui, ...action.payload };
    },
    resetTournamentFilters(state) {
      if (!state.ui) state.ui = {};
      state.ui.searchQuery = '';
      state.ui.formatFilter = '';
      state.ui.kindFilter = '';
      state.ui.gameFilter = '';
    },
    openTournamentDetails(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.detailsModalOpen = true;
      state.ui.selectedTournamentId = action.payload != null ? String(action.payload) : null;
    },
    closeTournamentDetails(state) {
      if (!state.ui) state.ui = {};
      state.ui.detailsModalOpen = false;
      state.ui.selectedTournamentId = null;
    },
    openRegistrationModal(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.registrationModalOpen = true;
      state.ui.registrationTournamentId = action.payload != null ? String(action.payload) : null;
    },
    closeRegistrationModal(state) {
      if (!state.ui) state.ui = {};
      state.ui.registrationModalOpen = false;
      state.ui.registrationTournamentId = null;
    },
    openJoinByIdModal(state) {
      if (!state.ui) state.ui = {};
      state.ui.joinByIdModalOpen = true;
    },
    closeJoinByIdModal(state) {
      if (!state.ui) state.ui = {};
      state.ui.joinByIdModalOpen = false;
    },
    openWithdrawConfirmation(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.withdrawConfirmationTournamentId = action.payload != null ? String(action.payload) : null;
    },
    closeWithdrawConfirmation(state) {
      if (!state.ui) state.ui = {};
      state.ui.withdrawConfirmationTournamentId = null;
    },

    // Create Tournament UI reducers
    setCreateTournamentStep(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createStep = action.payload;
    },
    setCreateTournamentKind(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createKind = action.payload;
    },
    setCreateTournamentVisibility(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createVisibility = action.payload;
    },
    setCreateTournamentTeamMode(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createTeamMode = action.payload;
    },
    setCreateTournamentTeamSize(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createTeamSize = action.payload;
    },
    setCreateTournamentGroup(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createGroupId = action.payload;
    },
    setCreateTournamentGame(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createSelectedGameId = action.payload;
    },
    setCreateTournamentFormat(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createSelectedFormat = action.payload;
    },
    setCreateTournamentIsMulti(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createIsMulti = action.payload;
    },
    setCreateTournamentStages(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createStages = action.payload;
    },
    addCreateTournamentStage(state, action) {
      if (!state.ui) state.ui = {};
      if (!Array.isArray(state.ui.createStages)) state.ui.createStages = [];
      state.ui.createStages.push(action.payload);
    },
    removeCreateTournamentStage(state, action) {
      if (!state.ui) state.ui = {};
      if (Array.isArray(state.ui.createStages)) {
        state.ui.createStages.splice(action.payload, 1);
      }
    },
    updateCreateTournamentStage(state, action) {
      const { index, field, value } = action.payload;
      if (!state.ui) state.ui = {};
      if (Array.isArray(state.ui.createStages) && state.ui.createStages[index]) {
        state.ui.createStages[index] = {
          ...state.ui.createStages[index],
          [field]: value
        };
      }
    },
    setCreateTournamentFields(state, action) {
      if (!state.ui) state.ui = {};
      state.ui = { ...state.ui, ...action.payload };
    },
    setCreatedInviteCode(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createdInviteCode = action.payload;
    },
    setCreateTournamentToast(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.createToast = action.payload || null;
    },
    clearCreateTournamentToast(state) {
      if (!state.ui) state.ui = {};
      state.ui.createToast = null;
    },
    resetCreateTournamentForm(state) {
      if (!state.ui) state.ui = {};
      state.ui.createStep = 1;
      state.ui.createKind = 'casual';
      state.ui.createVisibility = 'public';
      state.ui.createTeamMode = false;
      state.ui.createTeamSize = 2;
      state.ui.createGroupId = '';
      state.ui.createSelectedGameId = null;
      state.ui.createSelectedFormat = 'score';
      state.ui.createIsMulti = false;
      state.ui.createStages = [];
      state.ui.createName = '';
      state.ui.createDesc = '';
      state.ui.createPrize = '';
      state.ui.createMaxParticipants = 16;
      state.ui.createRegClose = '';
      state.ui.createStartDate = '';
      state.ui.createEndDate = '';
      state.ui.createdInviteCode = null;
    },

    // Publisher Tournament UI reducers
    setPublisherView(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherView = action.payload;
    },
    setPublisherWizardStep(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherCurrentStep = action.payload;
    },
    setPublisherSelectedType(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherSelectedType = action.payload;
    },
    setPublisherSelectedVisibility(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherSelectedVisibility = action.payload;
    },
    setPublisherStages(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherStages = action.payload;
    },
    setPublisherFormField(state, action) {
      if (!state.ui) state.ui = {};
      if (!state.ui.publisherForm) state.ui.publisherForm = {};
      const { field, value } = action.payload;
      state.ui.publisherForm[field] = value;
    },
    resetPublisherForm(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherForm = {
        name: action.payload?.name ?? '',
        description: action.payload?.description ?? '',
        prize: action.payload?.prize ?? '₹',
        maxPlayers: action.payload?.maxPlayers ?? '32',
        regDeadline: action.payload?.regDeadline ?? '',
        startDate: action.payload?.startDate ?? '',
        endDate: action.payload?.endDate ?? ''
      };
    },
    setPublisherMgmtField(state, action) {
      if (!state.ui) state.ui = {};
      if (!state.ui.publisherMgmt) state.ui.publisherMgmt = {};
      const { field, value } = action.payload;
      state.ui.publisherMgmt[field] = value;
    },
    setPublisherToast(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherToast = action.payload || null;
    },
    clearPublisherToast(state) {
      if (!state.ui) state.ui = {};
      state.ui.publisherToast = null;
    },
    setPublisherStatusFilter(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherStatusFilter = action.payload;
    },
    setPublisherSelectedGame(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherSelectedGameId = action.payload;
    },
    setPublisherEditId(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherEditId = action.payload;
    },
    setPublisherActiveTournament(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherActiveTournamentId = action.payload;
    },
    openPublisherConfirmModal(state, action) {
      if (!state.ui) state.ui = {};
      state.ui.publisherConfirmModal = {
        isOpen: true,
        title: action.payload?.title || 'Confirm',
        message: action.payload?.message || '',
        confirmText: action.payload?.confirmText || 'Confirm',
        variant: action.payload?.variant || 'primary',
        actionKey: action.payload?.actionKey || null,
        actionPayload: action.payload?.actionPayload || null
      };
    },
    closePublisherConfirmModal(state) {
      if (!state.ui) state.ui = {};
      state.ui.publisherConfirmModal = {
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        variant: 'primary',
        actionKey: null,
        actionPayload: null
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchTournaments ──────────────────────────────────
      .addCase(fetchTournaments.pending, (state) => {
        state.listStatus = AsyncStatus.LOADING;
        state.listError = null;
        state.status = AsyncStatus.LOADING;
        state.error = null;
      })
      .addCase(fetchTournaments.fulfilled, (state, action) => {
        state.listStatus = AsyncStatus.SUCCEEDED;
        state.listError = null;
        state.status = AsyncStatus.SUCCEEDED;
        state.error = null;
        tournamentsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchTournaments.rejected, (state, action) => {
        state.listStatus = AsyncStatus.FAILED;
        state.listError = action.payload || 'Failed to fetch tournaments';
        state.status = AsyncStatus.FAILED;
        state.error = state.listError;
      })

      // ── fetchTournamentById ───────────────────────────────
      .addCase(fetchTournamentById.pending, (state) => {
        state.detailStatus = AsyncStatus.LOADING;
        state.detailError = null;
      })
      .addCase(fetchTournamentById.fulfilled, (state, action) => {
        state.detailStatus = AsyncStatus.SUCCEEDED;
        state.detailError = null;
        if (action.payload) {
          tournamentsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(fetchTournamentById.rejected, (state, action) => {
        state.detailStatus = AsyncStatus.FAILED;
        state.detailError = action.payload || 'Failed to fetch tournament';
      })

      // ── fetchPlayerTournaments ────────────────────────────
      .addCase(fetchPlayerTournaments.pending, (state) => {
        state.listStatus = AsyncStatus.LOADING;
        state.listError = null;
      })
      .addCase(fetchPlayerTournaments.fulfilled, (state, action) => {
        state.listStatus = AsyncStatus.SUCCEEDED;
        state.listError = null;
        if (action.payload && action.payload.length > 0) {
          tournamentsAdapter.upsertMany(state, action.payload);
        }
        const playerId = action.meta?.arg != null ? String(action.meta.arg) : null;
        if (playerId) {
          if (!state.playerTournamentIdsByPlayerId) {
            state.playerTournamentIdsByPlayerId = {};
          }
          state.playerTournamentIdsByPlayerId[playerId] = (action.payload || []).map(
            (t) => String(t.id || t.tournament_id)
          );
        }
      })
      .addCase(fetchPlayerTournaments.rejected, (state, action) => {
        state.listStatus = AsyncStatus.FAILED;
        state.listError = action.payload || 'Failed to fetch player tournaments';
      })

      // ── createTournament ──────────────────────────────────
      .addCase(createTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(createTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          tournamentsAdapter.addOne(state, action.payload);
        }
      })
      .addCase(createTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to create tournament';
      })

      // ── updateTournament ──────────────────────────────────
      .addCase(updateTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(updateTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          tournamentsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(updateTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to update tournament';
      })

      // ── deleteTournament ──────────────────────────────────
      .addCase(deleteTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(deleteTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        tournamentsAdapter.removeOne(state, action.payload);
        delete state.stagesByTournamentId[action.payload];
      })
      .addCase(deleteTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to delete tournament';
      })

      // ── startTournament ───────────────────────────────────
      .addCase(startTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(startTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          tournamentsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(startTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to start tournament';
      })

      // ── fetchTournamentStages ─────────────────────────────
      .addCase(fetchTournamentStages.pending, (state) => {
        state.stageStatus = AsyncStatus.LOADING;
        state.stageError = null;
      })
      .addCase(fetchTournamentStages.fulfilled, (state, action) => {
        state.stageStatus = AsyncStatus.SUCCEEDED;
        state.stageError = null;
        state.stagesByTournamentId[action.payload.id] = action.payload.stages;
      })
      .addCase(fetchTournamentStages.rejected, (state, action) => {
        state.stageStatus = AsyncStatus.FAILED;
        state.stageError = action.payload || 'Failed to fetch tournament stages';
      })

      // ── addTournamentStage ────────────────────────────────
      .addCase(addTournamentStage.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(addTournamentStage.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const tid = String(action.payload.tournamentId);
        if (!state.stagesByTournamentId[tid]) {
          state.stagesByTournamentId[tid] = [];
        }
        state.stagesByTournamentId[tid].push(action.payload.stage);
      })
      .addCase(addTournamentStage.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to add tournament stage';
      })

      // ── removeTournamentStage ─────────────────────────────
      .addCase(removeTournamentStage.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(removeTournamentStage.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { tournamentId, stageId } = action.payload;
        if (state.stagesByTournamentId[tournamentId]) {
          state.stagesByTournamentId[tournamentId] = state.stagesByTournamentId[tournamentId].filter(
            (s) => String(s.id || s.stage_id || s.tournament_game_id) !== String(stageId)
          );
        }
      })
      .addCase(removeTournamentStage.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to remove tournament stage';
      })

      // ── Coordinated actions with registrationSlice ────────
      .addCase(registerForTournament.fulfilled, (state, action) => {
        const tid = String(action.payload.tournamentId);
        const t = state.entities[tid];
        if (t) {
          t.participants = (Number(t.participants) || 0) + 1;
          if (action.payload.playerId) {
            t.registered_player_ids = t.registered_player_ids || [];
            if (!t.registered_player_ids.includes(action.payload.playerId)) {
              t.registered_player_ids.push(action.payload.playerId);
            }
          }
        }
        const playerId = action.payload.playerId != null ? String(action.payload.playerId) : null;
        if (playerId && state.playerTournamentIdsByPlayerId?.[playerId]) {
          if (!state.playerTournamentIdsByPlayerId[playerId].includes(tid)) {
            state.playerTournamentIdsByPlayerId[playerId].push(tid);
          }
        }
      })
      .addCase(withdrawFromTournament.fulfilled, (state, action) => {
        const tid = String(action.payload.tournamentId);
        const t = state.entities[tid];
        if (t) {
          t.participants = Math.max(0, (Number(t.participants) || 1) - 1);
          if (action.payload.playerId && t.registered_player_ids) {
            t.registered_player_ids = t.registered_player_ids.filter(
              (id) => String(id) !== String(action.payload.playerId)
            );
          }
          if (action.payload.teamId && t.registered_team_ids) {
            t.registered_team_ids = t.registered_team_ids.filter(
              (id) => String(id) !== String(action.payload.teamId)
            );
            if (Array.isArray(t.registered_teams)) {
              t.registered_teams = t.registered_teams.filter(
                (team) => String(team.team_id || team.id) !== String(action.payload.teamId)
              );
            }
          }
        }
        const playerId = action.payload.playerId != null ? String(action.payload.playerId) : null;
        if (playerId && state.playerTournamentIdsByPlayerId?.[playerId]) {
          state.playerTournamentIdsByPlayerId[playerId] = state.playerTournamentIdsByPlayerId[playerId].filter(
            (id) => String(id) !== tid
          );
        }
      });
  }
});

export const {
  clearTournamentsError,
  resetTournamentsStatus,
  resetMutationStatus,

  // UI actions
  setTournamentActiveTab,
  setTournamentFilters,
  resetTournamentFilters,
  openTournamentDetails,
  closeTournamentDetails,
  openRegistrationModal,
  closeRegistrationModal,
  openJoinByIdModal,
  closeJoinByIdModal,
  openWithdrawConfirmation,
  closeWithdrawConfirmation,

  // Create Tournament UI
  setCreateTournamentStep,
  setCreateTournamentKind,
  setCreateTournamentVisibility,
  setCreateTournamentTeamMode,
  setCreateTournamentTeamSize,
  setCreateTournamentGroup,
  setCreateTournamentGame,
  setCreateTournamentFormat,
  setCreateTournamentIsMulti,
  setCreateTournamentStages,
  addCreateTournamentStage,
  removeCreateTournamentStage,
  updateCreateTournamentStage,
  setCreateTournamentFields,
  setCreatedInviteCode,
  setCreateTournamentToast,
  clearCreateTournamentToast,
  resetCreateTournamentForm,

  // Publisher Tournament UI
  setPublisherView,
  setPublisherWizardStep,
  setPublisherSelectedType,
  setPublisherSelectedVisibility,
  setPublisherStages,
  setPublisherFormField,
  resetPublisherForm,
  setPublisherMgmtField,
  setPublisherToast,
  clearPublisherToast,
  setPublisherStatusFilter,
  setPublisherSelectedGame,
  setPublisherEditId,
  setPublisherActiveTournament,
  openPublisherConfirmModal,
  closePublisherConfirmModal
} = tournamentSlice.actions;

export default tournamentSlice.reducer;
