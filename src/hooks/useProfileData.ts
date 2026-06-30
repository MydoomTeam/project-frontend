import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBackendErrorMessage } from '../services/errorHandler';
import { getPlayerById, getPlayerEloHistory, getPlayerTournamentHistory } from '../services/players';
import { useStoredUserProfile } from './useStoredUserProfile';
import { EloHistoryItem, Player, PlayerTournamentHistoryItem } from '../types/models';

export interface ProfileDataResult {
  player: Player | null;
  tournamentHistory: PlayerTournamentHistoryItem[];
  eloHistory: EloHistoryItem[];
  errorMessage: string;
  isOwnProfile: boolean;
  targetPlayerId: number | null;
  setPlayer: Dispatch<SetStateAction<Player | null>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
}

export const useProfileData = (): ProfileDataResult => {
  const { playerId } = useParams<{ playerId?: string }>();
  const storedUser = useStoredUserProfile();
  const [player, setPlayer] = useState<Player | null>(null);
  const [tournamentHistory, setTournamentHistory] = useState<PlayerTournamentHistoryItem[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const storedUserId = storedUser?.id ?? null;

  const targetPlayerId = useMemo(() => {
    if (!playerId) return storedUserId;
    const parsed = Number(playerId);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }, [playerId, storedUserId]);

  const isOwnProfile = targetPlayerId !== null && storedUserId !== null && targetPlayerId === storedUserId;

  useEffect(() => {
    const loadPlayer = async () => {
      if (targetPlayerId === null) {
        setErrorMessage('No se encontró la sesión del usuario. Inicia sesión de nuevo.');
        setPlayer(null);
        return;
      }
      try {
        const response = await getPlayerById(targetPlayerId);
        setPlayer(response);
        setErrorMessage('');
      } catch (error: unknown) {
        setErrorMessage(getBackendErrorMessage(error, 'No se pudo cargar el perfil del usuario.'));
      }
    };

    loadPlayer();
  }, [targetPlayerId]);

  useEffect(() => {
    const loadHistory = async () => {
      if (targetPlayerId === null) {
        setTournamentHistory([]);
        setEloHistory([]);
        return;
      }
      try {
        const [historyResponse, eloResponse] = await Promise.all([
          getPlayerTournamentHistory(targetPlayerId),
          getPlayerEloHistory(targetPlayerId),
        ]);
        setTournamentHistory(historyResponse);
        setEloHistory(eloResponse);
      } catch (error: unknown) {
        setErrorMessage(getBackendErrorMessage(error, 'No se pudo cargar el historial del perfil.'));
      }
    };

    loadHistory();
  }, [targetPlayerId]);

  return {
    player,
    tournamentHistory,
    eloHistory,
    errorMessage,
    isOwnProfile,
    targetPlayerId,
    setPlayer,
    setErrorMessage,
  };
};
