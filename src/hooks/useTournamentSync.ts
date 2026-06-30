import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateTournamentFormInput, CreateTournamentFormValues } from '../validation/schemas';
import {
  getMaxRoundsForFormat,
  getMinParticipantsForFormat,
  getParticipantRangeForRounds,
  getRoundRangeForParticipants,
  getSuggestedRoundsForConfig,
} from '../validation/schemas';
import { EliminationType } from '../types/models';

export const useTournamentSync = (
  methods: UseFormReturn<CreateTournamentFormInput, undefined, CreateTournamentFormValues>,
) => {
  const { watch, setValue, trigger } = methods;
  const values = watch() as CreateTournamentFormValues;

  const syncTournamentConfig = useCallback(
    async (type: EliminationType, participantTarget: number, rounds: number) => {
      setValue('elimination_type', type, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
      setValue('participant_target', participantTarget as unknown as undefined, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
      setValue('rounds', rounds, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
      await trigger(['elimination_type', 'participant_target', 'rounds']);
    },
    [setValue, trigger],
  );

  const syncRoundsForParticipants = useCallback(
    async (type: EliminationType, participantTarget: number) => {
      const normalizedParticipants = Math.max(
        getMinParticipantsForFormat(type),
        Math.min(128, participantTarget),
      );
      const nextRoundRange = getRoundRangeForParticipants(type, normalizedParticipants);
      const nextRounds =
        nextRoundRange.min === nextRoundRange.max
          ? nextRoundRange.min
          : Math.min(
              Math.max(values.rounds || 1, nextRoundRange.min),
              nextRoundRange.max,
            );
      await syncTournamentConfig(type, normalizedParticipants, nextRounds);
    },
    [values.rounds, syncTournamentConfig],
  );

  const syncParticipantsForRounds = useCallback(
    async (type: EliminationType, rounds: number) => {
      const formatMinParticipants = getMinParticipantsForFormat(type);
      const normalizedRounds = Math.min(Math.max(rounds, 1), getMaxRoundsForFormat(type));
      const nextParticipantRange = getParticipantRangeForRounds(type, normalizedRounds);
      const participantValue = Math.max(
        formatMinParticipants,
        values.participant_target ?? formatMinParticipants,
      );
      const nextParticipants = Math.min(
        Math.max(participantValue, nextParticipantRange.min),
        nextParticipantRange.max,
      );
      await syncTournamentConfig(type, nextParticipants, normalizedRounds);
    },
    [values.participant_target, syncTournamentConfig],
  );

  const handleSelectType = useCallback(
    async (type: EliminationType) => {
      const minParticipants = getMinParticipantsForFormat(type);
      const currentParticipants =
        values.participant_target ?? getMinParticipantsForFormat(values.elimination_type);
      const nextParticipants = Math.max(minParticipants, currentParticipants);
      await syncTournamentConfig(
        type,
        nextParticipants,
        getSuggestedRoundsForConfig(type, nextParticipants),
      );
    },
    [values.participant_target, values.elimination_type, syncTournamentConfig],
  );

  return {
    syncTournamentConfig,
    syncRoundsForParticipants,
    syncParticipantsForRounds,
    handleSelectType,
  };
};
