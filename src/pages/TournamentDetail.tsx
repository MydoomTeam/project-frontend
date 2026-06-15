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
  updateTournament,
} from '../services/tournaments';
import { getPlayerById } from '../services/players';
import { Tournament, Match, RankingItem, TournamentRegistration } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';
import { BracketViewer } from '../components/BracketViewer';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../utils/tournamentStatus';

const IN_PROGRESS_REFRESH_MS = 4000;

const toDisplayValue = (value?: string | number | null): string => {
  if (value === null || value === undefined || value === '') return 'Sin definir';
  return String(value);
};

const toDisplayDate = (value?: string | null): string => {
  if (!value) return 'Sin definir';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
};

interface PendingResult {
  matchId: number;
  winnerId: number;
}

type RegistrationFilter = 'ALL' | 'Por confirmar' | 'Confirmado' | 'Rechazado' | 'Cancelada';
type DetailTab = 'bracket' | 'history' | 'ranking' | 'technical';

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
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);
  const [history, setHistory] = useState<Match[] | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>('ALL');
  const [activeTab, setActiveTab] = useState<DetailTab>('bracket');
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});

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
      } else {
        setRegistrations([]);
      }

      if (collectedPlayerIds.size > 0) {
        const resolvedEntries = await Promise.all(
          Array.from(collectedPlayerIds).map(async (playerId) => {
            try {
              const player = await getPlayerById(playerId);
              return [playerId, player.username] as const;
            } catch {
              return [playerId, `Jugador #${playerId}`] as const;
            }
          }),
        );
        setPlayerNames(Object.fromEntries(resolvedEntries));
      }
    } catch (err: any) {
      setError(getBackendErrorMessage(err, 'Error al cargar datos del torneo.'));
    }
  };

  useEffect(() => {
    const userRaw = localStorage.getItem('user_profile');
    if (userRaw) {
      setCurrentUserId(JSON.parse(userRaw).id);
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
      updateStoredTournamentRegistrations(tournamentId, true);
      loadAllData();
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'Error al inscribirse'));
    }
  };

  const handleUnregister = async () => {
    if (!isRegistered) return;

    try {
      await unregisterFromTournament(tournamentId);
      setIsRegistered(false);
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

  const [showDeadlinesModal, setShowDeadlinesModal] = useState(false);
  const [deadlineStart, setDeadlineStart] = useState<string | null>(null);
  const [deadlineEnd, setDeadlineEnd] = useState<string | null>(null);
  const [isSavingDeadlines, setIsSavingDeadlines] = useState(false);

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

  const openDeadlinesModal = () => {
    setDeadlineStart(tournament.start_date ?? null);
    setDeadlineEnd(tournament.end_date ?? null);
    setShowDeadlinesModal(true);
  };

  const saveDeadlines = async () => {
    setError('');
    if (deadlineStart && deadlineEnd) {
      const s = new Date(deadlineStart);
      const e = new Date(deadlineEnd);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
        alert('Fechas inválidas');
        return;
      }
      if (e < s) {
        alert('La fecha de fin no puede ser anterior a la fecha de inicio');
        return;
      }
    }

    setIsSavingDeadlines(true);
    try {
      const payload: any = {};
      if (deadlineStart !== null) payload.start_date = deadlineStart;
      if (deadlineEnd !== null) payload.end_date = deadlineEnd;
      await updateTournament(tournamentId, payload);
      setShowDeadlinesModal(false);
      loadAllData();
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'Error al guardar deadlines'));
    } finally {
      setIsSavingDeadlines(false);
    }
  };

  const handleReportWinner = (matchId: number, winnerId: number) => {
    setPendingResult({ matchId, winnerId });
  };

  const confirmPendingResult = async () => {
    if (!pendingResult) return;

    try {
      await registerMatchResult(tournamentId, pendingResult.matchId, pendingResult.winnerId);
      setPendingResult(null);
      loadAllData();
    } catch (err: any) {
      setPendingResult(null);
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
        const resolvedEntries = await Promise.all(
          Array.from(idsFromHistory).map(async (playerId) => {
            if (playerNames[playerId]) {
              return [playerId, playerNames[playerId]] as const;
            }
            try {
              const player = await getPlayerById(playerId);
              return [playerId, player.username] as const;
            } catch {
              return [playerId, `Jugador #${playerId}`] as const;
            }
          }),
        );
        setPlayerNames((prev) => ({ ...prev, ...Object.fromEntries(resolvedEntries) }));
      }
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'No se pudo cargar el historial'));
    }
  };

  const handleRegistrationStatusChange = async (playerId: number, status: 'Confirmado' | 'Rechazado') => {
    try {
      await updateRegistrationStatus(tournamentId, playerId, status);
      await loadAllData();
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'No se pudo actualizar el estado de inscripción'));
    }
  };

  if (!tournament) {
    return <LoadingSpinner message="Cargando torneo..." />;
  }

  const isCreator = currentUserId === tournament.creator_id;
  const isPlayerInTournament = !isCreator && isRegistered;
  const canShowHistoryTab = tournament.status !== 'Pendiente';
  const canShowRankingTab = tournament.status === 'Finalizado';

  const technicalRows = [
    { label: 'Creador', value: playerNames[tournament.creator_id] || tournament.creator_name || `Administrador #${tournament.creator_id}` },
    { label: 'Mi rol', value: isCreator ? 'Administrador del torneo' : (isPlayerInTournament ? 'Jugador inscrito' : 'No inscrito') },
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
            {isPlayerInTournament && <span className="td-player-chip">Sigues en torneo</span>}
          </p>
        </div>

        <div className="td-actions">
          {tournament.status === 'Pendiente' && !isCreator && (
            <>
              <button
                onClick={handleRegister}
                className={`btn td-btn-primary ${isRegistered ? 'td-btn-registered' : ''}`}
                disabled={isRegistered}
              >
                {isRegistered ? '✓ Sigues inscrito' : 'Inscribirse'}
              </button>
              {isRegistered && (
                <button onClick={handleUnregister} className="btn btn-secondary td-btn-sm">
                  Salirme del torneo
                </button>
              )}
            </>
          )}
          {tournament.status !== 'Pendiente' && isPlayerInTournament && !isCreator && (
            <button className="btn td-btn-primary td-btn-registered" disabled>
              ✓ Participando actualmente
            </button>
          )}
          {isCreator && (
            <>
              {tournament.status === 'Pendiente' && (
                <>
                  <button onClick={handleGenerateBracket} className="btn td-btn-primary">
                    Generar cuadro
                  </button>
                  <button onClick={openDeadlinesModal} className="btn btn-secondary td-btn-sm">
                    Configurar deadlines
                  </button>
                </>
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
            isCreator={isCreator}
            participantCount={tournament.total_participants ?? 0}
            onSelectWinner={handleReportWinner}
          />
        </motion.div>
      )}

      {/* ── Participants (admin + Pendiente) ── */}
      {activeTab === 'technical' && isCreator && tournament.status === 'Pendiente' && (
        <motion.div
          className="dashboard-panel"
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
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Correo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((registration) => (
                    <tr key={registration.id}>
                      <td>
                        <span className="player-name-cell">
                          <PlayerAvatar username={registration.username} size="xs" />
                          {registration.username}
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
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secondary td-btn-sm"
                            disabled={registration.status === 'Confirmado' || registration.status === 'Cancelada'}
                            onClick={() => handleRegistrationStatusChange(registration.player_id, 'Confirmado')}
                          >
                            Confirmar
                          </button>
                          <button
                            className="btn btn-danger td-btn-sm"
                            disabled={registration.status === 'Rechazado' || registration.status === 'Cancelada'}
                            onClick={() => handleRegistrationStatusChange(registration.player_id, 'Rechazado')}
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                            <PlayerAvatar username={m.player1_id ? (playerNames[m.player1_id] || undefined) : undefined} size="xs" />
                            <code>{m.player1_id ? (playerNames[m.player1_id] || `Jugador #${m.player1_id}`) : 'BYE'}</code>
                          </span>
                        </td>
                        <td>
                          <span className="player-name-cell">
                            <PlayerAvatar username={m.player2_id ? (playerNames[m.player2_id] || undefined) : undefined} size="xs" />
                            <code>{m.player2_id ? (playerNames[m.player2_id] || `Jugador #${m.player2_id}`) : 'Ninguno'}</code>
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
                          <PlayerAvatar username={playerNames[r.player_id] || undefined} size="xs" />
                          {playerNames[r.player_id] || `Jugador #${r.player_id}`}
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
              className="dashboard-create-modal"
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="dashboard-create-modal-head">
                <h2>Confirmar resultado</h2>
                <button onClick={() => setPendingResult(null)} className="dashboard-create-close">✕</button>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                ¿Confirmas que el{' '}
                <strong style={{ color: '#f0f7ff' }}>Jugador #{pendingResult.winnerId}</strong>{' '}
                es el ganador del match{' '}
                <strong style={{ color: '#f0f7ff' }}>#{pendingResult.matchId}</strong>?
                Esta acción actualiza el ELO y avanza el cuadro.
              </p>
              <div className="dashboard-inline-actions">
                <button onClick={confirmPendingResult} className="btn td-btn-success">
                  Confirmar ganador
                </button>
                <button onClick={() => setPendingResult(null)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDeadlinesModal && (
          <motion.div
            className="dashboard-create-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              className="dashboard-create-modal"
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="dashboard-create-modal-head">
                <h2>Configurar deadlines</h2>
                <button onClick={() => setShowDeadlinesModal(false)} className="dashboard-create-close">✕</button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>Fecha de inicio</label>
                <input type="date" value={deadlineStart ?? ''} onChange={(e) => setDeadlineStart(e.target.value || null)} />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>Fecha de fin</label>
                <input type="date" value={deadlineEnd ?? ''} onChange={(e) => setDeadlineEnd(e.target.value || null)} />
              </div>

              <div className="dashboard-inline-actions">
                <button onClick={saveDeadlines} className="btn td-btn-success" disabled={isSavingDeadlines}>
                  {isSavingDeadlines ? 'Guardando…' : 'Guardar'}
                </button>
                <button onClick={() => setShowDeadlinesModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};