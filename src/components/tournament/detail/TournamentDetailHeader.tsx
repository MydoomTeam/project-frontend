import React from 'react';
import { Link } from 'react-router-dom';
import { Tournament } from '../../../types/models';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../../../utils/tournamentStatus';

interface Props {
  tournament: Tournament;
  isCreator: boolean;
  isRegistered: boolean;
  hasPendingRegistration: boolean;
  hasConfirmedRegistration: boolean;
  isPlayerInTournament: boolean;
  participantStatusLabel: string;
  onRegister: () => void;
  onUnregister: () => void;
  onCancelTournament: () => void;
  onGenerateBracket: () => void;
  onStartTournament: () => void;
}

export const TournamentDetailHeader: React.FC<Props> = ({
  tournament,
  isCreator,
  isRegistered,
  hasPendingRegistration,
  hasConfirmedRegistration,
  isPlayerInTournament,
  participantStatusLabel,
  onRegister,
  onUnregister,
  onCancelTournament,
  onGenerateBracket,
  onStartTournament,
}) => (
  <>
    <div className="td-header-meta">
      <p className="td-breadcrumb">MIS TORNEOS / {tournament.name.toUpperCase()}</p>
      <Link to="/tournaments" className="td-back-link">← Volver a torneos</Link>
      <div className="td-header-title-row">
        <h1 className="td-title">{tournament.name}</h1>
        <span className={`badge ${getTournamentStatusBadgeClass(tournament.status)}`}>
          {toBusinessTournamentStatus(tournament.status)}
        </span>
      </div>
      <p className="td-subtitle">
        {tournament.elimination_type} · {tournament.rounds} rondas
        {isCreator && <span className="td-creator-chip">Administrador</span>}
        {isPlayerInTournament && <span className="td-player-chip">Participante</span>}
      </p>
    </div>

    <div className="td-actions">
      {tournament.status === 'Pendiente' && !isCreator && (
        <>
          <button
            onClick={onRegister}
            className={`btn td-btn-primary ${isRegistered ? 'td-btn-registered' : ''}`}
            disabled={isRegistered || hasPendingRegistration || hasConfirmedRegistration}
          >
            {hasConfirmedRegistration
              ? '✓ Inscripción confirmada'
              : (hasPendingRegistration || isRegistered ? '✓ Inscripción enviada' : 'Inscribirse')}
          </button>
          {(isRegistered || hasPendingRegistration || hasConfirmedRegistration) && (
            <button onClick={onUnregister} className="btn btn-secondary td-btn-sm">
              Salirme del torneo
            </button>
          )}
        </>
      )}

      {tournament.status !== 'Pendiente' && isPlayerInTournament && !isCreator && (
        <button className="btn td-btn-primary td-btn-registered" disabled>
          {participantStatusLabel}
        </button>
      )}

      {isCreator && (
        <>
          {tournament.status === 'Pendiente' && (
            <button onClick={onGenerateBracket} className="btn td-btn-primary">
              Generar cuadro
            </button>
          )}
          {tournament.status === 'Listo para iniciar' && (
            <button onClick={onStartTournament} className="btn btn-success">
              Iniciar torneo
            </button>
          )}
          {(tournament.status === 'Pendiente' || tournament.status === 'Listo para iniciar') && (
            <button onClick={onCancelTournament} className="btn btn-danger td-btn-sm">
              Eliminar torneo
            </button>
          )}
        </>
      )}
    </div>
  </>
);
