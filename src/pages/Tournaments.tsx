import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiChevronDown, FiChevronUp, FiLayers, FiPlusCircle } from 'react-icons/fi';
import { getAllTournaments, registerInTournament } from '../services/tournaments';
import { getPlayerTournamentHistory } from '../services/players';
import { Tournament, PlayerTournamentHistoryItem, TournamentStatus } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../utils/tournamentStatus';
import { PlayerAvatar } from '../components/PlayerAvatar';

type StatusFilter = 'Todos' | 'Pendiente' | 'Listo para iniciar' | 'Finalizado';

const TOURNAMENTS_REFRESH_MS = 8000;

const toDisplayDate = (value?: string | null): string => {
  if (!value) return 'Sin definir';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
};

export const Tournaments: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [all, setAll] = useState<Tournament[]>([]);
  const [history, setHistory] = useState<PlayerTournamentHistoryItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q')?.trim() ?? '');
  const [registeringId, setRegisteringId] = useState<number | null>(null);
  const [registerError, setRegisterError] = useState('');
  const [expandedTournamentId, setExpandedTournamentId] = useState<number | null>(null);

  const storedUserId = useMemo(() => {
    const raw = localStorage.getItem('user_profile');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { id?: number };
      return typeof parsed.id === 'number' ? parsed.id : null;
    } catch {
      return null;
    }
  }, []);

  const myTournamentIds = useMemo(
    () => new Set(history.map((item) => item.id)),
    [history],
  );

  const loadAll = async () => {
    try {
      const data = await getAllTournaments();
      setAll(data);
    } catch {
      // silently skip if backend is down
    }
  };

  const loadHistory = async () => {
    if (storedUserId === null) return;
    try {
      const data = await getPlayerTournamentHistory(storedUserId);
      setHistory(data);
    } catch {
      // silently skip
    }
  };

  useEffect(() => {
    loadAll();
    loadHistory();
    const interval = window.setInterval(() => {
      loadAll();
      loadHistory();
    }, TOURNAMENTS_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [storedUserId]);

  useEffect(() => {
    const nextQuery = searchParams.get('q')?.trim() ?? '';
    setSearchQuery((prev) => (prev === nextQuery ? prev : nextQuery));
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const normalized = value.trim();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (normalized) {
        next.set('q', normalized);
      } else {
        next.delete('q');
      }
      return next;
    }, { replace: true });
  };

  const filtered = useMemo(() => {
    let result = all;
    if (statusFilter !== 'Todos') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((t) => {
        const byName = t.name.toLowerCase().includes(q);
        const byCreator = (t.creator_name ?? '').toLowerCase().includes(q);
        return byName || byCreator;
      });
    }
    return result;
  }, [all, statusFilter, searchQuery]);

  const statusCounts = useMemo<Record<StatusFilter, number>>(() => ({
    'Todos': all.length,
    'Pendiente': all.filter((item) => item.status === 'Pendiente').length,
    'Listo para iniciar': all.filter((item) => item.status === 'Listo para iniciar').length,
    'Finalizado': all.filter((item) => item.status === 'Finalizado').length,
  }), [all]);

  const myAdminCount = useMemo(
    () => history.filter((item) => item.is_creator).length,
    [history],
  );

  const myPlayerCount = useMemo(
    () => history.filter((item) => !item.is_creator).length,
    [history],
  );

  const handleRegister = async (tournamentId: number) => {
    setRegisterError('');
    setRegisteringId(tournamentId);
    try {
      await registerInTournament(tournamentId);
      await loadHistory();
    } catch (err: unknown) {
      setRegisterError(getBackendErrorMessage(err, 'No se pudo inscribir en el torneo.'));
    } finally {
      setRegisteringId(null);
    }
  };

  const STATUS_FILTERS: StatusFilter[] = ['Todos', 'Pendiente', 'Listo para iniciar', 'Finalizado'];
  const STATUS_LABELS: Record<StatusFilter, string> = {
    'Todos': 'Todos',
    'Pendiente': 'Pendiente',
    'Listo para iniciar': 'Activo',
    'Finalizado': 'Finalizado',
  };

  const toParticipationLabel = (item?: PlayerTournamentHistoryItem): string => {
    if (!item) return 'No inscrito';
    if (item.is_creator) return 'Administrador';
    if (item.registration_status === 'Confirmado') return 'Inscripción confirmada';
    if (item.registration_status === 'Por confirmar') return 'Inscripción pendiente';
    if (item.registration_status === 'Rechazado') return 'Inscripción rechazada';
    if (item.registration_status === 'Cancelada') return 'Inscripción cancelada';
    return 'Jugador inscrito';
  };

  const toRegistrationCaption = (item?: PlayerTournamentHistoryItem): string | null => {
    if (!item || item.is_creator) return null;
    if (item.registration_status === 'Confirmado') return 'Inscripción confirmada';
    if (item.registration_status === 'Por confirmar') return 'Inscripción pendiente';
    if (item.registration_status === 'Rechazado') return 'Inscripción rechazada';
    if (item.registration_status === 'Cancelada') return 'Inscripción cancelada';
    return 'Inscripción registrada';
  };

  const getCreatorPresentation = (t: Tournament) => {
    const creatorName = (t.creator_name && t.creator_name.trim()) || `Administrador #${t.creator_id}`;
    const avatarUrl = t.creator_avatar_url;

    return (
      <span className="tn-creator-cell">
        <PlayerAvatar username={creatorName} avatarUrl={avatarUrl} size="xs" className="tn-creator-avatar" />
        <span>{creatorName}</span>
      </span>
    );
  };

  const getDetailRows = (t: Tournament, myItem?: PlayerTournamentHistoryItem) => {
    const rows = [
      { label: 'Creador', value: getCreatorPresentation(t) },
      {
        label: 'Mi participación',
        value: toParticipationLabel(myItem),
      },
      { label: 'Juego', value: t.game_name ?? null },
      { label: 'Categoría', value: t.game_category ?? null },
      { label: 'Cupo objetivo', value: t.participant_target ?? null },
      { label: 'Duración por ronda', value: t.round_duration_minutes ? `${t.round_duration_minutes} min` : null },
      { label: 'Fecha inicio', value: t.start_date ? toDisplayDate(t.start_date) : null },
      { label: 'Fecha fin', value: t.end_date ? toDisplayDate(t.end_date) : null },
      { label: 'Idioma', value: t.language ?? null },
      { label: 'Región', value: t.region ?? null },
    ];

    return rows.filter((row) => row.value !== null && row.value !== undefined && String(row.value).trim() !== '');
  };

  return (
    <div className="tn-page">

      {/* ── Header ── */}
      <motion.div
        className="dashboard-header tn-header"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <div>
          <h1>Torneos</h1>
        </div>
      </motion.div>

      {/* ── Action hub ── */}
      <motion.div
        className="dashboard-panel tn-action-panel"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
      >
        <div className="tn-action-head">
          <div>
            <h2>Centro de torneos</h2>
            <p>Crea torneos desde un flujo guiado y cambia el foco de esta vista con un clic.</p>
          </div>
          <span className="tn-action-pill">{all.length} en plataforma</span>
        </div>
        <div className="tn-action-buttons">
          <Link to="/tournaments/new" className="tn-cta tn-cta-primary">
            <FiPlusCircle aria-hidden="true" />
            Crear torneo guiado
          </Link>
          <Link
            to="/tournaments/live"
            className="tn-cta tn-cta-secondary"
          >
            <FiLayers aria-hidden="true" />
            Ver torneos en curso
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
      </motion.div>

      {/* ── Visual status tabs ── */}
      <motion.div
        className="tn-status-tabs"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        {STATUS_FILTERS.map((statusOption) => (
          <button
            key={statusOption}
            type="button"
            className={`tn-status-tab ${statusFilter === statusOption ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusOption)}
          >
            <span>{STATUS_LABELS[statusOption]}</span>
            <small>{statusCounts[statusOption]}</small>
          </button>
        ))}
      </motion.div>

      {/* ── Unified tournament table ── */}
      <motion.div
        className="tn-explorer-layout"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="dashboard-panel">
          <div className="dashboard-panel-head dashboard-panel-head-tight">
            <div>
              <p>
                {filtered.length} {filtered.length === 1 ? 'torneo encontrado' : 'torneos encontrados'}
                {myAdminCount > 0 && (
                  <> · <span style={{ color: 'var(--accent)' }}>{myAdminCount} propios</span></>
                )}
                {myPlayerCount > 0 && (
                  <> · <span style={{ color: '#8ec2ff' }}>{myPlayerCount} inscritos</span></>
                )}
              </p>
            </div>
            <input
              type="search"
              className="tn-search tn-search-inline"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Buscar torneos"
            />
          </div>

          {registerError && (
            <div className="dashboard-error-banner" style={{ marginBottom: '0.75rem' }}>{registerError}</div>
          )}

          {filtered.length === 0 ? (
            <p className="dashboard-empty">
              {all.length === 0 ? 'No hay torneos registrados todavía.' : 'No hay torneos que coincidan con los filtros.'}
            </p>
          ) : (
            <div className="dashboard-table-wrap tn-table-wrap">
              <table className="dashboard-table tn-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Rondas</th>
                    <th>Estado</th>
                    <th>Mi rol</th>
                    <th className="tn-col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const myItem = history.find((h) => h.id === t.id);
                    const registrationCaption = toRegistrationCaption(myItem);
                    const detailRows = getDetailRows(t, myItem);
                    const isAlreadyInvolved = myTournamentIds.has(t.id);
                    const canRegister = t.status === 'Pendiente' && !isAlreadyInvolved;
                    const isExpanded = expandedTournamentId === t.id;
                    return (
                      <React.Fragment key={t.id}>
                        <tr className={isExpanded ? 'tn-row-expanded' : ''}>
                          <td>
                            <span style={{ display: 'block' }}>{t.name}</span>
                            {registrationCaption && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                                {registrationCaption}
                              </span>
                            )}
                          </td>
                          <td>{t.elimination_type}</td>
                          <td>{t.rounds}</td>
                          <td>
                            <span className={`badge ${getTournamentStatusBadgeClass(t.status)}`}>
                              {t.status === 'En curso' && <span className="badge-live-dot" aria-hidden="true" />}
                              {toBusinessTournamentStatus(t.status)}
                            </span>
                          </td>
                          <td>
                            {myItem ? (
                              <span className={`tn-role-chip ${myItem.is_creator ? 'is-admin' : 'is-player'}`}>
                                {myItem.is_creator ? 'Admin' : 'Jugador'}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                            )}
                          </td>
                          <td className="tn-col-actions">
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <Link to={`/tournaments/${t.id}`} className="dashboard-inline-link">
                                {myItem ? 'Gestionar' : 'Ver detalle'}
                              </Link>
                              {canRegister && (
                                <button
                                  className="tn-register-btn"
                                  disabled={registeringId === t.id}
                                  onClick={() => handleRegister(t.id)}
                                >
                                  {registeringId === t.id ? 'Inscribiendo...' : 'Inscribirse'}
                                </button>
                              )}
                              <button
                                type="button"
                                className="tn-expand-btn"
                                onClick={() => setExpandedTournamentId(isExpanded ? null : t.id)}
                              >
                                {isExpanded ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
                                {isExpanded ? 'Ocultar' : 'Expandir'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="tn-detail-row">
                            <td colSpan={6}>
                              <div className="tn-detail-grid">
                                {detailRows.map((row) => (
                                  <div key={`${t.id}-${row.label}`} className="tn-detail-item">
                                    <span>{row.label}</span>
                                    <strong>{row.value}</strong>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="dashboard-panel tn-side-summary">
          <h3>Resumen</h3>
          <p className="tn-side-muted">Vista actual</p>
          <div className="tn-side-list">
            <div><span>En vista</span><strong>{filtered.length}</strong></div>
            <div><span>Mis torneos</span><strong>{history.length}</strong></div>
            <div><span>Como admin</span><strong>{myAdminCount}</strong></div>
            <div><span>Como jugador</span><strong>{myPlayerCount}</strong></div>
          </div>
        </aside>
      </motion.div>

    </div>
  );
};
