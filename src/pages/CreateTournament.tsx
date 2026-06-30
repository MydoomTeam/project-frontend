import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';

import {
  CreateTournamentFormInput,
  CreateTournamentFormValues,
  createTournamentSchema,
} from '../validation/schemas';
import { TOURNAMENT_STEP_LABELS, DEFAULT_FORM_VALUES } from '../constants/tournament';
import { useTournamentSync } from '../hooks/useTournamentSync';
import { useCreateTournament } from '../hooks/useCreateTournament';
import { useCalendarPlacement, useClickOutside } from '../hooks/useCalendarInteraction';
import { formatISO } from '../utils/tournamentFormatters';

import { TournamentStepper } from '../components/tournament/create/TournamentStepper';
import { CreateTournamentConfigStep } from '../components/tournament/create/CreateTournamentConfigStep';
import { CreateTournamentSummaryStep } from '../components/tournament/create/CreateTournamentSummaryStep';
import { TournamentPreview } from '../components/tournament/create/TournamentPreview';

export const CreateTournament: React.FC = () => {
  const [step, setStep] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const calRef = useRef<HTMLDivElement>(null);

  const methods = useForm<CreateTournamentFormInput, undefined, CreateTournamentFormValues>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });
  const { handleSubmit } = methods;

  const {
    syncTournamentConfig,
    syncRoundsForParticipants,
    syncParticipantsForRounds,
    handleSelectType,
  } = useTournamentSync(methods);

  const { createWithValidation, isSubmitting, submitError, createdTournament } =
    useCreateTournament();

  const calendarPlacement = useCalendarPlacement(calRef, calendarOpen);
  useClickOutside(calRef, () => setCalendarOpen(false));

  const toggleCalendar = useCallback(() => {
    setCalendarOpen((prev) => !prev);
  }, []);

  const updateDateRange = useCallback(
    (range: DateRange | undefined) => {
      setDateRange(range);
      const updateDate = (field: 'start_date' | 'end_date', date?: Date) => {
        methods.setValue(field, date ? formatISO(date) : '', { shouldDirty: true });
      };

      updateDate('start_date', range?.from);
      updateDate('end_date', range?.to);
    },
    [methods],
  );

  const onSubmit = useCallback(
    async (formValues: CreateTournamentFormValues) => {
      try {
        await createWithValidation(formValues);
        setStep(2);
      } catch {}
    },
    [createWithValidation],
  );

  return (
    <div className="ct-shell">
      <Link to="/tournaments" className="ct-back">
        <FiArrowLeft aria-hidden="true" />
        Volver a torneos
      </Link>

      <motion.div className="ct-header" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h1>Configuración de Torneo</h1>
      </motion.div>

      <TournamentStepper
        currentStep={step}
        totalSteps={TOURNAMENT_STEP_LABELS.length}
        labels={TOURNAMENT_STEP_LABELS}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="ct-body">
          <div className="ct-main">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <CreateTournamentConfigStep
                  methods={methods}
                  submitError={submitError}
                  isSubmitting={isSubmitting}
                  calendarOpen={calendarOpen}
                  dateRange={dateRange}
                  calRef={calRef}
                  calendarPlacement={calendarPlacement}
                  onCalendarToggle={toggleCalendar}
                  onDateSelect={updateDateRange}
                  onSelectType={handleSelectType}
                  onSyncRoundsForParticipants={syncRoundsForParticipants}
                  onSyncParticipantsForRounds={syncParticipantsForRounds}
                />
              )}

              {step === 2 && createdTournament && (
                <CreateTournamentSummaryStep tournament={createdTournament} />
              )}
            </AnimatePresence>
          </div>

          {step === 1 && (
            <aside className="ct-sidebar">
              <TournamentPreview methods={methods} />
            </aside>
          )}
        </div>
      </form>
    </div>
  );
};
