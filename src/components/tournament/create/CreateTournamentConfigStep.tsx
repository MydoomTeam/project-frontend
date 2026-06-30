import React, { RefObject } from 'react';
import { FieldErrors, UseFormReturn } from 'react-hook-form';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiCalendar, FiArrowRight } from 'react-icons/fi';
import { DateRange, DayPicker } from 'react-day-picker';
import { CreateTournamentFormInput, CreateTournamentFormValues, getMaxRoundsForFormat, getMinParticipantsForFormat, getParticipantRangeForRounds, getRoundRangeForParticipants } from '../../../validation/schemas';
import { EliminationType } from '../../../types/models';
import { ELIMINATION_OPTIONS, TOURNAMENT_CONSTANTS } from '../../../constants/tournament';
import { formatISO, coercePositiveInteger } from '../../../utils/tournamentFormatters';

interface CreateTournamentConfigStepProps {
  methods: UseFormReturn<CreateTournamentFormInput, undefined, CreateTournamentFormValues>;
  submitError: string;
  isSubmitting: boolean;
  calendarOpen: boolean;
  dateRange: DateRange | undefined;
  calRef: RefObject<HTMLDivElement | null>;
  calendarPlacement: { up: boolean; right: boolean };
  onCalendarToggle: () => void;
  onDateSelect: (range: DateRange | undefined) => void;
  onSelectType: (type: EliminationType) => Promise<void>;
  onSyncRoundsForParticipants: (type: EliminationType, participants: number) => Promise<void>;
  onSyncParticipantsForRounds: (type: EliminationType, rounds: number) => Promise<void>;
}

const NumStepper: React.FC<{
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  hasError?: boolean;
}> = ({ value, min, max, step = 1, onChange, hasError }) => (
  <div className={`ct-num-stepper${hasError ? ' is-error' : ''}`}>
    <button
      type="button"
      className="ct-num-btn"
      onClick={() => onChange(Math.max(min, value - step))}
      aria-label="Reducir"
    >
      −
    </button>
    <span className="ct-num-val">{value}</span>
    <button
      type="button"
      className="ct-num-btn"
      onClick={() => onChange(Math.min(max, value + step))}
      aria-label="Aumentar"
    >
      +
    </button>
  </div>
);

const getRoundHint = (type: EliminationType, rounds: number, participants: number): string => {
  const participantRange = getParticipantRangeForRounds(type, rounds);
  const roundRange = getRoundRangeForParticipants(type, participants);

  if (type === 'Eliminación Sencilla' || type === 'Eliminación Doble') {
    const participantLabel =
      participantRange.min === participantRange.max
        ? `${participantRange.min} participante${participantRange.min === 1 ? '' : 's'}`
        : `entre ${participantRange.min} y ${participantRange.max} participantes`;
    return `${rounds} ronda(s) en ${type} admite ${participantLabel}.`;
  }

  if (type === 'Round Robin') {
    return `Mínimo ${getMinParticipantsForFormat(type)} participantes. Puedes usar entre ${roundRange.min} y ${roundRange.max} vueltas.`;
  }

  return `Mínimo ${getMinParticipantsForFormat(type)} participantes. Con ${participants} jugadores puedes usar hasta ${roundRange.max} rondas Swiss.`;
};

const getParticipantHint = (type: EliminationType, rounds: number): string => {
  const range = getParticipantRangeForRounds(type, rounds);
  if (range.min === range.max) {
    return `${type} con ${rounds} ronda(s) requiere ${range.min} participante${range.min === 1 ? '' : 's'}.`;
  }
  if (type === 'Round Robin' || type === 'Swiss') {
    return `${type} requiere mínimo ${range.min} participantes.`;
  }
  return `${type} con ${rounds} ronda(s) admite entre ${range.min} y ${range.max} participantes.`;
};

const formatDisplayDate = (d?: Date): string => {
  if (!d) return 'Sin definir';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const CreateTournamentConfigStep: React.FC<CreateTournamentConfigStepProps> = ({
  methods,
  submitError,
  isSubmitting,
  calendarOpen,
  dateRange,
  calRef,
  calendarPlacement,
  onCalendarToggle,
  onDateSelect,
  onSelectType,
  onSyncRoundsForParticipants,
  onSyncParticipantsForRounds,
}) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = methods;
  const values = watch() as CreateTournamentFormValues;

  const participantValue = coercePositiveInteger(
    values.participant_target,
    getMinParticipantsForFormat(values.elimination_type),
  );
  const formatMinParticipants = getMinParticipantsForFormat(values.elimination_type);
  const formatMaxRounds = getMaxRoundsForFormat(values.elimination_type);

  return (
    <motion.div
      key="config"
      className="ct-card"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.18 }}
    >
      <h2 className="ct-card-title">Información general</h2>

      <div className="ct-section-label">Campos obligatorios</div>
      <div className="ct-grid ct-grid-2">
        <div className="ct-field ct-field-span-2">
          <label className="ct-label" htmlFor="ct-name">
            Nombre del torneo <span className="ct-required">*</span>
          </label>
          <input
            id="ct-name"
            type="text"
            className={`ct-input ${errors.name ? 'is-error' : ''}`}
            placeholder="Ej: BedWars Masters 2026"
            {...register('name')}
            autoFocus
          />
          {errors.name && (
            <span className="ct-error">
              <FiAlertCircle aria-hidden="true" />
              {errors.name.message}
            </span>
          )}
        </div>

        <div className="ct-field ct-field-span-2">
          <label className="ct-label">
            Sistema de eliminación <span className="ct-required">*</span>
          </label>
          <div className="ct-type-grid">
            {ELIMINATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`ct-type-card ${values.elimination_type === option.value ? 'selected' : ''}`}
                onClick={() => {
                  void onSelectType(option.value);
                }}
              >
                <span className="ct-type-name">{option.label}</span>
                <span className="ct-type-desc">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ct-field">
          <label className="ct-label" htmlFor="ct-rounds">
            Rondas <span className="ct-required">*</span>
          </label>
          <NumStepper
            value={values.rounds || 1}
            min={1}
            max={formatMaxRounds}
            onChange={(v) => {
              void onSyncParticipantsForRounds(values.elimination_type, v);
            }}
            hasError={!!errors.rounds}
          />
          <p className="ct-hint">
            {getRoundHint(values.elimination_type, values.rounds || 1, participantValue)}
          </p>
          {errors.rounds && (
            <span className="ct-error">
              <FiAlertCircle aria-hidden="true" />
              {errors.rounds.message}
            </span>
          )}
        </div>

        <div className="ct-field">
          <label className="ct-label" htmlFor="ct-participants">
            Número de participantes <span className="ct-required">*</span>
          </label>
          <NumStepper
            value={participantValue}
            min={formatMinParticipants}
            max={TOURNAMENT_CONSTANTS.MAX_PARTICIPANTS}
            step={1}
            onChange={(v) => {
              void onSyncRoundsForParticipants(values.elimination_type, v);
            }}
            hasError={!!errors.participant_target}
          />
          <p className="ct-hint">
            {getParticipantHint(values.elimination_type, values.rounds || 1)}
          </p>
          {errors.participant_target && (
            <span className="ct-error">
              <FiAlertCircle aria-hidden="true" />
              {errors.participant_target.message}
            </span>
          )}
        </div>
      </div>

      <div className="ct-section-label ct-section-label-optional">
        Información adicional <span className="ct-optional-tag">opcional</span>
      </div>
      <div className="ct-grid ct-grid-2">
        <div className="ct-field">
          <label className="ct-label" htmlFor="ct-duration">
            Duración por ronda
          </label>
          <div className="ct-stepper-inline">
            <NumStepper
              value={coercePositiveInteger(values.round_duration_minutes, TOURNAMENT_CONSTANTS.DEFAULT_ROUND_DURATION)}
              min={5}
              max={TOURNAMENT_CONSTANTS.MAX_ROUND_DURATION}
              step={5}
              onChange={(v) =>
                setValue('round_duration_minutes', v as unknown as undefined)
              }
              hasError={!!errors.round_duration_minutes}
            />
            <span className="ct-stepper-inline-label">min por ronda</span>
          </div>
          {errors.round_duration_minutes && (
            <span className="ct-error">
              <FiAlertCircle aria-hidden="true" />
              {errors.round_duration_minutes.message}
            </span>
          )}
        </div>

        <div className="ct-field">
          <label className="ct-label" htmlFor="ct-uses-score">
            Modo de resultado
          </label>
          <label className="ct-switch" htmlFor="ct-uses-score">
            <span className="ct-switch-track">
              <input
                id="ct-uses-score"
                type="checkbox"
                {...register('uses_score')}
                checked={!!values.uses_score}
              />
              <span className="ct-switch-slider" aria-hidden="true" />
            </span>
            <span className="ct-switch-copy">
              <strong>Registrar puntuación</strong>
              <small>Si se desactiva, usa WIN/LOSE</small>
            </span>
          </label>
        </div>

        <div className="ct-field">
          <label className="ct-label" htmlFor="ct-game-name">
            Juego
          </label>
          <input
            id="ct-game-name"
            type="text"
            className="ct-input"
            placeholder="Ej: Minecraft"
            {...register('game_name')}
          />
        </div>

        <div className="ct-field">
          <label className="ct-label" htmlFor="ct-category">
            Categoría
          </label>
          <input
            id="ct-category"
            type="text"
            className="ct-input"
            placeholder="Ej: Profesional"
            {...register('game_category')}
          />
        </div>

        <div className="ct-field">
          <label className="ct-label" htmlFor="ct-language">
            Idioma
          </label>
          <input
            id="ct-language"
            type="text"
            className="ct-input"
            placeholder="Ej: Español"
            {...register('language')}
          />
        </div>

        <div className="ct-field">
          <label className="ct-label" htmlFor="ct-region">
            Región
          </label>
          <input
            id="ct-region"
            type="text"
            className="ct-input"
            placeholder="Ej: LATAM"
            {...register('region')}
          />
        </div>

        <div className="ct-field ct-field-span-2">
          <label className="ct-label">Rango de fechas</label>
          <div className="ct-datepicker-wrap" ref={calRef}>
            <div className="ct-date-trigger-row">
              <button
                type="button"
                className={`ct-date-trigger${dateRange?.from ? ' has-value' : ''}`}
                onClick={onCalendarToggle}
              >
                <FiCalendar aria-hidden="true" />
                <span>{dateRange?.from ? formatDisplayDate(dateRange?.from) : 'Fecha Inicio'}</span>
              </button>
              <span className="ct-date-arrow">→</span>
              <button
                type="button"
                className={`ct-date-trigger${dateRange?.to ? ' has-value' : ''}`}
                onClick={onCalendarToggle}
              >
                <FiCalendar aria-hidden="true" />
                <span>{dateRange?.to ? formatDisplayDate(dateRange?.to) : 'Fecha Fin'}</span>
              </button>
              {(dateRange?.from || dateRange?.to) && (
                <button
                  type="button"
                  className="ct-date-clear"
                  onClick={() => onDateSelect(undefined)}
                  aria-label="Borrar fechas"
                >
                  Borrar
                </button>
              )}
            </div>
            {calendarOpen && (
              <div
                className={`ct-calendar-popup ${calendarPlacement.up ? 'is-up' : 'is-down'} ${
                  calendarPlacement.right ? 'is-right' : 'is-left'
                }`}
              >
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={onDateSelect}
                  disabled={{ before: new Date() }}
                  weekStartsOn={1}
                />
              </div>
            )}
            {errors.end_date && (
              <span className="ct-error">
                <FiAlertCircle aria-hidden="true" />
                {errors.end_date.message}
              </span>
            )}
          </div>
          <input type="hidden" {...register('start_date')} />
          <input type="hidden" {...register('end_date')} />
        </div>
      </div>

      {submitError && (
        <div className="ct-error-banner">
          <FiAlertCircle aria-hidden="true" />
          {submitError}
        </div>
      )}

      <div className="ct-actions">
        <button type="submit" className="ct-btn ct-btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creando...' : <>Crear torneo <FiArrowRight aria-hidden="true" /></>}
        </button>
      </div>
    </motion.div>
  );
};
