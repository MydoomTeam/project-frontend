import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBackendErrorMessage } from '../services/errorHandler';
import { getPlayerById, getPlayerTournamentHistory } from '../services/players';
import {
  cancelTournament,
  generateBracket,
  getBracket,
  getPlayerHistory,
  getRanking,
  getTournamentDetail,
  getTournamentRegistrations,
  registerInTournament,
  registerMatchResult,
  startTournament,
  unregisterFromTournament,
  updateRegistrationStatus,
} from '../services/tournaments';
import {
  Match,
  RankingItem,
  Tournament,
  TournamentRegistration,
} from '../types/models';

const STORAGE_KEY = 'user_profile';
const IN_PROGRESS_REFRESH_MS = 4000;

const normalizeRegistrationStatus = (status: string | null | undefined): string => {
  if (!status) return '';
  return status.trim().toLowerCase();
};

const isRegisteredByStatus = (status: string | null | undefined): boolean => {
  const normalized = normalizeRegistrationStatus(status);
  return normalized === 'por confirmar' || normalized === 'confirmado';
};

const parseNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getStoredUserProfile = (): any | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getStoredTournamentIds = (): number[] => {
  const currentUser = getStoredUserProfile();
  if (!currentUser) return [];

  const candidate =
    currentUser.registered_tournaments ||
    currentUser.registrations ||
    currentUser.tournament_ids ||
    [];

  if (!Array.isArray(candidate)) return [];

  return candidate
    .map((value: unknown) => Number(value))
    .filter((value) => !Number.isNaN(value));
};

const updateStoredTournamentIds = (tournamentId: number, registered: boolean): void => {
  const currentUser = getStoredUserProfile();
  if (!currentUser) return;

  const registrations = new Set<number>(getStoredTournamentIds());
  if (registered) {
    registrations.add(tournamentId);
  } else {
    registrations.delete(tournamentId);
  }

  currentUser.registered_tournaments = Array.from(registrations);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
  } catch {
    // ignore localStorage write failures
  }
};

export type RegistrationFilter = 'ALL' | 'Por confirmar' | 'Confirmado' | 'Rechazado' | 'Cancelada';

export interface PendingResult {
  matchId: number;
  winnerId: number;
}

export interface TournamentDetailState {
  tournament: Tournament | null;
  matches: Match[];
  ranking: RankingItem[];
  history: Match[] | null;
  registrations: TournamentRegistration[];
  playerNames: Record<number, string>;
  playerAvatars: Record<number, string | null>;
  playerElos: Record<number, number | null>;
  currentUserId: number | null;
  isRegistered: boolean;
  currentUserRegistrationStatus: string | null;
  error: string;
  registrationFilter: RegistrationFilter;
  activeTab: 'bracket' | 'history' | 'ranking' | 'technical';
  pendingResult: PendingResult | null;
  pendingScore1: string;
  pendingScore2: string;
  isLoading: boolean;
  updatingRegistrationIds: number[];
  registrationSummary: {
    total: number;
    pending: number;
    confirmed: number;
    rejected: number;
    cancelled: number;
  };
  filteredRegistrations: TournamentRegistration[];
  canShowHistoryTab: boolean;
  canShowRankingTab: boolean;
  usesScoreMode: boolean;
  hasPendingRegistration: boolean;
  hasConfirmedRegistration: boolean;
  isPlayerInTournament: boolean;
  isCreator: boolean;
  participantStatusLabel: string;
  myRoleLabel: string;
  loadMyHistory: () => Promise<void>;
  setActiveTab: (tab: 'bracket' | 'history' | 'ranking' | 'technical') => void;
  setRegistrationFilter: (filter: RegistrationFilter) => void;
  setPendingScore1: (value: string) => void;
  setPendingScore2: (value: string) => void;
  closeResultModal: () => void;
  handleRegister: () => Promise<void>;
  handleUnregister: () => Promise<void>;
  handleCancelTournament: () => Promise<void>;
  handleGenerateBracket: () => Promise<void>;
  handleStartTournament: () => Promise<void>;
  handleReportWinner: (matchId: number, winnerId: number) => void;
  confirmPendingResult: () => Promise<void>;
  handleRegistrationStatusChange: (playerId: number, status: 'Confirmado' | 'Rechazado') => Promise<void>;
  selectModalWinner: (winnerId: number) => void;
}

export const useTournamentDetail = (tournamentId: number): TournamentDetailState => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [history, setHistory] = useState<Match[] | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [playerAvatars, setPlayerAvatars] = useState<Record<number, string | null>>({});
  const [playerElos, setPlayerElos] = useState<Record<number, number | null>>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [currentUserRegistrationStatus, setCurrentUserRegistrationStatus] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>('ALL');
  const [activeTab, setActiveTab] = useState<'bracket' | 'history' | 'ranking' | 'technical'>('bracket');
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);
  const [pendingScore1, setPendingScore1] = useState('');
  const [pendingScore2, setPendingScore2] = useState('');
  const [updatingRegistrationIds, setUpdatingRegistrationIds] = useState<number[]>([]);

  const closeResultModal = useCallback(() => {
    setPendingResult(null);
    setPendingScore1('');
    setPendingScore2('');
  }, []);

  const loadStoredRegistration = useCallback(() => {
    const storedIds = getStoredTournamentIds();
    setIsRegistered(storedIds.includes(tournamentId));
  }, [tournamentId]);

  const hydratePlayers = useCallback(async (playerIds: Set<number>) => {
    if (playerIds.size === 0) return;

    const resolvedEntries = await Promise.all(
      Array.from(playerIds).map(async (playerId) => {
        try {
          const player = await getPlayerById(playerId);
          return {
            playerId,
            username: player.username,
            avatarUrl: player.avatar_url ?? null,
            elo: typeof player.global_elo === 'number' ? player.global_elo : null,
          };
        } catch {
          return {
            playerId,
            username: `Jugador #${playerId}`,
            avatarUrl: null,
            elo: null,
          };
        }
      }),
    );

    setPlayerNames((prev) => ({
      ...prev,
      ...Object.fromEntries(resolvedEntries.map((entry) => [entry.playerId, entry.username])),
    }));

    setPlayerAvatars((prev) => ({
      ...prev,
      ...Object.fromEntries(resolvedEntries.map((entry) => [entry.playerId, entry.avatarUrl])),
    }));

    setPlayerElos((prev) => ({
      ...prev,
      ...Object.fromEntries(resolvedEntries.map((entry) => [entry.playerId, entry.elo])),
    }));
  }, []);

  const loadCurrentUserRegistrationStatus = useCallback(async (playerId: number) => {
    try {
      const historyData = await getPlayerTournamentHistory(playerId);
      const currentTournament = historyData.find((item) => item.id === tournamentId);
      const status = currentTournament?.registration_status ?? null;
      setCurrentUserRegistrationStatus(status);
      if (isRegisteredByStatus(status)) {
        setIsRegistered(true);
      }
    } catch {
      // Keep current registration state if auxiliary lookup fails.
    }
  }, [tournamentId]);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const storedUser = getStoredUserProfile();
    const parsedUserId = parseNumber(storedUser?.id);
    if (parsedUserId !== null) {
      setCurrentUserId(parsedUserId);
    }

    try {
      const tournamentData = await getTournamentDetail(tournamentId);
      setTournament(tournamentData);

      const playerIds = new Set<number>();
      if (typeof tournamentData.creator_id === 'number') {
        playerIds.add(tournamentData.creator_id);
      }

      if (tournamentData.status !== 'Pendiente') {
        const bracketData = await getBracket(tournamentId);
        setMatches(bracketData.matches || []);
        (bracketData.matches || []).forEach((match) => {
          if (typeof match.player1_id === 'number') playerIds.add(match.player1_id);
          if (typeof match.player2_id === 'number') playerIds.add(match.player2_id);
          if (typeof match.winner_id === 'number') playerIds.add(match.winner_id);
        });
      } else {
        setMatches([]);
      }

      if (tournamentData.status === 'Finalizado') {
        const rankingData = await getRanking(tournamentId);
        setRanking(rankingData.ranking || []);
        (rankingData.ranking || []).forEach((row) => {
          if (typeof row.player_id === 'number') playerIds.add(row.player_id);
        });
      } else {
        setRanking([]);
      }

      const explicitRegistration =
        (tournamentData as any).is_registered ??
        (tournamentData as any).current_user_registered ??
        (tournamentData as any).registered;

      if (typeof explicitRegistration === 'boolean') {
        setIsRegistered(explicitRegistration);
      } else {
        loadStoredRegistration();
      }

      if (parsedUserId !== null) {
        await loadCurrentUserRegistrationStatus(parsedUserId);
      }

      const creatorView = parsedUserId !== null && parsedUserId === tournamentData.creator_id;
      if (creatorView && tournamentData.status === 'Pendiente') {
        const registrationData = await getTournamentRegistrations(tournamentId);
        setRegistrations(registrationData);
        registrationData.forEach((item) => {
          if (typeof item.player_id === 'number') playerIds.add(item.player_id);
        });
      } else {
        setRegistrations([]);
      }

      await hydratePlayers(playerIds);
    } catch (err: unknown) {
      setError(getBackendErrorMessage(err, 'Error al cargar datos del torneo.'));
    } finally {
      setIsLoading(false);
    }
  }, [hydratePlayers, loadCurrentUserRegistrationStatus, loadStoredRegistration, tournamentId]);

  useEffect(() => {
    if (tournamentId <= 0) return;
    void loadAllData();
  }, [loadAllData, tournamentId]);

  useEffect(() => {
    if (tournament?.status !== 'En curso') return;
    const intervalId = window.setInterval(() => {
      void loadAllData();
    }, IN_PROGRESS_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [loadAllData, tournament?.status]);

  const handleRegister = useCallback(async () => {
    if (isRegistered) return;
    try {
      await registerInTournament(tournamentId);
      setIsRegistered(true);
      setCurrentUserRegistrationStatus('Por confirmar');
      updateStoredTournamentIds(tournamentId, true);
      await loadAllData();
    } catch (err: unknown) {
      alert(getBackendErrorMessage(err, 'Error al inscribirse'));
    }
  }, [isRegistered, loadAllData, tournamentId]);

  const handleUnregister = useCallback(async () => {
    const normalized = normalizeRegistrationStatus(currentUserRegistrationStatus);
    if (!isRegistered && normalized !== 'por confirmar' && normalized !== 'confirmado') return;

    try {
      await unregisterFromTournament(tournamentId);
      setIsRegistered(false);
      setCurrentUserRegistrationStatus('Cancelada');
      updateStoredTournamentIds(tournamentId, false);
      window.location.assign('/tournaments');
    } catch (err: unknown) {
      alert(getBackendErrorMessage(err, 'Error al cancelar inscripción'));
    }
  }, [currentUserRegistrationStatus, isRegistered, tournamentId]);

  const handleCancelTournament = useCallback(async () => {
    if (!window.confirm('¿Seguro que deseas eliminar permanentemente este torneo?')) {
      return;
    }

    try {
      await cancelTournament(tournamentId);
      window.location.assign('/dashboard');
    } catch (err: unknown) {
      alert(getBackendErrorMessage(err, 'No se pudo cancelar el torneo.'));
    }
  }, [tournamentId]);

  const handleGenerateBracket = useCallback(async () => {
    try {
      await generateBracket(tournamentId);
      await loadAllData();
    } catch (err: unknown) {
      alert(getBackendErrorMessage(err, 'Error al generar el bracket'));
    }
  }, [loadAllData, tournamentId]);

  const handleStartTournament = useCallback(async () => {
    try {
      await startTournament(tournamentId);
      await loadAllData();
    } catch (err: unknown) {
      alert(getBackendErrorMessage(err, 'Error al iniciar torneo'));
    }
  }, [loadAllData, tournamentId]);

  const handleReportWinner = useCallback((matchId: number, winnerId: number) => {
    setPendingResult({ matchId, winnerId });
    const selectedMatch = matches.find((match) => match.id === matchId);
    setPendingScore1(selectedMatch?.score_player1 != null ? String(selectedMatch.score_player1) : '');
    setPendingScore2(selectedMatch?.score_player2 != null ? String(selectedMatch.score_player2) : '');
  }, [matches]);

  const confirmPendingResult = useCallback(async () => {
    if (!pendingResult) return;

    const score1 = pendingScore1.trim() === '' ? undefined : Number(pendingScore1);
    const score2 = pendingScore2.trim() === '' ? undefined : Number(pendingScore2);

    try {
      await registerMatchResult(tournamentId, pendingResult.matchId, pendingResult.winnerId, score1, score2);
      setPendingResult(null);
      setPendingScore1('');
      setPendingScore2('');
      await loadAllData();
    } catch (err: unknown) {
      setPendingResult(null);
      setPendingScore1('');
      setPendingScore2('');
      alert(getBackendErrorMessage(err, 'Error al guardar resultado'));
    }
  }, [loadAllData, pendingResult, pendingScore1, pendingScore2, tournamentId]);

  const loadMyHistory = useCallback(async () => {
    if (currentUserId === null) return;

    try {
      const historyData = await getPlayerHistory(tournamentId, currentUserId);
      setHistory(historyData);
      const playerIds = new Set<number>();
      historyData.forEach((match) => {
        if (typeof match.player1_id === 'number') playerIds.add(match.player1_id);
        if (typeof match.player2_id === 'number') playerIds.add(match.player2_id);
        if (typeof match.winner_id === 'number') playerIds.add(match.winner_id);
      });
      await hydratePlayers(playerIds);
    } catch (err: unknown) {
      alert(getBackendErrorMessage(err, 'No se pudo cargar el historial'));
    }
  }, [currentUserId, hydratePlayers, tournamentId]);

  const handleRegistrationStatusChange = useCallback(async (playerId: number, status: 'Confirmado' | 'Rechazado') => {
    setUpdatingRegistrationIds((prev) => (prev.includes(playerId) ? prev : [...prev, playerId]));
    try {
      await updateRegistrationStatus(tournamentId, playerId, status);
      setRegistrations((prev) => prev.map((item) => (
        item.player_id === playerId ? { ...item, status } : item
      )));
      await loadAllData();
    } catch (err: unknown) {
      alert(getBackendErrorMessage(err, 'No se pudo actualizar el estado de inscripción'));
    } finally {
      setUpdatingRegistrationIds((prev) => prev.filter((id) => id !== playerId));
    }
  }, [loadAllData, tournamentId]);

  const selectModalWinner = useCallback((winnerId: number) => {
    setPendingResult((current) => (current ? { ...current, winnerId } : current));
  }, []);

  const registrationSummary = useMemo(() => ({
    total: registrations.length,
    pending: registrations.filter((item) => item.status === 'Por confirmar').length,
    confirmed: registrations.filter((item) => item.status === 'Confirmado').length,
    rejected: registrations.filter((item) => item.status === 'Rechazado').length,
    cancelled: registrations.filter((item) => item.status === 'Cancelada').length,
  }), [registrations]);

  const filteredRegistrations = useMemo(() => {
    if (registrationFilter === 'ALL') return registrations;
    return registrations.filter((item) => item.status === registrationFilter);
  }, [registrationFilter, registrations]);

  const isCreator = currentUserId !== null && tournament?.creator_id === currentUserId;
  const appearsInMatches = currentUserId !== null && matches.some((match) => (
    match.player1_id === currentUserId || match.player2_id === currentUserId || match.winner_id === currentUserId
  ));
  const appearsInRanking = currentUserId !== null && ranking.some((row) => row.player_id === currentUserId);
  const appearsInRegistrations = currentUserId !== null && registrations.some((row) => row.player_id === currentUserId);
  const currentRegistrationNormalized = normalizeRegistrationStatus(currentUserRegistrationStatus);
  const hasPendingRegistration = currentRegistrationNormalized === 'por confirmar';
  const hasConfirmedRegistration = currentRegistrationNormalized === 'confirmado';
  const hasPlayerParticipation = isRegistered || isRegisteredByStatus(currentUserRegistrationStatus) || appearsInMatches || appearsInRanking || appearsInRegistrations;
  const isPlayerInTournament = !isCreator && hasPlayerParticipation;

  const myRoleLabel = isCreator
    ? (hasPlayerParticipation ? 'Administrador y jugador' : 'Administrador del torneo')
    : (hasPlayerParticipation ? 'Jugador inscrito' : 'No inscrito');

  const participantStatusLabel = tournament?.status === 'Finalizado'
    ? '✓ Participaste en este torneo'
    : (tournament?.status === 'En curso' ? '✓ Participando actualmente' : '✓ Inscripción confirmada');

  const canShowHistoryTab = tournament?.status !== 'Pendiente';
  const canShowRankingTab = tournament?.status === 'Finalizado';
  const usesScoreMode = !!tournament?.uses_score;
  const canSubmitScore = !usesScoreMode || (pendingScore1.trim() !== '' && pendingScore2.trim() !== '');

  return {
    tournament,
    matches,
    ranking,
    history,
    registrations,
    playerNames,
    playerAvatars,
    playerElos,
    currentUserId,
    isRegistered,
    currentUserRegistrationStatus,
    error,
    registrationFilter,
    activeTab,
    pendingResult,
    pendingScore1,
    pendingScore2,
    isLoading,
    updatingRegistrationIds,
    registrationSummary,
    filteredRegistrations,
    canShowHistoryTab,
    canShowRankingTab,
    usesScoreMode,
    hasPendingRegistration,
    hasConfirmedRegistration,
    isPlayerInTournament,
    isCreator,
    participantStatusLabel,
    myRoleLabel,
    loadMyHistory,
    setActiveTab,
    setRegistrationFilter,
    setPendingScore1,
    setPendingScore2,
    closeResultModal,
    handleRegister,
    handleUnregister,
    handleCancelTournament,
    handleGenerateBracket,
    handleStartTournament,
    handleReportWinner,
    confirmPendingResult,
    handleRegistrationStatusChange,
    selectModalWinner,
  };
};
