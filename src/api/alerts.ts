import api from './axios';

export interface AlertItem {
  id: number;
  type: 'ROAD_BLOCKED' | 'DISTRICT_INACCESSIBLE' | 'DELIVERY_DELAYED' | 'HIGH_RISK_CORRIDOR' | 'INCIDENT' | 'EMERGENCY';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  entityType?: string;
  entityId?: number;
  openKey?: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  title: string;
  message: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AlertPageResponse {
  content: AlertItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const getAlerts = async (params?: { status?: string; type?: string; page?: number; size?: number }): Promise<AlertPageResponse> => {
  const res = await api.get('/alerts', { params });
  return res.data;
};

export const ackAlert = async (id: number): Promise<AlertItem> => {
  const res = await api.post(`/alerts/${id}/ack`);
  return res.data;
};

export const resolveAlert = async (id: number): Promise<AlertItem> => {
  const res = await api.post(`/alerts/${id}/resolve`);
  return res.data;
};
