import apiClient from './apiClient';
import { AlertPanelResponse } from '../types/models';

export const getAlerts = async (): Promise<AlertPanelResponse> => {
  const response = await apiClient.get<AlertPanelResponse>('/alerts');
  return response.data;
};

export const ackAlert = async (id: number): Promise<void> => {
  await apiClient.patch(`/alerts/${id}/ack`);
};