import React from 'react';
import { PlayerTournamentHistoryItem } from '../../../types/models';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../../../utils/tournamentStatus';

interface Props {
  tournamentHistory: PlayerTournamentHistoryItem[];
}

export const ProfileTournamentHistoryPanel: React.FC<Props> = ({ tournamentHistory }) => (
  <section className="dashboard-panel pr-panel">
    <div className="dashboard-panel-head dashboard-panel-head-tight">
      <div>
        <h2>Historial completo de torneos</h2>
        <p>Registro consolidado como administrador y jugador.</p>
      </div>
    </div>

    {tournamentHistory.length === 0 ? (
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
            {tournamentHistory.map((item) => (
              <tr key={item.id}>
                <td data-label="Torneo">{item.name}</td>
                <td data-label="Formato">{item.elimination_type}</td>
                <td data-label="Estado">
                  <span className={`badge ${getTournamentStatusBadgeClass(item.status)}`}>
                    {toBusinessTournamentStatus(item.status)}
                  </span>
                </td>
                <td data-label="Rol">
                  <span className={`tn-role-chip ${item.is_creator ? 'is-admin' : 'is-player'}`}>
                    {item.is_creator ? 'Admin' : 'Jugador'}
                  </span>
                </td>
                <td data-label="Inscripción">{item.registration_status ?? 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);
