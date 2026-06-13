import apiClient from './apiClient';
import { AlertItem } from '../types/models';

export const getAlerts = async (): Promise<{ items: AlertItem[] }> => {
  const response = await apiClient.get<{ items: AlertItem[] }>('/alerts');
  return response.data;
};

export const ackAlert = async (id: number): Promise<void> => {
  await apiClient.patch(`/alerts/${id}/ack`);
};