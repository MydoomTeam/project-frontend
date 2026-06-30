import { useState, useCallback } from 'react';
import { createTournament, CreateTournamentPayload } from '../services/tournaments';
import { getBackendErrorMessage } from '../services/errorHandler';
import { CreateTournamentFormValues } from '../validation/schemas';
import { Tournament } from '../types/models';

export const useCreateTournament = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdTournament, setCreatedTournament] = useState<Tournament | null>(null);

  const mapFormToPayload = useCallback(
    (formValues: CreateTournamentFormValues): CreateTournamentPayload => ({
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
    }),
    [],
  );

  const createWithValidation = useCallback(
    async (formValues: CreateTournamentFormValues) => {
      setSubmitError('');
      setIsSubmitting(true);

      try {
        const payload = mapFormToPayload(formValues);
        const tournament = await createTournament(payload);
        setCreatedTournament(tournament);
        return tournament;
      } catch (err: unknown) {
        const errorMessage = getBackendErrorMessage(err, 'No se pudo crear el torneo.');
        setSubmitError(errorMessage);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [mapFormToPayload],
  );

  return {
    createWithValidation,
    isSubmitting,
    submitError,
    createdTournament,
  };
};
