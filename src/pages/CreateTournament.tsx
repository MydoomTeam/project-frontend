import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiAlertCircle, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { createTournament, CreateTournamentPayload } from '../services/tournaments';
import { getBackendErrorMessage } from '../services/errorHandler';
import { CreateTournamentFormInput, CreateTournamentFormValues, createTournamentSchema } from '../validation/schemas';
import { EliminationType, Tournament } from '../types/models';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../utils/tournamentStatus';

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

const roundSuggestion = (type: EliminationType): number => {
  if (type === 'Eliminación Sencilla') return 3;
  if (type === 'Eliminación Doble') return 5;
  if (type === 'Round Robin') return 4;
  return 5;
};

const roundHint = (type: EliminationType): string => {
  if (type === 'Eliminación Sencilla') return 'Con 3 rondas se admiten hasta 8 participantes.';
  if (type === 'Eliminación Doble') return 'Con 5 rondas se gestionan 16 participantes en bracket doble.';
  if (type === 'Round Robin') return 'Número de jornadas o vueltas del torneo.';
  return 'Número de rondas Swiss programadas.';
};

const toDisplayDate = (value?: string | null): string => {
  if (!value) return 'Sin definir';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
};

const toDisplayValue = (value?: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Sin definir';
  return String(value);
};

export const CreateTournament: React.FC = () => {
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTournament, setCreatedTournament] = useState<Tournament | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTournamentFormInput, undefined, CreateTournamentFormValues>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: '',
      elimination_type: 'Eliminación Sencilla',
      rounds: 3,
      participant_target: undefined,
      round_duration_minutes: undefined,
      game_name: '',
      game_category: '',
      language: '',
      region: '',
      start_date: '',
      end_date: '',
    },
  });

  const values = watch();

  const handleSelectType = (type: EliminationType) => {
    setValue('elimination_type', type);
    setValue('rounds', roundSuggestion(type));
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
        <p>Define los parámetros técnicos y competitivos de tu evento.</p>
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

                  <div className="ct-grid ct-grid-2">
                    <div className="ct-field ct-field-span-2">
                      <label className="ct-label" htmlFor="ct-name">Nombre del torneo</label>
                      <input id="ct-name" type="text" className={`ct-input ${errors.name ? 'is-error' : ''}`} placeholder="Ej: BedWars Masters 2026" {...register('name')} autoFocus />
                      {errors.name && <span className="ct-error"><FiAlertCircle aria-hidden="true" />{errors.name.message}</span>}
                    </div>

                    <div className="ct-field ct-field-span-2">
                      <label className="ct-label">Sistema de eliminación</label>
                      <div className="ct-type-grid">
                        {ELIMINATION_OPTIONS.map((option) => (
                          <button key={option.value} type="button" className={`ct-type-card ${values.elimination_type === option.value ? 'selected' : ''}`} onClick={() => handleSelectType(option.value)}>
                            <span className="ct-type-name">{option.label}</span>
                            <span className="ct-type-desc">{option.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-rounds">Rondas</label>
                      <input id="ct-rounds" type="number" min={1} max={20} className={`ct-input ${errors.rounds ? 'is-error' : ''}`} {...register('rounds', { valueAsNumber: true })} />
                      <p className="ct-hint">{roundHint(values.elimination_type)}</p>
                      {errors.rounds && <span className="ct-error"><FiAlertCircle aria-hidden="true" />{errors.rounds.message}</span>}
                    </div>

                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-participants">Número de participantes</label>
                      <input id="ct-participants" type="number" min={2} className={`ct-input ${errors.participant_target ? 'is-error' : ''}`} {...register('participant_target', { valueAsNumber: true })} />
                      {errors.participant_target && <span className="ct-error"><FiAlertCircle aria-hidden="true" />{errors.participant_target.message}</span>}
                    </div>

                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-duration">Duración por ronda</label>
                      <input id="ct-duration" type="number" min={1} className={`ct-input ${errors.round_duration_minutes ? 'is-error' : ''}`} {...register('round_duration_minutes', { valueAsNumber: true })} />
                      {errors.round_duration_minutes && <span className="ct-error"><FiAlertCircle aria-hidden="true" />{errors.round_duration_minutes.message}</span>}
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

                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-start-date">Fecha de inicio</label>
                      <input id="ct-start-date" type="date" className="ct-input" {...register('start_date')} />
                    </div>

                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-end-date">Fecha de fin</label>
                      <input id="ct-end-date" type="date" className={`ct-input ${errors.end_date ? 'is-error' : ''}`} {...register('end_date')} />
                      {errors.end_date && <span className="ct-error"><FiAlertCircle aria-hidden="true" />{errors.end_date.message}</span>}
                    </div>
                  </div>

                  {submitError && <div className="ct-error-banner"><FiAlertCircle aria-hidden="true" />{submitError}</div>}

                  <div className="ct-actions">
                    <button type="submit" className="ct-btn ct-btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Creando...' : 'Crear torneo'}</button>
                  </div>
                </motion.div>
              )}

              {step === 2 && createdTournament && (
                <motion.div key="summary" className="ct-card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                  <div className="ct-success-banner">
                    <div>
                      <h2 className="ct-card-title">Resumen de creación</h2>
                      <p className="ct-hint">El torneo fue creado correctamente y quedó listo para continuar con la configuración operativa.</p>
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
                      <div className="ct-review-row"><span>Juego</span><strong>{toDisplayValue(createdTournament.game_name)}</strong></div>
                      <div className="ct-review-row"><span>Categoría</span><strong>{toDisplayValue(createdTournament.game_category)}</strong></div>
                      <div className="ct-review-row"><span>Idioma</span><strong>{toDisplayValue(createdTournament.language)}</strong></div>
                      <div className="ct-review-row"><span>Región</span><strong>{toDisplayValue(createdTournament.region)}</strong></div>
                      <div className="ct-review-row"><span>Inicio</span><strong>{toDisplayDate(createdTournament.start_date)}</strong></div>
                      <div className="ct-review-row"><span>Fin</span><strong>{toDisplayDate(createdTournament.end_date)}</strong></div>
                    </div>

                    <div className="ct-created-actions">
                      <h3 className="ct-summary-title">Siguientes acciones</h3>
                      <Link to={`/tournaments/${createdTournament.id}`} className="ct-btn ct-btn-primary">Agregar participantes <FiArrowRight aria-hidden="true" /></Link>
                      <Link to={`/tournaments/${createdTournament.id}`} className="ct-btn ct-btn-ghost">Generar bracket</Link>
                      <Link to={`/tournaments/${createdTournament.id}`} className="ct-btn ct-btn-ghost">Configurar deadlines</Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {step === 1 && (
            <aside className="ct-sidebar">
              <div className="ct-summary-card">
                <h3 className="ct-summary-title">Resumen</h3>
                <div className="ct-summary-rows">
                  <div className="ct-summary-row"><span>Nombre</span><strong>{values.name || <em className="ct-summary-empty">Sin definir</em>}</strong></div>
                  <div className="ct-summary-row"><span>Sistema</span><strong>{values.elimination_type}</strong></div>
                  <div className="ct-summary-row"><span>Rondas</span><strong>{values.rounds}</strong></div>
                  <div className="ct-summary-row"><span>Participantes</span><strong>{toDisplayValue(values.participant_target)}</strong></div>
                  <div className="ct-summary-row"><span>Duración</span><strong>{values.round_duration_minutes ? `${values.round_duration_minutes} min` : 'Sin definir'}</strong></div>
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
