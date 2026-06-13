import apiClient from './apiClient';
import { SessionResponse } from '../types/models';

export const loginUser = async (identifier: string, password: string): Promise<SessionResponse> => {
  const response = await apiClient.post<SessionResponse>('/sessions', { identifier, password });
  return response.data;
};

export const registerUser = async (username: string, email: string, password: string): Promise<void> => {
  await apiClient.post('/users', { username, email, password });
};