import apiClient from './apiClient';
import { EloHistoryItem, Player, PlayerLookupItem, PlayerTournamentHistoryItem } from '../types/models';

interface PasswordUpdatePayload {
  current_password: string;
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

export const updateMyAvatarUrl = async (avatar_url: string | null): Promise<Player> => {
  const response = await apiClient.put<Player>('/players/me/avatar', { avatar_url });
  return response.data;
};

export const uploadMyAvatarFile = async (file: File): Promise<Player> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await apiClient.post<Player>('/players/me/avatar-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const searchPlayers = async (query: string, limit = 8): Promise<PlayerLookupItem[]> => {
  const response = await apiClient.get<PlayerLookupItem[]>('/players', {
    params: { q: query, limit },
  });
  return response.data;
};
