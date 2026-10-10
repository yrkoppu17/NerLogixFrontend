import api from './axios';

export interface Incident {
  id: number;
  type: 'LANDSLIDE' | 'FLOOD' | 'ROAD_DAMAGE' | 'BRIDGE_DAMAGE' | 'CONGESTION' | 'ACCIDENT' | 'OTHER';
  severity: number;
  lat: number;
  lng: number;
  segmentId?: number;
  segmentName?: string;
  districtId?: number;
  districtName?: string;
  description: string;
  status: 'REPORTED' | 'VERIFIED' | 'RESOLVED' | 'REJECTED';
  source: 'FIELD' | 'SYSTEM' | 'INTEGRATION' | 'DRIVER';
  reportId?: number;
  createdBy?: { id: number; name: string };
  createdAt: string;
  resolvedAt?: string;
}

export interface IncidentEvent {
  id: number;
  incidentId: number;
  action: string;
  byUser?: { id: number; name: string };
  note?: string;
  at: string;
}

export interface IncidentPageResponse {
  content: Incident[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface IncidentEventPageResponse {
  content: IncidentEvent[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const getIncidents = async (params?: {
  status?: string;
  type?: string;
  districtId?: number;
  segmentId?: number;
  q?: string;
  page?: number;
  size?: number;
}): Promise<IncidentPageResponse> => {
  const res = await api.get('/incidents', { params });
  return res.data;
};

export const getIncidentById = async (id: number): Promise<Incident> => {
  const res = await api.get(`/incidents/${id}`);
  return res.data;
};

export const createIncident = async (data: Partial<Incident>): Promise<Incident> => {
  const res = await api.post('/incidents', data);
  return res.data;
};

export const resolveIncident = async (id: number, note?: string): Promise<Incident> => {
  const res = await api.post(`/incidents/${id}/resolve`, { note });
  return res.data;
};

export const getIncidentEvents = async (id: number): Promise<IncidentEvent[]> => {
  const res = await api.get(`/incidents/${id}/events`);
  return res.data;
};

export const getIncidentHistoryTimeline = async (params?: { page?: number; size?: number }): Promise<IncidentEventPageResponse> => {
  const res = await api.get('/incidents/history', { params });
  return res.data;
};
