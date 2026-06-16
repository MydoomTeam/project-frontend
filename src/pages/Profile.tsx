import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCamera, FiClock, FiShield, FiTarget, FiTrendingUp, FiUserCheck } from 'react-icons/fi';

import { getBackendErrorMessage } from '../services/errorHandler';
import {
  getPlayerById,
  getPlayerEloHistory,
  getPlayerTournamentHistory,
  updateAdminPassword,
  uploadMyAvatarFile,
  updateMyAvatarUrl,
} from '../services/players';
import { EloHistoryItem, Player, PlayerTournamentHistoryItem } from '../types/models';
import { passwordUpdateSchema, PasswordUpdateFormValues } from '../validation/schemas';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../utils/tournamentStatus';

const formatDate = (dateValue?: string): string => {
  if (!dateValue) return 'Sin registro';

  // Prevent timezone shifting for YYYY-MM-DD values coming from backend Date fields.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    return `${d}/${m}/${y}`;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('es-CO');
};

const toRoleLabel = (role?: string): string => {
  if (!role) return 'Usuario';
  const upper = role.toUpperCase();
  if (upper.includes('ADMIN')) return 'Administrador';
  return 'Jugador';
};

const getEloDeltaColor = (delta: number): string => (delta >= 0 ? 'var(--success)' : 'var(--danger)');

const buildEloPoints = (entries: EloHistoryItem[]): string => {
  if (entries.length === 0) return '';
  const width = 640;
  const height = 220;
  const xStep = entries.length === 1 ? 0 : width / (entries.length - 1);
  const values = entries.map((entry) => entry.current_elo);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);

  return entries
    .map((entry, index) => {
      const x = entries.length === 1 ? width / 2 : xStep * index;
      const normalized = (entry.current_elo - min) / spread;
      const y = height - normalized * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(' ');
};

export const Profile: React.FC = () => {
  const { playerId } = useParams<{ playerId?: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [history, setHistory] = useState<PlayerTournamentHistoryItem[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarMessage, setAvatarMessage] = useState('');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const storedUserId = useMemo(() => {
    const rawUser = localStorage.getItem('user_profile');
    if (!rawUser) return null;
    try {
      const parsedUser = JSON.parse(rawUser) as { id?: number };
      return typeof parsedUser.id === 'number' ? parsedUser.id : null;
    } catch {
      return null;
    }
  }, []);

  const targetPlayerId = useMemo(() => {
    if (!playerId) return storedUserId;
    const parsed = Number(playerId);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }, [playerId, storedUserId]);

  const isOwnProfile = targetPlayerId !== null && storedUserId !== null && targetPlayerId === storedUserId;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirm: '',
    },
  });

  const loadPlayer = async () => {
    if (targetPlayerId === null) {
      setLoadError('No se encontró la sesión del usuario. Inicia sesión de nuevo.');
      return;
    }

    try {
      const data = await getPlayerById(targetPlayerId);
      setPlayer(data);
      setLoadError('');
    } catch (error: unknown) {
      setLoadError(getBackendErrorMessage(error, 'No se pudo cargar el perfil del usuario.'));
    }
  };

  useEffect(() => {
    loadPlayer();
  }, [targetPlayerId]);

  const loadTournamentHistory = async () => {
    if (targetPlayerId === null) return;

    try {
      const data = await getPlayerTournamentHistory(targetPlayerId);
      setHistory(data);
    } catch (error: unknown) {
      setLoadError(getBackendErrorMessage(error, 'No se pudo cargar el historial de torneos.'));
    }
  };

  const loadEloHistory = async () => {
    if (targetPlayerId === null) return;
    try {
      const data = await getPlayerEloHistory(targetPlayerId);
      setEloHistory(data);
    } catch {
      // silently ignore — new endpoint, may not have data yet
    }
  };

  useEffect(() => {
    loadTournamentHistory();
    loadEloHistory();
  }, [targetPlayerId]);

  const onSubmitPassword = async (values: PasswordUpdateFormValues) => {
    if (!isOwnProfile) return;
    setSuccessMessage('');
    setLoadError('');
    try {
      await updateAdminPassword(values);
      setSuccessMessage('Contraseña actualizada correctamente.');
      reset();
    } catch (error: unknown) {
      setSuccessMessage('');
      setLoadError(getBackendErrorMessage(error, 'No se pudo actualizar la contraseña.'));
    }
  };

  const syncStoredUserAvatar = (avatarUrl: string | null | undefined) => {
    if (!isOwnProfile) return;
    const rawUser = localStorage.getItem('user_profile');
    if (!rawUser) return;
    try {
      const parsed = JSON.parse(rawUser) as Record<string, unknown>;
      localStorage.setItem('user_profile', JSON.stringify({ ...parsed, avatar_url: avatarUrl ?? null }));
    } catch {
      // keep going even if local cache cannot be parsed
    }
  };

  const onUploadAvatarFile = async () => {
    if (!isOwnProfile) return;
    if (!avatarFile) return;

    setAvatarMessage('');
    setLoadError('');
    setIsSavingAvatar(true);
    try {
      const updated = await uploadMyAvatarFile(avatarFile);
      setPlayer(updated);
      syncStoredUserAvatar(updated.avatar_url);
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      setAvatarMessage('Foto subida y actualizada correctamente.');
    } catch (error: unknown) {
      setLoadError(getBackendErrorMessage(error, 'No se pudo subir la foto de perfil.'));
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const onRemoveAvatar = async () => {
    if (!isOwnProfile) return;
    setAvatarMessage('');
    setLoadError('');
    setIsSavingAvatar(true);
    try {
      const updated = await updateMyAvatarUrl(null);
      setPlayer(updated);
      syncStoredUserAvatar(updated.avatar_url);
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      setAvatarMessage('Foto eliminada. Se muestra avatar por iniciales.');
    } catch (error: unknown) {
      setLoadError(getBackendErrorMessage(error, 'No se pudo eliminar la foto de perfil.'));
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleOpenAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const createdCount = history.filter((item) => item.is_creator).length;
  const participantCount = history.filter((item) => !item.is_creator).length;
  const activeCount = history.filter((item) => item.status === 'Listo para iniciar' || item.status === 'En curso').length;
  const eloEntriesCount = eloHistory.length;
  const recentHistory = [...history].sort((a, b) => b.id - a.id).slice(0, 6);

  const eloSorted = useMemo(
    () => [...eloHistory].sort((a, b) => {
      const left = new Date(a.change_date).getTime();
      const right = new Date(b.change_date).getTime();
      if (left !== right) return left - right;
      return a.id - b.id;
    }),
    [eloHistory],
  );

  const eloPolyline = useMemo(() => buildEloPoints(eloSorted), [eloSorted]);
  const eloMin = eloSorted.length > 0 ? Math.min(...eloSorted.map((item) => item.current_elo)) : null;
  const eloMax = eloSorted.length > 0 ? Math.max(...eloSorted.map((item) => item.current_elo)) : null;
  const latestEloDelta = eloSorted.length > 0
    ? eloSorted[eloSorted.length - 1].current_elo - eloSorted[eloSorted.length - 1].previous_elo
    : 0;
  const eloCurrentValue = player?.global_elo ?? 0;

  return (
    <div className="pr-page">
      {loadError && <div className="dashboard-error-banner">{loadError}</div>}

      <motion.section
        className="dashboard-panel pr-hero"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {player ? (
          <div className="pr-hero-grid">
            <div className="pr-hero-avatar-wrap">
              <PlayerAvatar
                username={player.username}
                avatarUrl={player.avatar_url}
                size="lg"
                className="pr-hero-avatar"
              />
              <span className="pr-avatar-overlay" aria-hidden="true">
                <FiCamera />
              </span>
            </div>
            <div className="pr-hero-main">
              <div className="pr-name-row">
                <h1>{player.username}</h1>
                <span className="pr-role-chip">{toRoleLabel(player.role)}</span>
              </div>
              <p className="pr-subline">{player.email}</p>
              <div className="pr-meta-row">
                <span><FiClock aria-hidden="true" /> Último acceso: {formatDate(player.last_access_date)}</span>
                <span><FiTrendingUp aria-hidden="true" /> ELO global: {player.global_elo}</span>
              </div>
              <div className="pr-avatar-row">
                {isOwnProfile ? (
                  <>
                    <input
                      ref={avatarInputRef}
                      id="avatar-file-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="pr-file-input"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setAvatarFile(file);
                      }}
                    />
                    <button type="button" className="tn-cta tn-cta-secondary pr-file-label" onClick={handleOpenAvatarPicker}>
                      <FiCamera aria-hidden="true" />
                      Cambiar foto
                    </button>
                    <button
                      type="button"
                      className="tn-cta tn-cta-primary pr-avatar-btn"
                      onClick={onUploadAvatarFile}
                      disabled={!avatarFile || isSavingAvatar}
                    >
                      {isSavingAvatar ? 'Subiendo...' : 'Subir foto'}
                    </button>
                    <button
                      type="button"
                      className="tn-cta tn-cta-secondary pr-avatar-btn"
                      onClick={onRemoveAvatar}
                      disabled={!player?.avatar_url || isSavingAvatar}
                    >
                      Quitar foto
                    </button>
                  </>
                ) : (
                  <span className="pr-side-soft">Perfil público</span>
                )}
              </div>
              {isOwnProfile && avatarFile && <p className="pr-avatar-file-name">Archivo listo: {avatarFile.name}</p>}
              {isOwnProfile && avatarMessage && <p className="pr-avatar-message">{avatarMessage}</p>}
            </div>
          </div>
        ) : (
          <LoadingSpinner message="Cargando perfil..." />
        )}
      </motion.section>

      <section className="pr-kpi-grid">
        <article className="pr-kpi-card">
          <div className="pr-kpi-icon"><FiTarget aria-hidden="true" /></div>
          <p className="pr-kpi-label">Torneos creados</p>
          <p className="pr-kpi-value">{createdCount}</p>
          <p className="pr-kpi-subtext">Como administrador</p>
        </article>
        <article className="pr-kpi-card">
          <div className="pr-kpi-icon"><FiUserCheck aria-hidden="true" /></div>
          <p className="pr-kpi-label">Participaciones</p>
          <p className="pr-kpi-value">{participantCount}</p>
          <p className="pr-kpi-subtext">Como jugador</p>
        </article>
        <article className="pr-kpi-card">
          <div className="pr-kpi-icon"><FiTrendingUp aria-hidden="true" /></div>
          <p className="pr-kpi-label">ELO actual</p>
          <p className={`pr-kpi-value ${eloCurrentValue < 0 ? 'is-negative' : ''}`}>{eloCurrentValue}</p>
          <p className="pr-kpi-subtext">Rendimiento global</p>
        </article>
        <article className="pr-kpi-card">
          <div className="pr-kpi-icon"><FiShield aria-hidden="true" /></div>
          <p className="pr-kpi-label">Cambios ELO</p>
          <p className="pr-kpi-value">{eloEntriesCount}</p>
          <p className="pr-kpi-subtext">Historial acumulado</p>
        </article>
      </section>

      <section className="pr-main-grid">
        <div className="pr-main-left">
          {isOwnProfile && (
            <div className="dashboard-panel pr-panel">
              <div className="dashboard-panel-head dashboard-panel-head-tight">
                <div>
                  <h2>Seguridad y credenciales</h2>
                  <p>Actualiza tu contraseña de acceso administrativo.</p>
                </div>
              </div>
              {successMessage && <div className="pr-success">{successMessage}</div>}
              <form onSubmit={handleSubmit(onSubmitPassword)} noValidate className="pr-security-form">
                <div className="pr-form-grid">
                  <div className="form-group">
                    <label>Contraseña actual</label>
                    <input type="password" className="form-control" {...register('current_password')} />
                    {errors.current_password && <small className="pr-input-error">{errors.current_password.message}</small>}
                  </div>

                  <div className="form-group">
                    <label>Nueva contraseña</label>
                    <input type="password" className="form-control" {...register('password')} />
                    {errors.password && <small className="pr-input-error">{errors.password.message}</small>}
                  </div>

                  <div className="form-group">
                    <label>Confirmar nueva contraseña</label>
                    <input type="password" className="form-control" {...register('password_confirm')} />
                    {errors.password_confirm && (
                      <small className="pr-input-error">{errors.password_confirm.message}</small>
                    )}
                  </div>
                </div>

                <div className="pr-security-footer">
                  <span className="pr-shield-pill">
                    <FiShield aria-hidden="true" /> Reglas activas del backend
                  </span>
                  <button type="submit" className="tn-cta tn-cta-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Actualizando...' : 'Actualizar credenciales'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="dashboard-panel pr-panel">
            <div className="dashboard-panel-head dashboard-panel-head-tight">
              <div>
                <h2>Historial ELO</h2>
                <p>{eloEntriesCount === 0 ? 'Evolución de ranking a lo largo de tus partidas.' : `${eloEntriesCount} cambios registrados`}</p>
              </div>
            </div>

            {eloSorted.length === 0 ? (
              <div className="pr-empty-state">
                <FiTrendingUp aria-hidden="true" className="pr-empty-icon" />
                <p className="pr-empty-title">Sin cambios de ELO todavía.</p>
                <p className="pr-empty-text">Participa en torneos para empezar a construir tu historial competitivo.</p>
              </div>
            ) : (
              <>
                <div className="pr-elo-summary-row">
                  <span>Min: <strong>{eloMin}</strong></span>
                  <span>Max: <strong>{eloMax}</strong></span>
                  <span>
                    Último cambio:
                    <strong style={{ color: getEloDeltaColor(latestEloDelta) }}>
                      {latestEloDelta >= 0 ? ' +' : ' '}{latestEloDelta}
                    </strong>
                  </span>
                </div>

                <div className="pr-elo-chart-wrap">
                  <svg viewBox="0 0 640 220" className="pr-elo-chart" role="img" aria-label="Gráfica de evolución de ELO">
                    <defs>
                      <linearGradient id="prEloStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4cc9f0" />
                        <stop offset="100%" stopColor="#1fd8e5" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="640" height="220" rx="10" fill="rgba(5, 17, 34, 0.72)" />
                    <path d="M0 190 H640" stroke="rgba(130, 160, 192, 0.24)" />
                    <path d="M0 120 H640" stroke="rgba(130, 160, 192, 0.15)" />
                    <path d="M0 50 H640" stroke="rgba(130, 160, 192, 0.24)" />
                    <polyline
                      fill="none"
                      stroke="url(#prEloStroke)"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={eloPolyline}
                    />
                  </svg>
                </div>

                <div className="dashboard-table-wrap pr-table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Match</th>
                        <th>ELO anterior</th>
                        <th>ELO nuevo</th>
                        <th>Cambio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...eloSorted].reverse().slice(0, 8).map((entry) => {
                        const delta = entry.current_elo - entry.previous_elo;
                        return (
                          <tr key={entry.id}>
                            <td>{formatDate(entry.change_date)}</td>
                            <td>#{entry.match_id}</td>
                            <td>{entry.previous_elo}</td>
                            <td>{entry.current_elo}</td>
                            <td style={{ color: getEloDeltaColor(delta) }}>
                              {delta >= 0 ? '+' : ''}{delta}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="pr-main-right">
          <div className="dashboard-panel pr-panel">
            <div className="dashboard-panel-head dashboard-panel-head-tight">
              <div>
                <h2>{isOwnProfile ? 'Política de contraseña' : 'Perfil del jugador'}</h2>
                <p>{isOwnProfile ? 'Validaciones reales aplicadas en backend.' : 'Información pública del participante en ArenaSync.'}</p>
              </div>
            </div>

            {isOwnProfile ? (
              <ul className="pr-policy-list">
                <li><span className="pr-policy-dot" /> Mínimo 8 caracteres</li>
                <li><span className="pr-policy-dot" /> Al menos una mayúscula</li>
                <li><span className="pr-policy-dot" /> Al menos una minúscula</li>
                <li><span className="pr-policy-dot" /> Al menos un número</li>
              </ul>
            ) : (
              <ul className="pr-policy-list">
                <li><span className="pr-policy-dot" /> Usuario: {player?.username ?? '—'}</li>
                <li><span className="pr-policy-dot" /> Rol: {toRoleLabel(player?.role)}</li>
                <li><span className="pr-policy-dot" /> ELO: {player?.global_elo ?? 0}</li>
                <li><span className="pr-policy-dot" /> Último acceso: {formatDate(player?.last_access_date)}</li>
              </ul>
            )}

            {isOwnProfile && (
              <div className="pr-side-soft">
                Tus datos de perfil y preferencias se usan únicamente para tu experiencia dentro de ArenaSync.
              </div>
            )}
            <div className="pr-side-soft">
              {isOwnProfile
                ? 'Puedes actualizar tu foto, contraseña y acceder a tu actividad sin salir de esta vista.'
                : 'Esta vista es solo de consulta: no permite editar datos del otro usuario.'}
            </div>
          </div>

          <div className="dashboard-panel pr-panel">
            <div className="dashboard-panel-head dashboard-panel-head-tight">
              <div>
                <h2>Actividad en torneos</h2>
                <p>{activeCount} torneos activos o en curso.</p>
              </div>
            </div>

            {recentHistory.length === 0 ? (
              <p className="dashboard-empty">No tienes participaciones registradas todavía.</p>
            ) : (
              <div className="pr-history-list">
                {recentHistory.map((item) => (
                  <article key={item.id} className="pr-history-item">
                    <div>
                      <p className="pr-history-name">{item.name}</p>
                      <p className="pr-history-meta">
                        {item.elimination_type} · {toBusinessTournamentStatus(item.status)}
                      </p>
                    </div>
                    <span className={`tn-role-chip ${item.is_creator ? 'is-admin' : 'is-player'}`}>
                      {item.is_creator ? 'Admin' : 'Jugador'}
                    </span>
                  </article>
                ))}
              </div>
            )}

            <Link to="/tournaments" className="tn-cta tn-cta-secondary pr-history-link">
              <span className="pr-history-link-full">Ver todos los torneos</span>
              <span className="pr-history-link-compact">Ver torneos</span>
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </section>

      <section className="dashboard-panel pr-panel">
        <div className="dashboard-panel-head dashboard-panel-head-tight">
          <div>
            <h2>Historial completo de torneos</h2>
            <p>Registro consolidado como administrador y jugador.</p>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="dashboard-empty">No tienes participaciones registradas todavía.</p>
        ) : (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Torneo</th>
                  <th>Formato</th>
                  <th>Estado</th>
                  <th>Rol</th>
                  <th>Inscripción</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.elimination_type}</td>
                    <td>
                      <span className={`badge ${getTournamentStatusBadgeClass(item.status)}`}>
                        {toBusinessTournamentStatus(item.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`tn-role-chip ${item.is_creator ? 'is-admin' : 'is-player'}`}>
                        {item.is_creator ? 'Admin' : 'Jugador'}
                      </span>
                    </td>
                    <td>{item.registration_status ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
