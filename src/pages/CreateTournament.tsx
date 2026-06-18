import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiAlertCircle, FiArrowLeft, FiArrowRight, FiUsers, FiGrid, FiSettings, FiCalendar } from 'react-icons/fi';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { createTournament, CreateTournamentPayload } from '../services/tournaments';
import { getBackendErrorMessage } from '../services/errorHandler';
import {
  CreateTournamentFormInput,
  CreateTournamentFormValues,
  createTournamentSchema,
  getMaxRoundsForFormat,
  getMinParticipantsForFormat,
  getParticipantRangeForRounds,
  getRoundRangeForParticipants,
  getSuggestedRoundsForConfig,
} from '../validation/schemas';
import { EliminationType, Tournament } from '../types/models';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../utils/tournamentStatus';
import { formatDateForDisplay } from '../utils/dateDisplay';

const ELIMINATION_OPTIONS: { value: EliminationType; label: string; description: string }[] = [
  {
    value: 'Eliminación Sencilla',
    label: 'Eliminación Sencilla',
    description: 'Un solo partido por ronda. La derrota elimina al jugador.',
  },
  {
    value: 'Eliminación Doble',
    label: 'Eliminación Doble',
    description: 'Los jugadores tienen dos oportunidades antes de ser eliminados.',
  },
  {
    value: 'Round Robin',
    label: 'Round Robin',
    description: 'Todos contra todos. Clasifica por puntos acumulados.',
  },
  {
    value: 'Swiss',
    label: 'Swiss',
    description: 'Emparejamientos dinámicos por rendimiento. Sin eliminación directa.',
  },
];

const STEP_LABELS = ['Configuración', 'Resumen'];

const roundHint = (type: EliminationType, rounds: number, participants: number): string => {
  const participantRange = getParticipantRangeForRounds(type, rounds);
  const roundRange = getRoundRangeForParticipants(type, participants);

  if (type === 'Eliminación Sencilla' || type === 'Eliminación Doble') {
    const participantLabel = participantRange.min === participantRange.max
      ? `${participantRange.min} participante${participantRange.min === 1 ? '' : 's'}`
      : `entre ${participantRange.min} y ${participantRange.max} participantes`;
    return `${rounds} ronda(s) en ${type} admite ${participantLabel}.`;
  }

  if (type === 'Round Robin') {
    return `Mínimo ${getMinParticipantsForFormat(type)} participantes. Puedes usar entre ${roundRange.min} y ${roundRange.max} vueltas.`;
  }

  return `Mínimo ${getMinParticipantsForFormat(type)} participantes. Con ${participants} jugadores puedes usar hasta ${roundRange.max} rondas Swiss.`;
};

const participantHint = (type: EliminationType, rounds: number): string => {
  const range = getParticipantRangeForRounds(type, rounds);
  if (range.min === range.max) {
    return `${type} con ${rounds} ronda(s) requiere ${range.min} participante${range.min === 1 ? '' : 's'}.`;
  }
  if (type === 'Round Robin' || type === 'Swiss') {
    return `${type} requiere mínimo ${range.min} participantes.`;
  }
  return `${type} con ${rounds} ronda(s) admite entre ${range.min} y ${range.max} participantes.`;
};

const toDisplayDate = (value?: string | null): string => formatDateForDisplay(value);

const toDisplayValue = (value?: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Sin definir';
  return String(value);
};

const formatISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDisplay = (d?: Date): string => {
  if (!d) return 'Sin definir';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getNumVal = (val: unknown, fallback: number): number => {
  const n = Number(val);
  return !Number.isNaN(n) && n > 0 ? n : fallback;
};

interface NumStepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  hasError?: boolean;
}
const NumStepper: React.FC<NumStepperProps> = ({ value, min, max, step = 1, onChange, hasError }) => (
  <div className={`ct-num-stepper${hasError ? ' is-error' : ''}`}>
    <button type="button" className="ct-num-btn" onClick={() => onChange(Math.max(min, value - step))} aria-label="Reducir">−</button>
    <span className="ct-num-val">{value}</span>
    <button type="button" className="ct-num-btn" onClick={() => onChange(Math.min(max, value + step))} aria-label="Aumentar">+</button>
  </div>
);

export const CreateTournament: React.FC = () => {
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTournament, setCreatedTournament] = useState<Tournament | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPlacement, setCalendarPlacement] = useState<{ up: boolean; right: boolean }>({ up: true, right: false });
  const calRef = useRef<HTMLDivElement>(null);

  const updateCalendarPlacement = () => {
    if (!calRef.current) return;
    const rect = calRef.current.getBoundingClientRect();
    const popupWidth = 340;
    const popupHeight = 360;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = window.innerWidth - rect.left;

    const up = spaceBelow < popupHeight && spaceAbove > spaceBelow;
    const right = spaceRight < popupWidth && rect.right > popupWidth;

    setCalendarPlacement({ up, right });
  };

  useEffect(() => {
    if (!calendarOpen) return;
    updateCalendarPlacement();

    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };

    const resizeHandler = () => updateCalendarPlacement();

    document.addEventListener('mousedown', handler);
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('scroll', resizeHandler, true);

    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', resizeHandler, true);
    };
  }, [calendarOpen]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CreateTournamentFormInput, undefined, CreateTournamentFormValues>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: '',
      elimination_type: 'Eliminación Sencilla',
      rounds: 3,
      participant_target: 8 as unknown as undefined,
      round_duration_minutes: '' as unknown as undefined,
      uses_score: false,
      game_name: '',
      game_category: '',
      language: '',
      region: '',
      start_date: '',
      end_date: '',
    },
  });

  const values = watch();
  const usesScoreRegistration = register('uses_score');
  const participantValue = getNumVal(values.participant_target, getMinParticipantsForFormat(values.elimination_type));
  const roundRange = getRoundRangeForParticipants(values.elimination_type, participantValue);
  const participantRange = getParticipantRangeForRounds(values.elimination_type, values.rounds || 1);
  const formatMinParticipants = getMinParticipantsForFormat(values.elimination_type);
  const formatMaxRounds = getMaxRoundsForFormat(values.elimination_type);

  const syncTournamentConfig = async (
    type: EliminationType,
    participantTarget: number,
    rounds: number,
  ) => {
    setValue('elimination_type', type, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
    setValue('participant_target', participantTarget as unknown as undefined, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
    setValue('rounds', rounds, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
    await trigger(['elimination_type', 'participant_target', 'rounds']);
  };

  const syncRoundsForParticipants = async (type: EliminationType, participantTarget: number) => {
    const normalizedParticipants = Math.max(getMinParticipantsForFormat(type), Math.min(128, participantTarget));
    const nextRoundRange = getRoundRangeForParticipants(type, normalizedParticipants);
    const nextRounds = nextRoundRange.min === nextRoundRange.max
      ? nextRoundRange.min
      : Math.min(Math.max(values.rounds || 1, nextRoundRange.min), nextRoundRange.max);
    await syncTournamentConfig(type, normalizedParticipants, nextRounds);
  };

  const syncParticipantsForRounds = async (type: EliminationType, rounds: number) => {
    const normalizedRounds = Math.min(Math.max(rounds, 1), getMaxRoundsForFormat(type));
    const nextParticipantRange = getParticipantRangeForRounds(type, normalizedRounds);
    const nextParticipants = Math.min(Math.max(participantValue, nextParticipantRange.min), nextParticipantRange.max);
    await syncTournamentConfig(type, nextParticipants, normalizedRounds);
  };

  const handleSelectType = async (type: EliminationType) => {
    const minParticipants = getMinParticipantsForFormat(type);
    const nextParticipants = Math.max(minParticipants, participantValue);
    await syncTournamentConfig(type, nextParticipants, getSuggestedRoundsForConfig(type, nextParticipants));
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    setValue('start_date', range?.from ? formatISO(range.from) : '');
    setValue('end_date', range?.to ? formatISO(range.to) : '');
  };

  const onCreate = async (formValues: CreateTournamentFormValues) => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const payload: CreateTournamentPayload = {
        name: formValues.name,
        elimination_type: formValues.elimination_type,
        rounds: formValues.rounds,
        participant_target: formValues.participant_target,
        round_duration_minutes: formValues.round_duration_minutes,
        uses_score: !!formValues.uses_score,
        game_name: formValues.game_name,
        game_category: formValues.game_category,
        language: formValues.language,
        region: formValues.region,
        start_date: formValues.start_date,
        end_date: formValues.end_date,
      };

      const tournament = await createTournament(payload);
      setCreatedTournament(tournament);
      setStep(2);
    } catch (err: unknown) {
      setSubmitError(getBackendErrorMessage(err, 'No se pudo crear el torneo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ct-shell">
      <Link to="/tournaments" className="ct-back">
        <FiArrowLeft aria-hidden="true" />
        Volver a torneos
      </Link>

      <motion.div className="ct-header" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h1>Configuración de Torneo</h1>
      </motion.div>

      <div className="ct-stepper" role="list" aria-label="Pasos del proceso">
        {STEP_LABELS.map((label, idx) => {
          const stepNumber = idx + 1;
          const done = step > stepNumber;
          const active = step === stepNumber;

          return (
            <React.Fragment key={label}>
              <div className={`ct-step ${active ? 'active' : ''} ${done ? 'done' : ''}`} role="listitem" aria-current={active ? 'step' : undefined}>
                <span className="ct-step-num">{done ? <FiCheck aria-hidden="true" /> : stepNumber}</span>
                <span className="ct-step-label">{label}</span>
              </div>
              {stepNumber < STEP_LABELS.length && <span className={`ct-step-divider ${done ? 'done' : ''}`} aria-hidden="true" />}
            </React.Fragment>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onCreate)} noValidate>
        <div className="ct-body">
          <div className="ct-main">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="config" className="ct-card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                  <h2 className="ct-card-title">Información general</h2>

                  {/* ── Campos obligatorios ─────────────────────────────── */}
                  <div className="ct-section-label">Campos obligatorios</div>
                  <div className="ct-grid ct-grid-2">
                    <div className="ct-field ct-field-span-2">
                      <label className="ct-label" htmlFor="ct-name">
                        Nombre del torneo <span className="ct-required">*</span>
                      </label>
                      <input id="ct-name" type="text" className={`ct-input ${errors.name ? 'is-error' : ''}`} placeholder="Ej: BedWars Masters 2026" {...register('name')} autoFocus />
                      {errors.name && <span className="ct-error"><FiAlertCircle aria-hidden="true" />{errors.name.message}</span>}
                    </div>

                    <div className="ct-field ct-field-span-2">
                      <label className="ct-label">
                        Sistema de eliminación <span className="ct-required">*</span>
                      </label>
                      <div className="ct-type-grid">
                        {ELIMINATION_OPTIONS.map((option) => (
                          <button key={option.value} type="button" className={`ct-type-card ${values.elimination_type === option.value ? 'selected' : ''}`} onClick={() => { void handleSelectType(option.value); }}>
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
                        onChange={(v) => { void syncParticipantsForRounds(values.elimination_type, v); }}
                        hasError={!!errors.rounds}
                      />
                      <p className="ct-hint">{roundHint(values.elimination_type, values.rounds || 1, participantValue)}</p>
                      {errors.rounds && <span className="ct-error"><FiAlertCircle aria-hidden="true" />{errors.rounds.message}</span>}
                    </div>

                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-participants">
                        Número de participantes <span className="ct-required">*</span>
                      </label>
                      <NumStepper
                        value={participantValue}
                        min={formatMinParticipants}
                        max={128}
                        step={1}
                        onChange={(v) => { void syncRoundsForParticipants(values.elimination_type, v); }}
                        hasError={!!errors.participant_target}
                      />
                      <p className="ct-hint">{participantHint(values.elimination_type, values.rounds || 1)}</p>
                      {errors.participant_target && <span className="ct-error"><FiAlertCircle aria-hidden="true" />{errors.participant_target.message}</span>}
                    </div>
                  </div>

                  {/* ── Campos opcionales ────────────────────────────────── */}
                  <div className="ct-section-label ct-section-label-optional">Información adicional <span className="ct-optional-tag">opcional</span></div>
                  <div className="ct-grid ct-grid-2">
                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-duration">Duración por ronda</label>
                      <div className="ct-stepper-inline">
                        <NumStepper
                          value={getNumVal(values.round_duration_minutes, 30)}
                          min={5}
                          max={180}
                          step={5}
                          onChange={(v) => setValue('round_duration_minutes', v as unknown as undefined)}
                          hasError={!!errors.round_duration_minutes}
                        />
                        <span className="ct-stepper-inline-label">min por ronda</span>
                      </div>
                      {errors.round_duration_minutes && <span className="ct-error"><FiAlertCircle aria-hidden="true" />{errors.round_duration_minutes.message}</span>}
                    </div>

                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-uses-score">Modo de resultado</label>
                      <label className="ct-switch" htmlFor="ct-uses-score">
                        <span className="ct-switch-track">
                          <input
                            id="ct-uses-score"
                            type="checkbox"
                            name={usesScoreRegistration.name}
                            ref={usesScoreRegistration.ref}
                            onBlur={usesScoreRegistration.onBlur}
                            checked={!!values.uses_score}
                            onChange={(event) => {
                              usesScoreRegistration.onChange(event);
                              setValue('uses_score', event.target.checked, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: false,
                              });
                            }}
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
                      <label className="ct-label" htmlFor="ct-game-name">Juego</label>
                      <input id="ct-game-name" type="text" className="ct-input" placeholder="Ej: Minecraft" {...register('game_name')} />
                    </div>

                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-category">Categoría</label>
                      <input id="ct-category" type="text" className="ct-input" placeholder="Ej: Profesional" {...register('game_category')} />
                    </div>

                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-language">Idioma</label>
                      <input id="ct-language" type="text" className="ct-input" placeholder="Ej: Español" {...register('language')} />
                    </div>

                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-region">Región</label>
                      <input id="ct-region" type="text" className="ct-input" placeholder="Ej: LATAM" {...register('region')} />
                    </div>

                    <div className="ct-field ct-field-span-2">
                      <label className="ct-label">Rango de fechas</label>
                      <div className="ct-datepicker-wrap" ref={calRef}>
                        <div className="ct-date-trigger-row">
                          <button
                            type="button"
                            className={`ct-date-trigger${dateRange?.from ? ' has-value' : ''}`}
                            onClick={() => setCalendarOpen((o) => !o)}
                          >
                            <FiCalendar aria-hidden="true" />
                            <span>{dateRange?.from ? formatDisplay(dateRange?.from) : 'Fecha Inicio'}</span>
                          </button>
                          <span className="ct-date-arrow">→</span>
                          <button
                            type="button"
                            className={`ct-date-trigger${dateRange?.to ? ' has-value' : ''}`}
                            onClick={() => setCalendarOpen((o) => !o)}
                          >
                            <FiCalendar aria-hidden="true" />
                            <span>{dateRange?.to ? formatDisplay(dateRange?.to) : 'Fecha Fin'}</span>
                          </button>
                          {(dateRange?.from || dateRange?.to) && (
                            <button
                              type="button"
                              className="ct-date-clear"
                              onClick={() => handleDateSelect(undefined)}
                              aria-label="Borrar fechas"
                            >Borrar</button>
                          )}
                        </div>
                        {calendarOpen && (
                          <div className={`ct-calendar-popup ${calendarPlacement.up ? 'is-up' : 'is-down'} ${calendarPlacement.right ? 'is-right' : 'is-left'}`}>
                            <DayPicker
                              mode="range"
                              selected={dateRange}
                              onSelect={handleDateSelect}
                              disabled={{ before: new Date() }}
                              weekStartsOn={1}
                            />
                          </div>
                        )}
                        {errors.end_date && <span className="ct-error"><FiAlertCircle aria-hidden="true" />{errors.end_date.message}</span>}
                      </div>
                      {/* Hidden inputs for RHF registration */}
                      <input type="hidden" {...register('start_date')} />
                      <input type="hidden" {...register('end_date')} />
                    </div>
                  </div>

                  {submitError && <div className="ct-error-banner"><FiAlertCircle aria-hidden="true" />{submitError}</div>}

                  <div className="ct-actions">
                    <button type="submit" className="ct-btn ct-btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? 'Creando...' : <>Crear torneo <FiArrowRight aria-hidden="true" /></>}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && createdTournament && (
                <motion.div key="summary" className="ct-card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                  <div className="ct-success-banner">
                    <div>
                      <h2 className="ct-card-title">¡Torneo creado correctamente!</h2>
                      <p className="ct-hint">El torneo quedó registrado con estado <strong>Pendiente</strong>. Completa la configuración operativa para activarlo.</p>
                    </div>
                    <span className={`badge ${getTournamentStatusBadgeClass(createdTournament.status)}`}>{toBusinessTournamentStatus(createdTournament.status)}</span>
                  </div>

                  <div className="ct-summary-layout">
                    <div className="ct-review-list">
                      <div className="ct-review-row"><span>Nombre</span><strong>{createdTournament.name}</strong></div>
                      <div className="ct-review-row"><span>Formato</span><strong>{createdTournament.elimination_type}</strong></div>
                      <div className="ct-review-row"><span>Rondas</span><strong>{createdTournament.rounds}</strong></div>
                      <div className="ct-review-row"><span>Participantes</span><strong>{toDisplayValue(createdTournament.participant_target)}</strong></div>
                      <div className="ct-review-row"><span>Duración por ronda</span><strong>{createdTournament.round_duration_minutes ? `${createdTournament.round_duration_minutes} min` : 'Sin definir'}</strong></div>
                      <div className="ct-review-row"><span>Modo de resultado</span><strong>{createdTournament.uses_score ? 'Con puntuación' : 'WIN/LOSE'}</strong></div>
                      <div className="ct-review-row"><span>Juego</span><strong>{toDisplayValue(createdTournament.game_name)}</strong></div>
                      <div className="ct-review-row"><span>Categoría</span><strong>{toDisplayValue(createdTournament.game_category)}</strong></div>
                      <div className="ct-review-row"><span>Idioma</span><strong>{toDisplayValue(createdTournament.language)}</strong></div>
                      <div className="ct-review-row"><span>Región</span><strong>{toDisplayValue(createdTournament.region)}</strong></div>
                      <div className="ct-review-row"><span>Inicio</span><strong>{toDisplayDate(createdTournament.start_date)}</strong></div>
                      <div className="ct-review-row"><span>Fin</span><strong>{toDisplayDate(createdTournament.end_date)}</strong></div>
                    </div>

                    <div className="ct-created-actions">
                      <h3 className="ct-summary-title">Próximos pasos</h3>
                      <Link to={`/tournaments/${createdTournament.id}`} className="ct-action-card ct-action-primary">
                        <span className="ct-action-icon"><FiUsers aria-hidden="true" /></span>
                        <span className="ct-action-body">
                          <strong>Agregar participantes</strong>
                          <em>Inscribe jugadores al torneo</em>
                        </span>
                        <FiArrowRight className="ct-action-arrow" aria-hidden="true" />
                      </Link>
                      <Link to={`/tournaments/${createdTournament.id}`} className="ct-action-card">
                        <span className="ct-action-icon"><FiGrid aria-hidden="true" /></span>
                        <span className="ct-action-body">
                          <strong>Generar bracket</strong>
                          <em>Crea el cuadro de enfrentamientos</em>
                        </span>
                        <FiArrowRight className="ct-action-arrow" aria-hidden="true" />
                      </Link>
                      <Link to={`/tournaments/${createdTournament.id}`} className="ct-action-card">
                        <span className="ct-action-icon"><FiSettings aria-hidden="true" /></span>
                        <span className="ct-action-body">
                          <strong>Configurar deadlines</strong>
                          <em>Define fechas límite de rondas</em>
                        </span>
                        <FiArrowRight className="ct-action-arrow" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {step === 1 && (
            <aside className="ct-sidebar">
              <div className="ct-summary-card">
                <h3 className="ct-summary-title">Vista previa</h3>
                <div className="ct-summary-rows">
                  <div className="ct-summary-row"><span>Nombre</span><strong>{values.name || <em className="ct-summary-empty">Sin definir</em>}</strong></div>
                  <div className="ct-summary-row"><span>Sistema</span><strong>{values.elimination_type}</strong></div>
                  <div className="ct-summary-row"><span>Rondas</span><strong>{values.rounds || <em className="ct-summary-empty">—</em>}</strong></div>
                  <div className="ct-summary-row">
                    <span>Participantes</span>
                    <strong>
                      {values.participant_target && values.participant_target !== '' && !Number.isNaN(Number(values.participant_target))
                        ? Number(values.participant_target)
                        : <em className="ct-summary-empty">Sin definir</em>}
                    </strong>
                  </div>
                  <div className="ct-summary-row">
                    <span>Duración</span>
                    <strong>
                      {values.round_duration_minutes && values.round_duration_minutes !== '' && !Number.isNaN(Number(values.round_duration_minutes))
                        ? `${Number(values.round_duration_minutes)} min`
                        : <em className="ct-summary-empty">Sin definir</em>}
                    </strong>
                  </div>
                  <div className="ct-summary-row"><span>Modo resultado</span><strong>{values.uses_score ? 'Con puntuación' : 'WIN/LOSE'}</strong></div>
                  {(values.game_name as string | undefined) && <div className="ct-summary-row"><span>Juego</span><strong>{String(values.game_name)}</strong></div>}
                  {(values.language as string | undefined) && <div className="ct-summary-row"><span>Idioma</span><strong>{String(values.language)}</strong></div>}
                  {(values.region as string | undefined) && <div className="ct-summary-row"><span>Región</span><strong>{String(values.region)}</strong></div>}
                  {(values.start_date as string | undefined) && <div className="ct-summary-row"><span>Inicio</span><strong>{toDisplayDate(values.start_date as string)}</strong></div>}
                  {(values.end_date as string | undefined) && <div className="ct-summary-row"><span>Fin</span><strong>{toDisplayDate(values.end_date as string)}</strong></div>}
                  <div className="ct-summary-row"><span>Estado</span><strong><span className={`badge ${getTournamentStatusBadgeClass('Pendiente')}`}>{toBusinessTournamentStatus('Pendiente')}</span></strong></div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </form>
    </div>
  );
};
