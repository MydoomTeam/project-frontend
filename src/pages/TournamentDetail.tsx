import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '../services/tournaments';
import { Tournament, Match, RankingItem } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';

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

      if (tData.status !== 'Pendiente') {
        const bData = await getBracket(tournamentId);
        setMatches(bData.matches || []);
      }

      if (tData.status === 'Finalizado') {
        const rData = await getRanking(tournamentId);
        setRanking(rData.ranking || []);
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
      loadAllData();
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

  const handleReportWinner = async (matchId: number, winnerId: number) => {
    try {
      await registerMatchResult(tournamentId, matchId, winnerId);
      loadAllData();
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'Error al guardar resultado'));
    }
  };

  if (!tournament) {
    return <div>Cargando...</div>;
  }

  const isCreator = currentUserId === tournament.creator_id;

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <div className="card">
        <h1>🛡️ {tournament.name}</h1>
        <p>Modalidad: {tournament.elimination_type} | Rondas: {tournament.rounds}</p>
        <p>Estado actual: {tournament.status}</p>
        <p>Administrador ID: {tournament.creator_id} {isCreator && '(Tú eres el Administrador)'}</p>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {tournament.status === 'Pendiente' && !isCreator && (
          <>
            <button
              onClick={handleRegister}
              className="btn"
              disabled={isRegistered}
              style={isRegistered ? { backgroundColor: '#999', color: '#fff', cursor: 'not-allowed' } : undefined}
            >
              {isRegistered ? 'Inscrito' : 'Inscribirse en el Torneo'}
            </button>
            {isRegistered && (
              <button onClick={handleUnregister} className="btn btn-secondary">Darme de Baja</button>
            )}
          </>
        )}

        {isCreator && (
          <>
            {tournament.status === 'Pendiente' && (
              <button onClick={handleGenerateBracket} className="btn">Generar Cruces / Bracket</button>
            )}
            {tournament.status === 'Listo para iniciar' && (
              <button onClick={handleStart} className="btn" style={{ backgroundColor: 'var(--success)' }}>
                Iniciar Torneo Oficial
              </button>
            )}
            {(tournament.status === 'Pendiente' || tournament.status === 'Listo para iniciar') && (
              <button onClick={handleCancelTournament} className="btn btn-danger">Eliminar Torneo</button>
            )}
          </>
        )}
      </div>

      {matches.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h3>⚔️ Enfrentamientos y Enlaces del Bracket</h3>
          {matches.map((m) => (
            <div key={m.id} className="match-box">
              <p>
                <strong>Ronda {m.round} ({m.bracket_type.toUpperCase()})</strong> — Estado: {m.status}
              </p>
              <p>
                Jugador 1: <code>{m.player1_id ?? 'BYE (Avanza solo)'}</code> vs Jugador 2: <code>{m.player2_id ?? 'Ninguno'}</code>
              </p>
              {m.winner_id && <p style={{ color: 'var(--success)' }}>Ganador definitivo: Jugador {m.winner_id}</p>}
              {isCreator && m.status === 'Programado' && m.player1_id && m.player2_id && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', marginRight: '1rem', color: 'var(--text-muted)' }}>Reportar Ganador:</span>
                  <button onClick={() => handleReportWinner(m.id, m.player1_id!)} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', marginRight: '0.5rem' }}>
                    Jugador {m.player1_id}
                  </button>
                  <button onClick={() => handleReportWinner(m.id, m.player2_id!)} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem' }}>
                    Jugador {m.player2_id}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tournament.status === 'Finalizado' && ranking.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h3>🏆 Podio y Tabla de Clasificación Final</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.7rem' }}>Posición</th>
                <th style={{ padding: '0.7rem' }}>Jugador ID</th>
                <th style={{ padding: '0.7rem' }}>Victorias</th>
                <th style={{ padding: '0.7rem' }}>ELO Global</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.player_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.7rem' }}>🥇 {r.position}</td>
                  <td style={{ padding: '0.7rem' }}>Jugador #{r.player_id}</td>
                  <td style={{ padding: '0.7rem' }}>{r.wins}</td>
                  <td style={{ padding: '0.7rem' }}>{r.global_elo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};