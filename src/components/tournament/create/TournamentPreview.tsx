import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateTournamentFormInput, CreateTournamentFormValues } from '../../../validation/schemas';
import {
  displayValue,
} from '../../../utils/tournamentFormatters';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../../../utils/tournamentStatus';

interface TournamentPreviewProps {
  methods: UseFormReturn<CreateTournamentFormInput, undefined, CreateTournamentFormValues>;
}

export const TournamentPreview: React.FC<TournamentPreviewProps> = ({ methods }) => {
  const { watch } = methods;
  const values = watch();

  const renderEmptyIfNeeded = (value: unknown): React.ReactNode => {
    if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) {
      return <em className="ct-summary-empty">Sin definir</em>;
    }
    return String(value);
  };

  const renderDuration = (value: unknown): React.ReactNode => {
    if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) {
      return <em className="ct-summary-empty">Sin definir</em>;
    }
    return `${Number(value)} min`;
  };

  const renderDate = (value?: string | null): React.ReactNode => {
    if (!value) {
      return <em className="ct-summary-empty">Sin definir</em>;
    }
    return value;
  };

  return (
    <div className="ct-summary-card">
      <h3 className="ct-summary-title">Vista previa</h3>
      <div className="ct-summary-rows">
        <div className="ct-summary-row">
          <span>Nombre</span>
          <strong>
            {values.name || <em className="ct-summary-empty">Sin definir</em>}
          </strong>
        </div>
        <div className="ct-summary-row">
          <span>Sistema</span>
          <strong>{values.elimination_type}</strong>
        </div>
        <div className="ct-summary-row">
          <span>Rondas</span>
          <strong>{values.rounds || <em className="ct-summary-empty">—</em>}</strong>
        </div>
        <div className="ct-summary-row">
          <span>Participantes</span>
          <strong>{renderEmptyIfNeeded(values.participant_target)}</strong>
        </div>
        <div className="ct-summary-row">
          <span>Duración</span>
          <strong>{renderDuration(values.round_duration_minutes)}</strong>
        </div>
        <div className="ct-summary-row">
          <span>Modo resultado</span>
          <strong>{values.uses_score ? 'Con puntuación' : 'WIN/LOSE'}</strong>
        </div>
        {(values.game_name as string | undefined) && (
          <div className="ct-summary-row">
            <span>Juego</span>
            <strong>{String(values.game_name)}</strong>
          </div>
        )}
        {(values.language as string | undefined) && (
          <div className="ct-summary-row">
            <span>Idioma</span>
            <strong>{String(values.language)}</strong>
          </div>
        )}
        {(values.region as string | undefined) && (
          <div className="ct-summary-row">
            <span>Región</span>
            <strong>{String(values.region)}</strong>
          </div>
        )}
        {(values.start_date as string | undefined) && (
          <div className="ct-summary-row">
            <span>Inicio</span>
            <strong>{renderDate(values.start_date as string)}</strong>
          </div>
        )}
        {(values.end_date as string | undefined) && (
          <div className="ct-summary-row">
            <span>Fin</span>
            <strong>{renderDate(values.end_date as string)}</strong>
          </div>
        )}
        <div className="ct-summary-row">
          <span>Estado</span>
          <strong>
            <span className={`badge ${getTournamentStatusBadgeClass('Pendiente')}`}>
              {toBusinessTournamentStatus('Pendiente')}
            </span>
          </strong>
        </div>
      </div>
    </div>
  );
};
