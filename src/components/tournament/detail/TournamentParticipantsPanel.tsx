import React from 'react';
import { Link } from 'react-router-dom';
import { PlayerAvatar } from '../../ui/PlayerAvatar';
import { TournamentRegistration } from '../../../types/models';
import { RegistrationFilter } from '../../../hooks/useTournamentDetail';

interface Props {
  registrations: TournamentRegistration[];
  filteredRegistrations: TournamentRegistration[];
  registrationFilter: RegistrationFilter;
  registrationSummary: {
    total: number;
    pending: number;
    confirmed: number;
    rejected: number;
    cancelled: number;
  };
  updatingRegistrationIds: number[];
  playerAvatars: Record<number, string | null>;
  onFilterChange: (filter: RegistrationFilter) => void;
  onStatusChange: (playerId: number, status: 'Confirmado' | 'Rechazado') => void;
}

const registrationOptions: RegistrationFilter[] = ['ALL', 'Por confirmar', 'Confirmado', 'Rechazado', 'Cancelada'];

export const TournamentParticipantsPanel: React.FC<Props> = ({
  registrations,
  filteredRegistrations,
  registrationFilter,
  registrationSummary,
  updatingRegistrationIds,
  playerAvatars,
  onFilterChange,
  onStatusChange,
}) => (
  <>
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
      {registrationOptions.map((filterOption) => (
        <button
          key={filterOption}
          type="button"
          className={`td-filter-btn ${registrationFilter === filterOption ? 'active' : ''}`}
          onClick={() => onFilterChange(filterOption)}
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
              const normalizedStatus = registration.status.trim().toLowerCase();
              const isPendingStatus = normalizedStatus === 'por confirmar';
              const isUpdating = updatingRegistrationIds.includes(registration.player_id);

              return (
                <tr
                  key={`${registrationFilter}-${registration.id}`}
                  className="td-row-stagger"
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  <td className="td-col-player" data-label="Jugador">
                    <span className="player-name-cell">
                      <PlayerAvatar
                        username={registration.username}
                        avatarUrl={playerAvatars[registration.player_id] ?? null}
                        size="xs"
                      />
                      <Link to={`/profile/${registration.player_id}`} className="player-profile-link">
                        {registration.username}
                      </Link>
                    </span>
                  </td>
                  <td data-label="Correo">{registration.email}</td>
                  <td data-label="Estado">
                    <span className={`badge ${
                      registration.status === 'Confirmado' ? 'badge-active' :
                      registration.status === 'Por confirmar' ? 'badge-pending' :
                      'badge-finished'
                    }`}>
                      {registration.status}
                    </span>
                  </td>
                  <td className="td-actions-cell" data-label="Acciones">
                    {isPendingStatus ? (
                      <div className="td-action-group">
                        <button
                          className="btn btn-secondary td-btn-sm"
                          disabled={isUpdating}
                          onClick={() => onStatusChange(registration.player_id, 'Confirmado')}
                        >
                          {isUpdating ? 'Guardando...' : 'Confirmar'}
                        </button>
                        <button
                          className="btn btn-danger td-btn-sm"
                          disabled={isUpdating}
                          onClick={() => onStatusChange(registration.player_id, 'Rechazado')}
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="td-action-note">Sin acciones</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </>
);
