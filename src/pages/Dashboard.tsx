import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { FiActivity, FiAlertTriangle, FiAward, FiClock, FiPlus } from 'react-icons/fi';
import { getAvailableTournaments, createTournament } from '../services/tournaments';
import { getAlerts } from '../services/alerts';
import { getPlayerTournamentHistory } from '../services/players';
import { AlertItem, PlayerTournamentHistoryItem, Tournament } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';
import { CreateTournamentFormInput, CreateTournamentFormValues, createTournamentSchema } from '../validation/schemas';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../utils/tournamentStatus';
import { usePeriodicAsync } from '../hooks/usePeriodicAsync';
import { useStoredUserProfile } from '../hooks/useStoredUserProfile';

const DASHBOARD_REFRESH_MS = 4000;
const ALERTS_REFRESH_MS = 15000;

const useAnimatedCounter = (targetValue: number, durationMs = 900): number => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startTime = performance.now();

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const nextValue = Math.round(targetValue * progress);
      setAnimatedValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [targetValue, durationMs]);

  return animatedValue;
};

export const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [createError, setCreateError] = useState('');
  const [createdTournament, setCreatedTournament] = useState<Tournament | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const storedUser = useStoredUserProfile();
  const storedUserId = storedUser?.id ?? null;

  const [tournaments, , refreshTournaments] = usePeriodicAsync(
    getAvailableTournaments,
    DASHBOARD_REFRESH_MS,
    [],
    [] as Tournament[],
  );

  const [alerts, , refreshAlerts] = usePeriodicAsync(
    async () => {
      const data = await getAlerts();
      return data.items ?? [];
    },
    ALERTS_REFRESH_MS,
    [],
    [] as AlertItem[],
  );

  const [history, , refreshHistory] = usePeriodicAsync(
    async () => {
      if (storedUserId === null) return [];
      return getPlayerTournamentHistory(storedUserId);
    },
    ALERTS_REFRESH_MS,
    [storedUserId],
    [] as PlayerTournamentHistoryItem[],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTournamentFormInput, undefined, CreateTournamentFormValues>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: { name: '', elimination_type: 'Eliminación Sencilla', rounds: 3 },
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldOpenCreateModal = searchParams.get('create') === '1';
    if (shouldOpenCreateModal) {
      setCreateModalOpen(true);
    }
  }, [location.search]);

  const onCreate = async (values: CreateTournamentFormValues) => {
    setCreateError('');

    try {
      const tournament = await createTournament(values.name, values.elimination_type, values.rounds);
      setCreatedTournament(tournament);
      reset();
      refreshTournaments();
    } catch (err: any) {
      setCreateError(getBackendErrorMessage(err, 'No se pudo crear el torneo. Verifique los datos.'));
    }
  };

  const handleCreateAnother = () => {
    setCreatedTournament(null);
    setCreateError('');
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateError('');

    if (location.search.includes('create=1')) {
      navigate('/dashboard', { replace: true });
    }
  };

  const formatDate = (value: string): string => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
  };

  const newAlertsCount = alerts.filter((item) => item.status === 'nueva').length;
  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === 'nueva' ? -1 : 1;
        }
        return right.id - left.id;
      }),
    [alerts],
  );

  const toAlertStatusLabel = (status: AlertItem['status']): string => {
    return status === 'nueva' ? 'No leida' : 'Leida';
  };

  const getStatusBadgeClass = (status: PlayerTournamentHistoryItem['status']): string => {
    const baseClass = getTournamentStatusBadgeClass(status);
    return status === 'Finalizado' ? `${baseClass} badge-finished-animated` : baseClass;
  };

  const activeTournamentsCount = history.filter((item) => item.status === 'Listo para iniciar' || item.status === 'En curso').length;
  const liveTournamentsCount = history.filter((item) => item.status === 'En curso').length;
  const finishedTournamentsCount = history.filter((item) => item.status === 'Finalizado').length;
  const recentHistory = [...history].sort((a, b) => b.id - a.id).slice(0, 5);

  const animatedTotalTournaments = useAnimatedCounter(history.length);
  const animatedLiveTournaments = useAnimatedCounter(liveTournamentsCount);
  const animatedActiveTournaments = useAnimatedCounter(activeTournamentsCount);
  const animatedNewAlerts = useAnimatedCounter(newAlertsCount);

  return (
    <div className="dashboard-page">
      <motion.header
        className="dashboard-header"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div>
          <h1>Historial de Torneos</h1>
        </div>
      </motion.header>

      <section className="dashboard-kpi-grid">
        <motion.article className="dashboard-kpi-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
          <div className="dashboard-kpi-icon"><FiAward aria-hidden="true" /></div>
          <p className="dashboard-kpi-label">Total torneos</p>
          <p className="dashboard-kpi-value">{animatedTotalTournaments}</p>
        </motion.article>

        <motion.article className="dashboard-kpi-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <div className="dashboard-kpi-icon"><FiClock aria-hidden="true" /></div>
          <p className="dashboard-kpi-label">En curso</p>
          <p className="dashboard-kpi-value">{animatedLiveTournaments}</p>
        </motion.article>

        <motion.article className="dashboard-kpi-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="dashboard-kpi-icon"><FiActivity aria-hidden="true" /></div>
          <p className="dashboard-kpi-label">Activos</p>
          <p className="dashboard-kpi-value">{animatedActiveTournaments}</p>
        </motion.article>

        <motion.article className="dashboard-kpi-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <div className="dashboard-kpi-icon"><FiAlertTriangle aria-hidden="true" /></div>
          <p className="dashboard-kpi-label">Alertas nuevas</p>
          <p className="dashboard-kpi-value">{animatedNewAlerts}</p>
        </motion.article>
      </section>

      <motion.section
        className="dashboard-panel dashboard-panel-alerts"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <div className="dashboard-panel-head">
          <div>
            <h2>Alertas recientes</h2>
            <p>{newAlertsCount} no leidas</p>
          </div>
          <Link to="/alerts" className="dashboard-panel-link">Abrir panel de alertas</Link>
        </div>

        <div className="dashboard-alert-list">
          {alerts.length === 0 ? (
            <p className="dashboard-empty">No hay alertas activas por ahora.</p>
          ) : (
            sortedAlerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className={`dashboard-alert-row ${alert.status === 'nueva' ? 'is-new' : 'is-acknowledged'}`}>
                <div className="dashboard-alert-main">
                  <p className="dashboard-alert-title">{alert.message}</p>
                  <small>
                    {formatDate(alert.created_at)}
                  </small>
                </div>
                <span className={`dashboard-alert-status ${alert.status === 'nueva' ? 'is-new' : 'is-acknowledged'}`}>
                  {toAlertStatusLabel(alert.status)}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.section>

      <section className="dashboard-grid-2col">
        <motion.div
          className="dashboard-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="dashboard-panel-head dashboard-panel-head-tight">
            <div>
              <h2>Mis torneos</h2>
              <p>Actividad reciente como administrador o jugador.</p>
            </div>
          </div>
          {recentHistory.length === 0 ? (
            <p className="dashboard-empty">No tienes actividad de torneos todavía.</p>
          ) : (
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Formato</th>
                    <th>Estado</th>
                    <th>Rol</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {recentHistory.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Nombre">{item.name}</td>
                      <td data-label="Formato">{item.elimination_type}</td>
                      <td data-label="Estado">
                        <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                          {toBusinessTournamentStatus(item.status)}
                        </span>
                      </td>
                      <td data-label="Rol">{item.is_creator ? 'Administrador' : 'Jugador'}</td>
                      <td data-label="Acción">
                        <Link to={`/tournaments/${item.id}`} className="dashboard-inline-link">Gestionar</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.section
          id="tournaments-panel"
          className="dashboard-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
        >
          <h2>Torneos disponibles</h2>
          {tournaments.length === 0 ? (
            <p className="dashboard-empty">No hay torneos pendientes en este momento.</p>
          ) : (
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Formato</th>
                    <th>Rondas</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map((t) => (
                    <tr key={t.id}>
                      <td data-label="Nombre">{t.name}</td>
                      <td data-label="Formato">{t.elimination_type}</td>
                      <td data-label="Rondas">{t.rounds}</td>
                      <td data-label="Estado">
                        <span className={`badge ${getStatusBadgeClass(t.status)}`}>
                          {toBusinessTournamentStatus(t.status)}
                        </span>
                      </td>
                      <td data-label="Detalle">
                        <Link to={`/tournaments/${t.id}`} className="dashboard-inline-link">Ver torneo</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      </section>

      <section className="dashboard-panel dashboard-panel-soft">
        <h2>Resumen histórico</h2>
        <div className="dashboard-summary-row">
          <div><strong>{finishedTournamentsCount}</strong> finalizados</div>
          <div><strong>{history.filter((item) => item.is_creator).length}</strong> como administrador</div>
          <div><strong>{history.filter((item) => !item.is_creator).length}</strong> como jugador</div>
        </div>
      </section>

      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            className="dashboard-create-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className="dashboard-create-modal"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <div className="dashboard-create-modal-head">
                <h2>Crear nuevo torneo</h2>
                <button type="button" className="dashboard-create-close" onClick={closeCreateModal}>Cerrar</button>
              </div>

              {createdTournament ? (
                <div className="dashboard-success-box">
                  <h3>¡Torneo creado con éxito!</h3>
                  <p>
                    <strong>{createdTournament.name}</strong> - {createdTournament.elimination_type} · {createdTournament.rounds} rondas
                  </p>
                  <p>
                    Estado:{' '}
                    <span className={`badge ${getStatusBadgeClass(createdTournament.status)}`}>
                      {toBusinessTournamentStatus(createdTournament.status)}
                    </span>
                  </p>
                  <p className="dashboard-next-title">Próximos pasos:</p>
                  <ul>
                    <li>Confirmar participantes</li>
                    <li>Generar bracket por ELO</li>
                    <li>Iniciar el torneo</li>
                  </ul>
                  <div className="dashboard-inline-actions">
                    <Link to={`/tournaments/${createdTournament.id}`} className="btn">Ir al torneo</Link>
                    <button type="button" onClick={handleCreateAnother} className="btn btn-secondary">Crear otro</button>
                    <button type="button" onClick={closeCreateModal} className="btn btn-secondary">Cerrar</button>
                  </div>
                </div>
              ) : (
                <div className="dashboard-create-form-wrap">
                  {createError && <div className="dashboard-error-banner">{createError}</div>}
                  <form onSubmit={handleSubmit(onCreate)} noValidate>
                    <div className="form-group">
                      <label>Nombre del torneo</label>
                      <input type="text" className="form-control" {...register('name')} />
                      {errors.name && <small className="dashboard-field-error">{errors.name.message}</small>}
                    </div>
                    <div className="form-group">
                      <label>Formato de eliminación</label>
                      <select className="form-control" {...register('elimination_type')}>
                        <option value="Eliminación Sencilla">Eliminación Sencilla</option>
                        <option value="Eliminación Doble">Eliminación Doble</option>
                        <option value="Round Robin">Round Robin</option>
                        <option value="Swiss">Swiss</option>
                      </select>
                      {errors.elimination_type && <small className="dashboard-field-error">{errors.elimination_type.message}</small>}
                    </div>
                    <div className="form-group">
                      <label>Rondas</label>
                      <input type="number" min={1} className="form-control" {...register('rounds', { valueAsNumber: true })} />
                      {errors.rounds && <small className="dashboard-field-error">{errors.rounds.message}</small>}
                    </div>
                    <div className="dashboard-inline-actions">
                      <button type="submit" className="btn" disabled={isSubmitting}>
                        <FiPlus aria-hidden="true" />
                        {isSubmitting ? 'Creando...' : 'Crear torneo'}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>Cancelar</button>
                    </div>
                  </form>
                </div>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};