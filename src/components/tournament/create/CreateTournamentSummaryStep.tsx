import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUsers, FiGrid, FiSettings, FiArrowRight } from 'react-icons/fi';
import { Tournament } from '../../../types/models';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../../../utils/tournamentStatus';

interface CreateTournamentSummaryStepProps {
  tournament: Tournament;
}

const displayValue = (value?: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Sin definir';
  return String(value);
};

const displayDuration = (value: unknown): string => {
  if (
    !value ||
    value === '' ||
    Number.isNaN(Number(value))
  ) {
    return 'Sin definir';
  }
  return `${Number(value)} min`;
};

const displayDate = (value?: string | null): string => {
  if (!value) return 'Sin definir';
  return value;
};

export const CreateTournamentSummaryStep: React.FC<CreateTournamentSummaryStepProps> = ({
  tournament,
}) => (
  <motion.div
    key="summary"
    className="ct-card"
    initial={{ opacity: 0, x: 16 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -16 }}
    transition={{ duration: 0.18 }}
  >
    <div className="ct-success-banner">
      <div>
        <h2 className="ct-card-title">¡Torneo creado correctamente!</h2>
        <p className="ct-hint">
          El torneo quedó registrado con estado <strong>Pendiente</strong>. Completa la
          configuración operativa para activarlo.
        </p>
      </div>
      <span className={`badge ${getTournamentStatusBadgeClass(tournament.status)}`}>
        {toBusinessTournamentStatus(tournament.status)}
      </span>
    </div>

    <div className="ct-summary-layout">
      <div className="ct-review-list">
        <div className="ct-review-row">
          <span>Nombre</span>
          <strong>{tournament.name}</strong>
        </div>
        <div className="ct-review-row">
          <span>Formato</span>
          <strong>{tournament.elimination_type}</strong>
        </div>
        <div className="ct-review-row">
          <span>Rondas</span>
          <strong>{tournament.rounds}</strong>
        </div>
        <div className="ct-review-row">
          <span>Participantes</span>
          <strong>{displayValue(tournament.participant_target)}</strong>
        </div>
        <div className="ct-review-row">
          <span>Duración por ronda</span>
          <strong>{displayDuration(tournament.round_duration_minutes)}</strong>
        </div>
        <div className="ct-review-row">
          <span>Modo de resultado</span>
          <strong>{tournament.uses_score ? 'Con puntuación' : 'WIN/LOSE'}</strong>
        </div>
        <div className="ct-review-row">
          <span>Juego</span>
          <strong>{displayValue(tournament.game_name)}</strong>
        </div>
        <div className="ct-review-row">
          <span>Categoría</span>
          <strong>{displayValue(tournament.game_category)}</strong>
        </div>
        <div className="ct-review-row">
          <span>Idioma</span>
          <strong>{displayValue(tournament.language)}</strong>
        </div>
        <div className="ct-review-row">
          <span>Región</span>
          <strong>{displayValue(tournament.region)}</strong>
        </div>
        <div className="ct-review-row">
          <span>Inicio</span>
          <strong>{displayDate(tournament.start_date)}</strong>
        </div>
        <div className="ct-review-row">
          <span>Fin</span>
          <strong>{displayDate(tournament.end_date)}</strong>
        </div>
      </div>

      <div className="ct-created-actions">
        <h3 className="ct-summary-title">Próximos pasos</h3>
        <Link to={`/tournaments/${tournament.id}`} className="ct-action-card ct-action-primary">
          <span className="ct-action-icon">
            <FiUsers aria-hidden="true" />
          </span>
          <span className="ct-action-body">
            <strong>Agregar participantes</strong>
            <em>Inscribe jugadores al torneo</em>
          </span>
          <FiArrowRight className="ct-action-arrow" aria-hidden="true" />
        </Link>
        <Link to={`/tournaments/${tournament.id}`} className="ct-action-card">
          <span className="ct-action-icon">
            <FiGrid aria-hidden="true" />
          </span>
          <span className="ct-action-body">
            <strong>Generar bracket</strong>
            <em>Crea el cuadro de enfrentamientos</em>
          </span>
          <FiArrowRight className="ct-action-arrow" aria-hidden="true" />
        </Link>
        <Link to={`/tournaments/${tournament.id}`} className="ct-action-card">
          <span className="ct-action-icon">
            <FiSettings aria-hidden="true" />
          </span>
          <span className="ct-action-body">
            <strong>Configurar deadlines</strong>
            <em>Define fechas límite de rondas</em>
          </span>
          <FiArrowRight className="ct-action-arrow" aria-hidden="true" />
        </Link>
      </div>
    </div>
  </motion.div>
);
