import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { getBackendErrorMessage } from '../services/errorHandler';
import { getPlayerById, getPlayerEloHistory, getPlayerTournamentHistory, updateAdminPassword } from '../services/players';
import { EloHistoryItem, Player, PlayerTournamentHistoryItem } from '../types/models';
import { passwordUpdateSchema, PasswordUpdateFormValues } from '../validation/schemas';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { toBusinessTournamentStatus } from '../utils/tournamentStatus';

const formatDate = (dateValue?: string): string => {
  if (!dateValue) return 'Sin registro';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('es-CO');
};

export const Profile: React.FC = () => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [history, setHistory] = useState<PlayerTournamentHistoryItem[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      password: '',
      password_confirm: '',
    },
  });

  const loadPlayer = async () => {
    if (storedUserId === null) {
      setLoadError('No se encontró la sesión del usuario. Inicia sesión de nuevo.');
      return;
    }

    try {
      const data = await getPlayerById(storedUserId);
      setPlayer(data);
      setLoadError('');
    } catch (error: unknown) {
      setLoadError(getBackendErrorMessage(error, 'No se pudo cargar el perfil del usuario.'));
    }
  };

  useEffect(() => {
    loadPlayer();
  }, []);

  const loadTournamentHistory = async () => {
    if (storedUserId === null) return;

    try {
      const data = await getPlayerTournamentHistory(storedUserId);
      setHistory(data);
    } catch (error: unknown) {
      setLoadError(getBackendErrorMessage(error, 'No se pudo cargar el historial de torneos.'));
    }
  };

  const loadEloHistory = async () => {
    if (storedUserId === null) return;
    try {
      const data = await getPlayerEloHistory(storedUserId);
      setEloHistory(data);
    } catch {
      // silently ignore — new endpoint, may not have data yet
    }
  };

  useEffect(() => {
    loadTournamentHistory();
    loadEloHistory();
  }, []);

  const onSubmitPassword = async (values: PasswordUpdateFormValues) => {
    setSuccessMessage('');
    try {
      await updateAdminPassword(values);
      setSuccessMessage('Contraseña actualizada correctamente.');
      reset();
    } catch (error: unknown) {
      setSuccessMessage('');
      setLoadError(getBackendErrorMessage(error, 'No se pudo actualizar la contraseña.'));
    }
  };

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h2>Mi Perfil</h2>
      {loadError && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{loadError}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Datos de cuenta</h3>
        {player ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <PlayerAvatar username={player.username} size="lg" />
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{player.username}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{player.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
            <p><strong>ID:</strong> {player.id}</p>
            <p><strong>Usuario:</strong> {player.username}</p>
            <p><strong>Email:</strong> {player.email}</p>
            <p><strong>Rol:</strong> {player.role}</p>
            <p><strong>ELO Global:</strong> {player.global_elo}</p>
            <p><strong>Último acceso:</strong> {formatDate(player.last_access_date)}</p>
          </div>
          </>
        ) : (
          <LoadingSpinner message="Cargando perfil..." />
        )}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Actualizar contraseña</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.
        </p>
        {successMessage && <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>{successMessage}</div>}
        <form onSubmit={handleSubmit(onSubmitPassword)} noValidate>
          <div className="form-group">
            <label>Nueva contraseña</label>
            <input type="password" className="form-control" {...register('password')} />
            {errors.password && <small style={{ color: 'var(--danger)' }}>{errors.password.message}</small>}
          </div>

          <div className="form-group">
            <label>Confirmar contraseña</label>
            <input type="password" className="form-control" {...register('password_confirm')} />
            {errors.password_confirm && (
              <small style={{ color: 'var(--danger)' }}>{errors.password_confirm.message}</small>
            )}
          </div>

          <button type="submit" className="btn" disabled={isSubmitting}>
            {isSubmitting ? 'Actualizando…' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Historial de torneos</h3>
        {history.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No tienes participaciones registradas todavía.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem' }}>Torneo</th>
                  <th style={{ padding: '0.6rem' }}>Formato</th>
                  <th style={{ padding: '0.6rem' }}>Estado</th>
                  <th style={{ padding: '0.6rem' }}>Rol</th>
                  <th style={{ padding: '0.6rem' }}>Inscripción</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.6rem' }}>{item.name}</td>
                    <td style={{ padding: '0.6rem' }}>{item.elimination_type}</td>
                      <td style={{ padding: '0.6rem' }}>{toBusinessTournamentStatus(item.status)}</td>
                    <td style={{ padding: '0.6rem' }}>{item.is_creator ? 'Administrador' : 'Jugador'}</td>
                    <td style={{ padding: '0.6rem' }}>{item.registration_status ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Historial ELO</h3>
        {eloHistory.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Sin registros de cambio de ELO todavía.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem' }}>Fecha</th>
                  <th style={{ padding: '0.6rem' }}>Match</th>
                  <th style={{ padding: '0.6rem' }}>ELO anterior</th>
                  <th style={{ padding: '0.6rem' }}>ELO nuevo</th>
                  <th style={{ padding: '0.6rem' }}>Cambio</th>
                </tr>
              </thead>
              <tbody>
                {eloHistory.map((entry) => {
                  const delta = entry.current_elo - entry.previous_elo;
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.6rem' }}>{formatDate(entry.change_date)}</td>
                      <td style={{ padding: '0.6rem' }}>#{entry.match_id}</td>
                      <td style={{ padding: '0.6rem' }}>{entry.previous_elo}</td>
                      <td style={{ padding: '0.6rem' }}>{entry.current_elo}</td>
                      <td style={{ padding: '0.6rem', color: delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
