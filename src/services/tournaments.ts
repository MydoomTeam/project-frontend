import apiClient from './apiClient';
import { Tournament, BracketResponse, RankingItem, Match, RegistrationStatus, TournamentRegistration } from '../types/models';

export interface CreateTournamentPayload {
  name: string;
  elimination_type: string;
  rounds: number;
  game_name?: string;
  game_category?: string;
  participant_target?: number;
  round_duration_minutes?: number;
  start_date?: string;
  end_date?: string;
  language?: string;
  region?: string;
}

export const getAvailableTournaments = async (): Promise<Tournament[]> => {
  const response = await apiClient.get<Tournament[]>('/tournaments/available');
  return response.data;
};

export const getAllTournaments = async (): Promise<Tournament[]> => {
  const response = await apiClient.get<Tournament[]>('/tournaments');
  return response.data;
};

export const createTournament = async (
  payloadOrName: CreateTournamentPayload | string,
  elimination_type?: string,
  rounds?: number,
): Promise<Tournament> => {
  const payload: CreateTournamentPayload = typeof payloadOrName === 'string'
    ? { name: payloadOrName, elimination_type: elimination_type!, rounds: rounds! }
    : payloadOrName;

  const response = await apiClient.post<Tournament>('/tournaments', payload);
  return response.data;
};

export const getTournamentDetail = async (id: number): Promise<Tournament> => {
  const response = await apiClient.get<Tournament>(`/tournaments/${id}`);
  return response.data;
};

export const registerInTournament = async (id: number): Promise<void> => {
  await apiClient.post(`/tournaments/${id}/registrations`);
};

export const getTournamentRegistrations = async (id: number): Promise<TournamentRegistration[]> => {
  const response = await apiClient.get<TournamentRegistration[]>(`/tournaments/${id}/registrations`);
  return response.data;
};

export const updateRegistrationStatus = async (
  tournamentId: number,
  playerId: number,
  status: RegistrationStatus,
): Promise<void> => {
  await apiClient.patch(`/tournaments/${tournamentId}/registrations/${playerId}`, { status });
};

export const unregisterFromTournament = async (id: number): Promise<void> => {
  await apiClient.delete(`/tournaments/${id}/registrations`);
};

export const cancelTournament = async (id: number): Promise<void> => {
  await apiClient.delete(`/tournaments/${id}`);
};

export const generateBracket = async (id: number): Promise<BracketResponse> => {
  const response = await apiClient.post<BracketResponse>(`/tournaments/${id}/bracket`);
  return response.data;
};

export const startTournament = async (id: number): Promise<void> => {
  await apiClient.post(`/tournaments/${id}/start`);
};

export const getBracket = async (id: number): Promise<BracketResponse> => {
  const response = await apiClient.get<BracketResponse>(`/tournaments/${id}/bracket`);
  return response.data;
};

export const registerMatchResult = async (tournamentId: number, matchId: number, winnerId: number): Promise<void> => {
  await apiClient.post(`/tournaments/${tournamentId}/matches/${matchId}/result`, { winner_id: winnerId });
};

export const getRanking = async (id: number): Promise<{ ranking: RankingItem[] }> => {
  const response = await apiClient.get<{ ranking: RankingItem[] }>(`/tournaments/${id}/ranking`);
  return response.data;
};

export const getPlayerHistory = async (tournamentId: number, playerId: number): Promise<Match[]> => {
  const response = await apiClient.get<Match[]>(`/tournaments/${tournamentId}/players/${playerId}/history`);
  return response.data;
};