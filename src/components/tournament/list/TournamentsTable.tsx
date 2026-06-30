import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { Tournament, PlayerTournamentHistoryItem } from '../../../types/models';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../../../utils/tournamentStatus';
import { PlayerAvatar } from '../../ui/PlayerAvatar';
import { TournamentsDetail } from './TournamentsDetail';

interface Props {
  tournaments: Tournament[];
  history: PlayerTournamentHistoryItem[];
  myTournamentIds: Set<number>;
  registeringId: number | null;
  onRegister: (id: number) => void;
  expandedId: number | null;
  onToggleExpand: (id: number | null) => void;
}

export const TournamentsTable: React.FC<Props> = ({
  tournaments,
  history,
  myTournamentIds,
  registeringId,
  onRegister,
  expandedId,
  onToggleExpand,
}) => {
  const toParticipationLabel = (item?: PlayerTournamentHistoryItem): string => {
    if (!item) return 'No inscrito';
    if (item.is_creator) return 'Administrador';
    if (item.registration_status === 'Confirmado') return 'Inscripción confirmada';
    if (item.registration_status === 'Por confirmar') return 'Inscripción pendiente';
    if (item.registration_status === 'Rechazado') return 'Inscripción rechazada';
    if (item.registration_status === 'Cancelada') return 'Inscripción cancelada';
    return 'Jugador inscrito';
  };

  return (
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
          {tournaments.map((t) => {
            const myItem = history.find((h) => h.id === t.id);
            const registrationCaption = myItem && toParticipationLabel(myItem);
            const isAlreadyInvolved = myTournamentIds.has(t.id);
            const canRegister = t.status === 'Pendiente' && !isAlreadyInvolved;
            const isExpanded = expandedId === t.id;

            const detailRows = [
              { label: 'Creador', value: (t.creator_name && t.creator_name.trim()) || `Administrador #${t.creator_id}` },
              { label: 'Mi participación', value: myItem ? (myItem.is_creator ? 'Administrador' : 'Jugador') : 'No inscrito' },
              { label: 'Juego', value: t.game_name ?? '—' },
              { label: 'Categoría', value: t.game_category ?? '—' },
              { label: 'Cupo objetivo', value: t.participant_target ?? '—' },
              { label: 'Duración por ronda', value: t.round_duration_minutes ? `${t.round_duration_minutes} min` : '—' },
              { label: 'Fecha inicio', value: t.start_date ?? '—' },
              { label: 'Fecha fin', value: t.end_date ?? '—' },
              { label: 'Idioma', value: t.language ?? '—' },
              { label: 'Región', value: t.region ?? '—' },
            ];

            return (
              <React.Fragment key={t.id}>
                <tr className={isExpanded ? 'tn-row-expanded' : ''}>
                  <td data-label="Nombre">
                    <span style={{ display: 'block' }}>{t.name}</span>
                    {registrationCaption && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>{registrationCaption}</span>
                    )}
                  </td>
                  <td data-label="Tipo">{t.elimination_type}</td>
                  <td data-label="Rondas">{t.rounds}</td>
                  <td data-label="Estado">
                    <span className={`badge ${getTournamentStatusBadgeClass(t.status)}`}>
                      {t.status === 'En curso' && <span className="badge-live-dot" aria-hidden="true" />}
                      {toBusinessTournamentStatus(t.status)}
                    </span>
                  </td>
                  <td data-label="Mi rol">
                    {myItem ? (
                      <span className={`tn-role-chip ${myItem.is_creator ? 'is-admin' : 'is-player'}`}>
                        {myItem.is_creator ? 'Admin' : 'Jugador'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td className="tn-col-actions" data-label="Acciones">
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <Link to={`/tournaments/${t.id}`} className="dashboard-inline-link">
                        {myItem ? 'Gestionar' : 'Ver detalle'}
                      </Link>
                      {canRegister && (
                        <button className="tn-register-btn" disabled={registeringId === t.id} onClick={() => onRegister(t.id)}>
                          {registeringId === t.id ? 'Inscribiendo...' : 'Inscribirse'}
                        </button>
                      )}
                      <button type="button" className="tn-expand-btn" onClick={() => onToggleExpand(isExpanded ? null : t.id)}>
                        {isExpanded ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
                        {isExpanded ? 'Ocultar' : 'Expandir'}
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="tn-detail-row">
                    <td colSpan={6} data-label="">
                      <TournamentsDetail rows={detailRows} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
