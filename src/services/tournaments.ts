import apiClient from './apiClient';
import { Tournament, BracketResponse, RankingItem } from '../types/models';

export const getAvailableTournaments = async (): Promise<Tournament[]> => {
  const response = await apiClient.get<Tournament[]>('/tournaments/available');
  return response.data;
};

export const createTournament = async (name: string, elimination_type: string, rounds: number): Promise<Tournament> => {
  const response = await apiClient.post<Tournament>('/tournaments', { name, elimination_type, rounds });
  return response.data;
};

export const getTournamentDetail = async (id: number): Promise<Tournament> => {
  const response = await apiClient.get<Tournament>(`/tournaments/${id}`);
  return response.data;
};

export const registerInTournament = async (id: number): Promise<void> => {
  await apiClient.post(`/tournaments/${id}/registrations`);
};

export const unregisterFromTournament = async (id: number): Promise<void> => {
  await apiClient.delete(`/tournaments/${id}/registrations`);
};

export const getTournamentRegistrations = async (id: number): Promise<any> => {
  const response = await apiClient.get(`/tournaments/${id}/registrations`);
  return response.data;
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