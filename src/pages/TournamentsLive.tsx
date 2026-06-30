import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiPlayCircle } from 'react-icons/fi';
import { getAllTournaments, registerInTournament } from '../services/tournaments';
import { getPlayerTournamentHistory } from '../services/players';
import { PlayerTournamentHistoryItem, Tournament } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../utils/tournamentStatus';

const TOURNAMENTS_REFRESH_MS = 8000;

export const TournamentsLive: React.FC = () => {
  const [all, setAll] = useState<Tournament[]>([]);
  const [history, setHistory] = useState<PlayerTournamentHistoryItem[]>([]);
  const [registeringId, setRegisteringId] = useState<number | null>(null);
  const [registerError, setRegisterError] = useState('');

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
      // silently skip
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

  const liveTournaments = useMemo(
    () => all.filter((t) => t.status === 'En curso'),
    [all],
  );

  const availableForMe = useMemo(
    () => all.filter((t) => {
      const isAdmin = storedUserId !== null && t.creator_id === storedUserId;
      const alreadyInvolved = myTournamentIds.has(t.id);
      const visibleStatus = t.status === 'Pendiente' || t.status === 'Listo para iniciar' || t.status === 'En curso';
      return visibleStatus && !isAdmin && !alreadyInvolved;
    }),
    [all, myTournamentIds, storedUserId],
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

  return (
    <div className="tn-page">
      <motion.div className="dashboard-header tn-header" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Torneos en curso y disponibles</h1>
          <p className="tn-live-subtitle">Vista enfocada en torneos activos y oportunidades de inscripción.</p>
        </div>
      </motion.div>

      <div className="tn-action-buttons">
        <Link to="/tournaments" className="tn-cta tn-cta-secondary">
          <FiArrowLeft aria-hidden="true" />
          Volver a todos los torneos
        </Link>
      </div>

      {registerError && (
        <div className="dashboard-error-banner" style={{ marginBottom: '0.75rem' }}>{registerError}</div>
      )}

      <motion.div className="tn-live-layout" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <section className="dashboard-panel tn-live-panel">
          <div className="dashboard-panel-head dashboard-panel-head-tight">
            <p>Torneos en curso · {liveTournaments.length}</p>
          </div>

          {liveTournaments.length === 0 ? (
            <p className="dashboard-empty">No hay torneos en curso en este momento.</p>
          ) : (
            <div className="dashboard-table-wrap tn-table-wrap">
              <table className="dashboard-table tn-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Rondas</th>
                    <th>Estado</th>
                    <th className="tn-col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {liveTournaments.map((t) => (
                    <tr key={t.id}>
                      <td data-label="Nombre">{t.name}</td>
                      <td data-label="Tipo">{t.elimination_type}</td>
                      <td data-label="Rondas">{t.rounds}</td>
                      <td data-label="Estado">
                        <span className={`badge ${getTournamentStatusBadgeClass(t.status)}`}>
                          <span className="badge-live-dot" aria-hidden="true" />
                          {toBusinessTournamentStatus(t.status)}
                        </span>
                      </td>
                      <td className="tn-col-actions" data-label="Acciones">
                        <Link to={`/tournaments/${t.id}`} className="dashboard-inline-link">Ver detalle</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dashboard-panel tn-live-panel">
          <div className="dashboard-panel-head dashboard-panel-head-tight">
            <p>Disponibles para inscribirme · {availableForMe.length}</p>
          </div>

          {availableForMe.length === 0 ? (
            <p className="dashboard-empty">No hay torneos disponibles para inscripción por ahora.</p>
          ) : (
            <div className="dashboard-table-wrap tn-table-wrap">
              <table className="dashboard-table tn-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Rondas</th>
                    <th>Estado</th>
                    <th className="tn-col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {availableForMe.map((t) => {
                    const canRegister = t.status === 'Pendiente';
                    return (
                      <tr key={t.id}>
                        <td data-label="Nombre">{t.name}</td>
                        <td data-label="Tipo">{t.elimination_type}</td>
                        <td data-label="Rondas">{t.rounds}</td>
                        <td data-label="Estado">
                          <span className={`badge ${getTournamentStatusBadgeClass(t.status)}`}>
                            {t.status === 'En curso' && <span className="badge-live-dot" aria-hidden="true" />}
                            {toBusinessTournamentStatus(t.status)}
                          </span>
                        </td>
                        <td className="tn-col-actions" data-label="Acciones">
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Link to={`/tournaments/${t.id}`} className="dashboard-inline-link">Ver detalle</Link>
                            {canRegister ? (
                              <button
                                className="tn-register-btn"
                                disabled={registeringId === t.id}
                                onClick={() => handleRegister(t.id)}
                              >
                                {registeringId === t.id ? 'Inscribiendo...' : 'Inscribirse'}
                              </button>
                            ) : (
                              <span className="tn-role-chip is-player">
                                <FiPlayCircle aria-hidden="true" style={{ marginRight: 4 }} />
                                No disponible
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
};
