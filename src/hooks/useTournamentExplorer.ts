import { useCallback, useEffect, useState } from 'react';
import { getAllTournaments, registerInTournament } from '../services/tournaments';
import { getPlayerTournamentHistory } from '../services/players';
import { Tournament, PlayerTournamentHistoryItem } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';

const TOURNAMENTS_REFRESH_MS = 8000;

export const useTournamentExplorer = (userId: number | null) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [history, setHistory] = useState<PlayerTournamentHistoryItem[]>([]);
  const [registeringId, setRegisteringId] = useState<number | null>(null);
  const [registerError, setRegisterError] = useState('');

  const loadTournaments = useCallback(async () => {
    try {
      const data = await getAllTournaments();
      setTournaments(data);
    } catch {
      setTournaments((current) => current);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (userId === null) return;
    try {
      const data = await getPlayerTournamentHistory(userId);
      setHistory(data);
    } catch {
      setHistory((current) => current);
    }
  }, [userId]);

  useEffect(() => {
    loadTournaments();
    loadHistory();

    const intervalId = window.setInterval(() => {
      loadTournaments();
      loadHistory();
    }, TOURNAMENTS_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [loadHistory, loadTournaments]);

  const handleRegister = useCallback(
    async (tournamentId: number) => {
      setRegisterError('');
      setRegisteringId(tournamentId);

      try {
        await registerInTournament(tournamentId);
        await loadHistory();
      } catch (err: unknown) {
        setRegisterError(getBackendErrorMessage(err, 'No se pudo inscribir en el torneo.'));
      } finally {
        setRegisteringId(null);
      }
    },
    [loadHistory],
  );

  return {
    tournaments,
    history,
    registeringId,
    registerError,
    handleRegister,
  };
};
