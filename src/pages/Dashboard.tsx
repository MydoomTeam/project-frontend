import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAvailableTournaments, createTournament } from '../services/tournaments';
import { Tournament } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';

export const Dashboard: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [name, setName] = useState('');
  const [eliminationType, setEliminationType] = useState('Eliminación Sencilla');
  const [rounds, setRounds] = useState(3);
  const [msg, setMsg] = useState('');

  const loadTournaments = async () => {
    try {
      const data = await getAvailableTournaments();
      setTournaments(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createTournament(name, eliminationType, rounds);
      setMsg('¡Torneo creado con éxito!');
      setName('');
      loadTournaments();
    } catch (err: any) {
      setMsg('Error al crear torneo: ' + getBackendErrorMessage(err, 'Verifique límites'));
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Pendiente':
        return 'badge-pending';
      case 'Listo para iniciar':
        return 'badge-ready';
      case 'En curso':
        return 'badge-active';
      default:
        return 'badge-finished';
    }
  };

return (
  <>
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div style={{ flex: '1', minWidth: '300px' }}>
        <h2>Crear Nuevo Torneo</h2>
        <div className="card">
          {msg && <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>{msg}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Nombre del Torneo</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Formato de Eliminación</label>
              <select
                className="form-control"
                value={eliminationType}
                onChange={(e) => setEliminationType(e.target.value)}
              >
                <option value="Eliminación Sencilla">Eliminación Sencilla</option>
                <option value="Eliminación Doble">Eliminación Doble</option>
                <option value="Round Robin">Round Robin</option>
                <option value="Swiss">Swiss</option>
              </select>
            </div>
            <div className="form-group">
              <label>Rondas</label>
              <input
                type="number"
                className="form-control"
                value={rounds}
                onChange={(e) => setRounds(parseInt(e.target.value, 10))}
                required
              />
            </div>
            <button type="submit" className="btn">Crear Torneo</button>
          </form>
        </div>
      </div>

      <div style={{ flex: '2', minWidth: '400px' }}>
        <h2>Torneos Disponibles (Inscripción Abierta)</h2>
        <div className="grid">
          {tournaments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No hay torneos pendientes en este momento.</p>
          ) : (
            tournaments.map((t) => (
              <div key={t.id} className="card">
                <h3>{t.name}</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  Formato: <strong>{t.elimination_type}</strong>
                </p>
                <p style={{ color: 'var(--text-muted)' }}>Rondas configuradas: {t.rounds}</p>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}
                >
                  <span className={`badge ${getStatusBadgeClass(t.status)}`}>{t.status}</span>
                  <Link to={`/tournaments/${t.id}`} className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
                    Ver Detalles
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </>
);
};