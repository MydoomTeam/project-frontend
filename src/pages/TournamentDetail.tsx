import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  getTournamentDetail,
  registerInTournament,
  unregisterFromTournament,
  cancelTournament,
  generateBracket,
  startTournament,
  getBracket,
  registerMatchResult,
  getRanking,
  getPlayerHistory,
  getTournamentRegistrations,
  updateRegistrationStatus,
} from '../services/tournaments';
import { getPlayerById, getPlayerTournamentHistory } from '../services/players';
import { Tournament, Match, RankingItem, TournamentRegistration } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';
import { BracketViewer } from '../components/BracketViewer';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../utils/tournamentStatus';
import { formatDateForDisplay } from '../utils/dateDisplay';

const IN_PROGRESS_REFRESH_MS = 4000;

const toDisplayValue = (value?: string | number | null): string => {
  if (value === null || value === undefined || value === '') return 'Sin definir';
  return String(value);
};

const toDisplayDate = (value?: string | null): string => formatDateForDisplay(value);

interface PendingResult {
  matchId: number;
  winnerId: number;
}

type RegistrationFilter = 'ALL' | 'Por confirmar' | 'Confirmado' | 'Rechazado' | 'Cancelada';
type DetailTab = 'bracket' | 'history' | 'ranking' | 'technical';

const normalizeRegistrationStatus = (status: string | null | undefined): string => {
  if (!status) return '';
  return status.trim().toLowerCase();
};

const isRegisteredByStatus = (status: string | null | undefined): boolean => {
  const normalized = normalizeRegistrationStatus(status);
  return normalized === 'por confirmar' || normalized === 'confirmado';
};

export const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tournamentId = parseInt(id || '0', 10);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [currentUserRegistrationStatus, setCurrentUserRegistrationStatus] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);
  const [pendingScore1, setPendingScore1] = useState<string>('');
  const [pendingScore2, setPendingScore2] = useState<string>('');
  const [history, setHistory] = useState<Match[] | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [updatingRegistrationIds, setUpdatingRegistrationIds] = useState<number[]>([]);
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>('ALL');
  const [activeTab, setActiveTab] = useState<DetailTab>('bracket');
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [playerAvatars, setPlayerAvatars] = useState<Record<number, string | null>>({});
  const [playerElos, setPlayerElos] = useState<Record<number, number | null>>({});

  const registrationSummary = useMemo(() => {
    return {
      total: registrations.length,
      pending: registrations.filter((item) => item.status === 'Por confirmar').length,
      confirmed: registrations.filter((item) => item.status === 'Confirmado').length,
      rejected: registrations.filter((item) => item.status === 'Rechazado').length,
      cancelled: registrations.filter((item) => item.status === 'Cancelada').length,
    };
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    if (registrationFilter === 'ALL') {
      return registrations;
    }
    return registrations.filter((item) => item.status === registrationFilter);
  }, [registrations, registrationFilter]);

  const getStoredTournamentRegistrations = (): number[] => {
    const userRaw = localStorage.getItem('user_profile');
    if (!userRaw) return [];

    try {
      const currentUser = JSON.parse(userRaw) as any;
      const registrations =
        currentUser?.registered_tournaments ||
        currentUser?.registrations ||
        currentUser?.tournament_ids ||
        [];

      if (Array.isArray(registrations)) {
        return registrations.map((value: any) => Number(value)).filter((value: number) => !Number.isNaN(value));
      }
    } catch {
      return [];
    }

    return [];
  };

  const updateStoredTournamentRegistrations = (id: number, registered: boolean) => {
    const userRaw = localStorage.getItem('user_profile');
    if (!userRaw) return;

    try {
      const currentUser = JSON.parse(userRaw) as any;
      const registrations = new Set<number>(getStoredTournamentRegistrations());
      if (registered) {
        registrations.add(id);
      } else {
        registrations.delete(id);
      }

      currentUser.registered_tournaments = Array.from(registrations);
      localStorage.setItem('user_profile', JSON.stringify(currentUser));
    } catch {
      // ignore localStorage write errors
    }
  };

  const loadStoredRegistration = () => {
    const registrations = getStoredTournamentRegistrations();
    setIsRegistered(registrations.includes(tournamentId));
  };

  const loadCurrentUserRegistrationStatus = async (playerId: number) => {
    try {
      const tournaments = await getPlayerTournamentHistory(playerId);
      const currentTournament = tournaments.find((item) => item.id === tournamentId);
      const status = currentTournament?.registration_status ?? null;
      setCurrentUserRegistrationStatus(status);
      if (isRegisteredByStatus(status)) {
        setIsRegistered(true);
      }
    } catch {
      // Keep existing state when this auxiliary source is unavailable.
    }
  };

  const loadAllData = async () => {
    try {
      const tData = await getTournamentDetail(tournamentId);
      setTournament(tData);
      const collectedPlayerIds = new Set<number>();
      if (typeof tData.creator_id === 'number') {
        collectedPlayerIds.add(tData.creator_id);
      }

      if (tData.status !== 'Pendiente') {
        const bData = await getBracket(tournamentId);
        setMatches(bData.matches || []);
        for (const match of bData.matches || []) {
          if (typeof match.player1_id === 'number') collectedPlayerIds.add(match.player1_id);
          if (typeof match.player2_id === 'number') collectedPlayerIds.add(match.player2_id);
          if (typeof match.winner_id === 'number') collectedPlayerIds.add(match.winner_id);
        }
      }

      if (tData.status === 'Finalizado') {
        const rData = await getRanking(tournamentId);
        setRanking(rData.ranking || []);
        for (const row of rData.ranking || []) {
          if (typeof row.player_id === 'number') collectedPlayerIds.add(row.player_id);
        }
      }

      const explicitRegistration =
        (tData as any).is_registered ??
        (tData as any).current_user_registered ??
        (tData as any).registered;

      if (typeof explicitRegistration === 'boolean') {
        setIsRegistered(explicitRegistration);
      } else {
        loadStoredRegistration();
      }

      const userRaw = localStorage.getItem('user_profile');
      const parsedUserId = userRaw ? JSON.parse(userRaw).id : null;
      const creatorView = parsedUserId === tData.creator_id;
      if (creatorView && tData.status === 'Pendiente') {
        const registrationData = await getTournamentRegistrations(tournamentId);
        setRegistrations(registrationData);
        for (const registration of registrationData) {
          if (typeof registration.player_id === 'number') {
            collectedPlayerIds.add(registration.player_id);
          }
        }
      } else {
        setRegistrations([]);
      }

      await hydratePlayers(collectedPlayerIds);
    } catch (err: any) {
      setError(getBackendErrorMessage(err, 'Error al cargar datos del torneo.'));
    }
  };

  const hydratePlayers = async (ids: Set<number>) => {
    if (ids.size === 0) return;

    const resolvedEntries = await Promise.all(
      Array.from(ids).map(async (playerId) => {
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
  };

  useEffect(() => {
    const userRaw = localStorage.getItem('user_profile');
    if (userRaw) {
      const parsed = JSON.parse(userRaw).id;
      setCurrentUserId(parsed);
      if (typeof parsed === 'number') {
        void loadCurrentUserRegistrationStatus(parsed);
      }
    }
    loadAllData();
  }, [tournamentId]);

  useEffect(() => {
    if (tournament?.status !== 'En curso') {
      return;
    }
    const intervalId = window.setInterval(loadAllData, IN_PROGRESS_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [tournament?.status, tournamentId]);

  const handleRegister = async () => {
    if (isRegistered) return;

    try {
      await registerInTournament(tournamentId);
      setIsRegistered(true);
      setCurrentUserRegistrationStatus('Por confirmar');
      updateStoredTournamentRegistrations(tournamentId, true);
      loadAllData();
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'Error al inscribirse'));
    }
  };

  const handleUnregister = async () => {
    const normalized = normalizeRegistrationStatus(currentUserRegistrationStatus);
    if (!isRegistered && normalized !== 'por confirmar' && normalized !== 'confirmado') return;

    try {
      await unregisterFromTournament(tournamentId);
      setIsRegistered(false);
      setCurrentUserRegistrationStatus('Cancelada');
      updateStoredTournamentRegistrations(tournamentId, false);
      navigate('/tournaments');
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'Error al cancelar inscripción'));
    }
  };

  const handleCancelTournament = async () => {
    if (window.confirm('¿Seguro que deseas eliminar permanentemente este torneo?')) {
      try {
        await cancelTournament(tournamentId);
        navigate('/dashboard');
      } catch (err) {
        alert('No se pudo cancelar el torneo.');
      }
    }
  };

  const handleGenerateBracket = async () => {
    try {
      await generateBracket(tournamentId);
      loadAllData();
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'Error al generar el bracket'));
    }
  };

  const handleStart = async () => {
    try {
      await startTournament(tournamentId);
      loadAllData();
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'Error al iniciar torneo'));
    }
  };

  const handleReportWinner = (matchId: number, winnerId: number) => {
    setPendingResult({ matchId, winnerId });
    const selectedMatch = matches.find((match) => match.id === matchId);
    setPendingScore1(selectedMatch?.score_player1 != null ? String(selectedMatch.score_player1) : '');
    setPendingScore2(selectedMatch?.score_player2 != null ? String(selectedMatch.score_player2) : '');
  };

  const confirmPendingResult = async () => {
    if (!pendingResult) return;

    const score1 = pendingScore1.trim() === '' ? undefined : Number(pendingScore1);
    const score2 = pendingScore2.trim() === '' ? undefined : Number(pendingScore2);

    try {
      await registerMatchResult(tournamentId, pendingResult.matchId, pendingResult.winnerId, score1, score2);
      setPendingResult(null);
      setPendingScore1('');
      setPendingScore2('');
      loadAllData();
    } catch (err: any) {
      setPendingResult(null);
      setPendingScore1('');
      setPendingScore2('');
      alert(getBackendErrorMessage(err, 'Error al guardar resultado'));
    }
  };

  const loadMyHistory = async () => {
    if (currentUserId === null) return;

    try {
      const data = await getPlayerHistory(tournamentId, currentUserId);
      setHistory(data);
      const idsFromHistory = new Set<number>();
      for (const match of data) {
        if (typeof match.player1_id === 'number') idsFromHistory.add(match.player1_id);
        if (typeof match.player2_id === 'number') idsFromHistory.add(match.player2_id);
        if (typeof match.winner_id === 'number') idsFromHistory.add(match.winner_id);
      }
      if (idsFromHistory.size > 0) {
        await hydratePlayers(idsFromHistory);
      }
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'No se pudo cargar el historial'));
    }
  };

  const handleRegistrationStatusChange = async (playerId: number, status: 'Confirmado' | 'Rechazado') => {
    try {
      setUpdatingRegistrationIds((prev) => (prev.includes(playerId) ? prev : [...prev, playerId]));
      await updateRegistrationStatus(tournamentId, playerId, status);
      setRegistrations((prev) => prev.map((item) => (
        item.player_id === playerId
          ? {
              ...item,
              status,
            }
          : item
      )));
      await loadAllData();
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'No se pudo actualizar el estado de inscripción'));
    } finally {
      setUpdatingRegistrationIds((prev) => prev.filter((id) => id !== playerId));
    }
  };

  const pendingMatch = useMemo(() => {
    if (!pendingResult) return null;
    return matches.find((match) => match.id === pendingResult.matchId) ?? null;
  }, [matches, pendingResult]);

  if (!tournament) {
    return <LoadingSpinner message="Cargando torneo..." />;
  }

  const isCreator = currentUserId === tournament.creator_id;
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
  const participantStatusLabel = tournament.status === 'Finalizado'
    ? '✓ Participaste en este torneo'
    : (tournament.status === 'En curso' ? '✓ Participando actualmente' : '✓ Inscripción confirmada');

  const getPlayerDisplayName = (playerId: number | null | undefined): string => {
    if (playerId == null) return 'BYE';
    return playerNames[playerId] || `Jugador #${playerId}`;
  };

  const getPlayerEloLabel = (playerId: number | null | undefined): string => {
    if (playerId == null) return '—';
    const value = playerElos[playerId];
    return typeof value === 'number' ? value.toLocaleString('es-CO') : '—';
  };

  const selectModalWinner = (winnerId: number) => {
    setPendingResult((current) => (current ? { ...current, winnerId } : current));
  };
  const usesScoreMode = !!tournament.uses_score;
  const canSubmitScore = !usesScoreMode || (pendingScore1.trim() !== '' && pendingScore2.trim() !== '');
  const canShowHistoryTab = tournament.status !== 'Pendiente';
  const canShowRankingTab = tournament.status === 'Finalizado';

  const technicalRows = [
    {
      label: 'Creador',
      value: (
        <Link to={`/profile/${tournament.creator_id}`} className="player-profile-link" title="Ver perfil del creador">
          {playerNames[tournament.creator_id] || tournament.creator_name || `Administrador #${tournament.creator_id}`}
        </Link>
      ),
    },
    { label: 'Mi rol', value: myRoleLabel },
    { label: 'Participantes confirmados', value: tournament.total_participants },
    { label: 'Juego', value: tournament.game_name },
    { label: 'Categoría', value: tournament.game_category },
    { label: 'Cupo objetivo', value: tournament.participant_target },
    { label: 'Duración por ronda', value: tournament.round_duration_minutes ? `${tournament.round_duration_minutes} min` : null },
    { label: 'Fecha de inicio', value: tournament.start_date ? toDisplayDate(tournament.start_date) : null },
    { label: 'Fecha de cierre', value: tournament.end_date ? toDisplayDate(tournament.end_date) : null },
    { label: 'Idioma', value: tournament.language },
    { label: 'Región', value: tournament.region },
  ].filter((row) => row.value !== null && row.value !== undefined && String(row.value).trim() !== '');

  return (
    <div className="td-page">

      {/* ── Header panel ── */}
      <motion.div
        className="dashboard-panel td-header-panel"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <div className="td-header-meta">
          <p className="td-breadcrumb">MIS TORNEOS / {tournament.name.toUpperCase()}</p>
          <Link to="/tournaments" className="td-back-link">← Volver a torneos</Link>
          <div className="td-header-title-row">
            <h1 className="td-title">{tournament.name}</h1>
            <span className={`badge ${getTournamentStatusBadgeClass(tournament.status)}`}>
              {toBusinessTournamentStatus(tournament.status)}
            </span>
          </div>
          <p className="td-subtitle">
            {tournament.elimination_type} · {tournament.rounds} rondas
            {isCreator && <span className="td-creator-chip">Administrador</span>}
            {hasPlayerParticipation && <span className="td-player-chip">Participante</span>}
          </p>
        </div>

        <div className="td-actions">
          {tournament.status === 'Pendiente' && !isCreator && (
            <>
              <button
                onClick={handleRegister}
                className={`btn td-btn-primary ${isRegistered ? 'td-btn-registered' : ''}`}
                disabled={isRegistered || hasPendingRegistration || hasConfirmedRegistration}
              >
                {hasConfirmedRegistration
                  ? '✓ Inscripción confirmada'
                  : (hasPendingRegistration || isRegistered ? '✓ Inscripción enviada' : 'Inscribirse')}
              </button>
              {(isRegistered || hasPendingRegistration || hasConfirmedRegistration) && (
                <button onClick={handleUnregister} className="btn btn-secondary td-btn-sm">
                  Salirme del torneo
                </button>
              )}
            </>
          )}
          {tournament.status !== 'Pendiente' && isPlayerInTournament && !isCreator && (
            <button className="btn td-btn-primary td-btn-registered" disabled>
              {participantStatusLabel}
            </button>
          )}
          {isCreator && (
            <>
              {tournament.status === 'Pendiente' && (
                <button onClick={handleGenerateBracket} className="btn td-btn-primary">
                  Generar cuadro
                </button>
              )}
              {tournament.status === 'Listo para iniciar' && (
                <button onClick={handleStart} className="btn td-btn-success">
                  Iniciar torneo
                </button>
              )}
              {(tournament.status === 'Pendiente' || tournament.status === 'Listo para iniciar') && (
                <button onClick={handleCancelTournament} className="btn btn-danger td-btn-sm">
                  Eliminar torneo
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>

      <motion.div
        className="dashboard-panel td-tabs-panel"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
      >
        <div className="td-tabs">
          <button type="button" className={`td-tab ${activeTab === 'bracket' ? 'active' : ''}`} onClick={() => setActiveTab('bracket')}>
            Cuadro
          </button>
          {canShowHistoryTab && (
            <button type="button" className={`td-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              Mi historial
            </button>
          )}
          {canShowRankingTab && (
            <button type="button" className={`td-tab ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => setActiveTab('ranking')}>
              Clasificación
            </button>
          )}
          <button type="button" className={`td-tab ${activeTab === 'technical' ? 'active' : ''}`} onClick={() => setActiveTab('technical')}>
            Ficha técnica
          </button>
        </div>
      </motion.div>

      {activeTab === 'technical' && (
        <motion.div
          className="dashboard-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
        >
          <div className="dashboard-panel-head dashboard-panel-head-tight">
            <div>
              <h2>Ficha del torneo</h2>
            </div>
          </div>
          <div className="td-info-grid">
            {technicalRows.map((row) => (
              <div className="td-info-item" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {error && <div className="dashboard-error-banner">{error}</div>}

      {/* ── Bracket ── */}
      {activeTab === 'bracket' && matches.length > 0 && (
        <motion.div
          className="dashboard-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <div className="dashboard-panel-head">
            <h2>Cuadro del torneo</h2>
          </div>
          <BracketViewer
            matches={matches}
            eliminationType={tournament.elimination_type}
            playerNames={playerNames}
            playerAvatars={playerAvatars}
            isCreator={isCreator}
            participantCount={tournament.total_participants ?? 0}
            usesScore={usesScoreMode}
            onSelectWinner={handleReportWinner}
          />
        </motion.div>
      )}

      {/* ── Participants (admin + Pendiente) ── */}
      {activeTab === 'technical' && isCreator && tournament.status === 'Pendiente' && (
        <motion.div
          className="dashboard-panel td-participants-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="dashboard-panel-head">
            <div>
              <h2>Participantes</h2>
              <p>Gestiona inscripciones antes de generar el bracket.</p>
            </div>
          </div>

          <div className="td-registration-summary">
            <span className="badge badge-ready">Total: {registrationSummary.total}</span>
            <span className="badge badge-pending">Por confirmar: {registrationSummary.pending}</span>
            <span className="badge badge-active">Confirmados: {registrationSummary.confirmed}</span>
            <span className="badge badge-finished">Rechazados: {registrationSummary.rejected}</span>
            <span className="badge badge-finished">Cancelados: {registrationSummary.cancelled}</span>
          </div>

          <div className="td-filter-bar">
            {(['ALL', 'Por confirmar', 'Confirmado', 'Rechazado', 'Cancelada'] as RegistrationFilter[]).map((filterOption) => (
              <button
                key={filterOption}
                type="button"
                className={`td-filter-btn ${registrationFilter === filterOption ? 'active' : ''}`}
                onClick={() => setRegistrationFilter(filterOption)}
              >
                {filterOption === 'ALL' ? 'Todos' : filterOption}
              </button>
            ))}
          </div>

          {registrations.length === 0 ? (
            <p className="dashboard-empty">No hay inscripciones registradas.</p>
          ) : filteredRegistrations.length === 0 ? (
            <p className="dashboard-empty">
              No hay participantes con estado {registrationFilter === 'ALL' ? 'seleccionado' : registrationFilter}.
            </p>
          ) : (
            <div className="dashboard-table-wrap">
              <table className="dashboard-table td-participants-table">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Correo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((registration, index) => {
                    const normalizedStatus = normalizeRegistrationStatus(registration.status);
                    const isPendingStatus = normalizedStatus === 'por confirmar';
                    const isUpdating = updatingRegistrationIds.includes(registration.player_id);

                    return (
                    <tr
                      key={`${registrationFilter}-${registration.id}`}
                      className="td-row-stagger"
                      style={{ animationDelay: `${index * 55}ms` }}
                    >
                      <td className="td-col-player">
                        <span className="player-name-cell">
                          <PlayerAvatar
                            username={registration.username}
                            avatarUrl={playerAvatars[registration.player_id]}
                            size="xs"
                          />
                          <Link to={`/profile/${registration.player_id}`} className="player-profile-link">
                            {registration.username}
                          </Link>
                        </span>
                      </td>
                      <td>{registration.email}</td>
                      <td>
                        <span className={`badge ${
                          registration.status === 'Confirmado' ? 'badge-active' :
                          registration.status === 'Por confirmar' ? 'badge-pending' :
                          'badge-finished'
                        }`}>
                          {registration.status}
                        </span>
                      </td>
                      <td className="td-actions-cell">
                        {isPendingStatus ? (
                          <div className="td-action-group">
                            <button
                              className="btn btn-secondary td-btn-sm"
                              disabled={isUpdating}
                              onClick={() => handleRegistrationStatusChange(registration.player_id, 'Confirmado')}
                            >
                              {isUpdating ? 'Guardando...' : 'Confirmar'}
                            </button>
                            <button
                              className="btn btn-danger td-btn-sm"
                              disabled={isUpdating}
                              onClick={() => handleRegistrationStatusChange(registration.player_id, 'Rechazado')}
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="td-action-note">Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── My history ── */}
      {activeTab === 'history' && currentUserId !== null && tournament.status !== 'Pendiente' && (
        <motion.div
          className="dashboard-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <div className="dashboard-panel-head">
            <div>
              <h2>Mi historial en este torneo</h2>
              <p>Tus enfrentamientos registrados.</p>
            </div>
            <button onClick={loadMyHistory} className="dashboard-panel-link">Ver historial</button>
          </div>
          {history !== null && (
            history.length === 0 ? (
              <p className="dashboard-empty">
                Todavía no tienes enfrentamientos registrados en este torneo.
              </p>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Ronda</th>
                      <th>Jugador 1</th>
                      <th>Jugador 2</th>
                      <th>Estado</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((m) => (
                      <tr key={m.id}>
                        <td>Ronda {m.round}</td>
                        <td>
                          <span className="player-name-cell">
                            <PlayerAvatar
                              username={m.player1_id ? (playerNames[m.player1_id] || undefined) : undefined}
                              avatarUrl={m.player1_id ? playerAvatars[m.player1_id] : null}
                              size="xs"
                            />
                            {m.player1_id ? (
                              <Link to={`/profile/${m.player1_id}`} className="player-profile-link">
                                {playerNames[m.player1_id] || `Jugador #${m.player1_id}`}
                              </Link>
                            ) : (
                              <code>BYE</code>
                            )}
                          </span>
                        </td>
                        <td>
                          <span className="player-name-cell">
                            <PlayerAvatar
                              username={m.player2_id ? (playerNames[m.player2_id] || undefined) : undefined}
                              avatarUrl={m.player2_id ? playerAvatars[m.player2_id] : null}
                              size="xs"
                            />
                            {m.player2_id ? (
                              <Link to={`/profile/${m.player2_id}`} className="player-profile-link">
                                {playerNames[m.player2_id] || `Jugador #${m.player2_id}`}
                              </Link>
                            ) : (
                              <code>Ninguno</code>
                            )}
                          </span>
                        </td>
                        <td>{m.status}</td>
                        <td>
                          {m.winner_id ? (
                            <span style={{ color: m.winner_id === currentUserId ? 'var(--success)' : 'var(--text-muted)', fontWeight: 700 }}>
                              {m.winner_id === currentUserId ? '✓ Victoria' : `Ganó ${playerNames[m.winner_id] || `Jugador #${m.winner_id}`}`}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </motion.div>
      )}

      {/* ── Final ranking ── */}
      {activeTab === 'ranking' && tournament.status === 'Finalizado' && ranking.length > 0 && (
        <motion.div
          className="dashboard-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="dashboard-panel-head">
            <h2>Clasificación final</h2>
          </div>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Jugador</th>
                  <th>Victorias</th>
                  <th>ELO Global</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => {
                  const medal = r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : r.position === 3 ? '🥉' : `#${r.position}`;
                  return (
                    <tr key={r.player_id}>
                      <td style={{ fontWeight: r.position <= 3 ? 800 : 400 }}>{medal}</td>
                      <td>
                        <span className="player-name-cell">
                          <PlayerAvatar
                            username={playerNames[r.player_id] || undefined}
                            avatarUrl={playerAvatars[r.player_id]}
                            size="xs"
                          />
                          <Link to={`/profile/${r.player_id}`} className="player-profile-link">
                            {playerNames[r.player_id] || `Jugador #${r.player_id}`}
                          </Link>
                        </span>
                      </td>
                      <td>{r.wins}</td>
                      <td>{r.global_elo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── Pending result confirmation modal ── */}
      <AnimatePresence>
        {pendingResult && (
          <motion.div
            className="dashboard-create-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              className="dashboard-create-modal td-result-modal"
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="dashboard-create-modal-head">
                <div>
                  <h2>Registrar ganador del encuentro</h2>
                  <p className="td-result-subhead">Partido #{pendingResult.matchId} · Selecciona el ganador para avanzar el bracket</p>
                </div>
                <button onClick={() => setPendingResult(null)} className="dashboard-create-close">✕</button>
              </div>

              {pendingMatch ? (
                <>
                  <div className="td-result-cards">
                    {[pendingMatch.player1_id, pendingMatch.player2_id].map((playerId) => {
                      if (playerId == null) return null;
                      const selected = pendingResult.winnerId === playerId;
                      return (
                        <button
                          key={playerId}
                          type="button"
                          className={`td-result-card ${selected ? 'is-selected' : ''}`}
                          onClick={() => selectModalWinner(playerId)}
                        >
                          <div className="td-result-card-head">
                            <PlayerAvatar
                              username={getPlayerDisplayName(playerId)}
                              avatarUrl={playerAvatars[playerId]}
                              size="sm"
                            />
                            <div>
                              <p className="td-result-name">{getPlayerDisplayName(playerId)}</p>
                              <p className="td-result-elo">ELO actual: {getPlayerEloLabel(playerId)}</p>
                            </div>
                          </div>
                          <div className="td-result-card-foot">
                            {selected ? 'Ganador seleccionado' : 'Seleccionar ganador'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {usesScoreMode && (
                    <div className="td-result-score-grid">
                      <label className="td-result-score-field">
                        <span>{getPlayerDisplayName(pendingMatch.player1_id)}</span>
                        <input
                          type="number"
                          min={0}
                          value={pendingScore1}
                          onChange={(event) => setPendingScore1(event.target.value)}
                        />
                      </label>
                      <label className="td-result-score-field">
                        <span>{getPlayerDisplayName(pendingMatch.player2_id)}</span>
                        <input
                          type="number"
                          min={0}
                          value={pendingScore2}
                          onChange={(event) => setPendingScore2(event.target.value)}
                        />
                      </label>
                    </div>
                  )}

                  <div className="td-result-note">
                    {usesScoreMode
                      ? 'Modo actual: Con puntuación. Debes registrar la puntuación de ambos jugadores.'
                      : 'Modo actual: WIN/LOSE. Se registra el ganador del match y actualiza el ELO.'}
                  </div>

                  <div className="dashboard-inline-actions td-result-actions">
                    <button onClick={() => setPendingResult(null)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button
                      onClick={confirmPendingResult}
                      className="btn td-btn-success td-result-confirm"
                      disabled={!canSubmitScore}
                    >
                      Confirmar resultado
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    ¿Confirmas este resultado? Esta acción actualiza el ELO y avanza el cuadro.
                  </p>
                  <div className="dashboard-inline-actions">
                    <button onClick={() => setPendingResult(null)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button onClick={confirmPendingResult} className="btn td-btn-success">
                      Confirmar resultado
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};