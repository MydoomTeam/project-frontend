import apiClient from './apiClient';
import { EloHistoryItem, Player, PlayerTournamentHistoryItem } from '../types/models';

interface PasswordUpdatePayload {
  password: string;
  password_confirm: string;
}

interface PasswordUpdateResponse {
  message: string;
}

export const getPlayerById = async (id: number): Promise<Player> => {
  const response = await apiClient.get<Player>(`/players/${id}`);
  return response.data;
};

export const updateAdminPassword = async (payload: PasswordUpdatePayload): Promise<PasswordUpdateResponse> => {
  const response = await apiClient.post<PasswordUpdateResponse>('/admins/password', payload);
  return response.data;
};

export const getPlayerTournamentHistory = async (id: number): Promise<PlayerTournamentHistoryItem[]> => {
  const response = await apiClient.get<PlayerTournamentHistoryItem[]>(`/players/${id}/tournaments`);
  return response.data;
};

export const getPlayerEloHistory = async (id: number): Promise<EloHistoryItem[]> => {
  const response = await apiClient.get<EloHistoryItem[]>(`/players/${id}/elo-history`);
  return response.data;
};
