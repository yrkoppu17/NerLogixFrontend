import api from './axios';

export interface Vehicle {
  id: number;
  regNo: string;
  type: 'TRUCK' | 'MEDICAL_VAN' | 'TANKER' | 'MINI_TRUCK';
  capacityKg: number;
  status: 'IDLE' | 'ON_TRIP' | 'MAINTENANCE';
  lat: number;
  lng: number;
  heading: number;
  speedKmph: number;
  lastSeen: string;
}

export interface VehiclePosition {
  id: number;
  vehicleId: number;
  lat: number;
  lng: number;
  heading: number;
  speedKmph: number;
  recordedAt: string;
}

export interface VehiclePageResponse {
  content: Vehicle[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const getVehicles = async (params?: {
  status?: string;
  type?: string;
  q?: string;
  page?: number;
  size?: number;
}): Promise<VehiclePageResponse> => {
  const res = await api.get('/vehicles', { params });
  return res.data;
};

export const getVehicleById = async (id: number): Promise<Vehicle> => {
  const res = await api.get(`/vehicles/${id}`);
  return res.data;
};

export const createVehicle = async (data: Partial<Vehicle>): Promise<Vehicle> => {
  const res = await api.post('/vehicles', data);
  return res.data;
};

export const updateVehicle = async (id: number, data: Partial<Vehicle>): Promise<Vehicle> => {
  const res = await api.put(`/vehicles/${id}`, data);
  return res.data;
};

export const deleteVehicle = async (id: number): Promise<void> => {
  await api.delete(`/vehicles/${id}`);
};

export const getVehicleTrail = async (id: number): Promise<VehiclePosition[]> => {
  const res = await api.get(`/vehicles/${id}/trail`);
  return res.data;
};

export const postDriverPosition = async (positions: Array<{ lat: number; lng: number; heading?: number; speedKmph?: number }>): Promise<void> => {
  await api.post('/vehicles/me/position', positions);
};
