import api from './axios';

export interface FieldReport {
  id: number;
  clientId: string;
  user?: { id: number; name: string; email: string };
  lat: number;
  lng: number;
  accuracy?: number;
  capturedAt: string;
  type: 'LANDSLIDE' | 'FLOOD' | 'ROAD_DAMAGE' | 'BRIDGE_DAMAGE' | 'CONGESTION' | 'ACCIDENT' | 'OTHER';
  severity: number;
  note?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  moderatorNote?: string;
  incidentId?: number;
  imageUrls: string[];
  createdAt: string;
}

export interface FieldReportPageResponse {
  content: FieldReport[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const getFieldReports = async (params?: { page?: number; size?: number }): Promise<FieldReportPageResponse> => {
  const res = await api.get('/field-reports', { params });
  return res.data;
};

export const submitFieldReportApi = async (formData: FormData): Promise<{ duplicate: boolean; report: FieldReport }> => {
  const res = await api.post('/field-reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const verifyFieldReport = async (id: number, moderatorNote?: string): Promise<FieldReport> => {
  const res = await api.post(`/field-reports/${id}/verify`, { moderatorNote });
  return res.data;
};

export const rejectFieldReport = async (id: number, moderatorNote?: string): Promise<FieldReport> => {
  const res = await api.post(`/field-reports/${id}/reject`, { moderatorNote });
  return res.data;
};
