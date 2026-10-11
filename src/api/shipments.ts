import api from './axios';
import { Vehicle } from './vehicles';

export interface RoadNode {
  id: number;
  name: string;
  lat: number;
  lng: number;
  districtId?: number;
  districtName?: string;
  kind?: string;
}

export interface UserSummary {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Shipment {
  id: number;
  code: string;
  cargoCategory: 'MEDICINE' | 'FOOD' | 'CONSTRUCTION' | 'AGRI' | 'OTHER';
  cargoDescription?: string;
  weightKg: number;
  priority: 'NORMAL' | 'HIGH' | 'EMERGENCY';
  originNode: RoadNode;
  destinationNode: RoadNode;
  vehicle?: Vehicle;
  driverUser?: UserSummary;
  status: 'DRAFT' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELAYED' | 'DELIVERED' | 'CANCELLED';
  plannedEta?: string;
  currentEta?: string;
  progressPct?: number;
  delayMin?: number;
  startedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface ShipmentPageResponse {
  content: Shipment[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const getShipments = async (params?: {
  status?: string;
  driverUserId?: number;
  cargoCategory?: string;
  priority?: string;
  q?: string;
  page?: number;
  size?: number;
}): Promise<ShipmentPageResponse> => {
  const res = await api.get('/shipments', { params });
  if (Array.isArray(res.data)) {
    return {
      content: res.data,
      page: 0,
      size: res.data.length,
      totalElements: res.data.length,
      totalPages: 1,
    };
  }
  return {
    content: res.data?.content || [],
    page: res.data?.number ?? res.data?.page ?? 0,
    size: res.data?.size ?? 20,
    totalElements: res.data?.totalElements ?? (res.data?.content?.length || 0),
    totalPages: res.data?.totalPages ?? 1,
  };
};

export const getShipmentById = async (id: number): Promise<Shipment> => {
  const res = await api.get(`/shipments/${id}`);
  return res.data;
};

export const createShipment = async (data: {
  code?: string;
  cargoCategory: string;
  cargoDescription?: string;
  weightKg: number;
  priority?: string;
  originNodeId: number;
  destinationNodeId: number;
  vehicleId?: number;
  driverUserId?: number;
  plannedEta?: string;
}): Promise<Shipment> => {
  const res = await api.post('/shipments', data);
  return res.data;
};

export const updateShipment = async (id: number, data: Partial<Shipment>): Promise<Shipment> => {
  const res = await api.put(`/shipments/${id}`, data);
  return res.data;
};

export const assignShipment = async (id: number, vehicleId: number, driverUserId: number): Promise<Shipment> => {
  const res = await api.post(`/shipments/${id}/assign`, { vehicleId, driverUserId });
  return res.data;
};

export const unassignShipment = async (id: number): Promise<void> => {
  await api.post(`/dispatch/unassign/${id}`);
};

export const startShipment = async (id: number): Promise<Shipment> => {
  const res = await api.post(`/shipments/${id}/start`);
  return res.data;
};

export const pauseShipment = async (id: number): Promise<Shipment> => {
  const res = await api.post(`/shipments/${id}/pause`);
  return res.data;
};

export const deliverShipment = async (id: number): Promise<Shipment> => {
  const res = await api.post(`/shipments/${id}/deliver`);
  return res.data;
};

export interface RouteProposal {
  id: number;
  shipmentId: number;
  segmentIds: string;
  geometry: string;
  distanceKm: number;
  etaMin: number;
  riskScore: number;
  status: string;
  reason: string;
  createdAt: string;
}

export const cancelShipment = async (id: number): Promise<Shipment> => {
  const res = await api.post(`/shipments/${id}/cancel`);
  return res.data;
};

export const getRouteProposal = async (id: number): Promise<RouteProposal | null> => {
  const res = await api.get(`/shipments/${id}/route-proposal`);
  return res.data || null;
};

export const acceptRouteProposal = async (id: number): Promise<RouteProposal> => {
  const res = await api.post(`/shipments/${id}/route-proposal/accept`);
  return res.data;
};

export const rejectRouteProposal = async (id: number): Promise<RouteProposal> => {
  const res = await api.post(`/shipments/${id}/route-proposal/reject`);
  return res.data;
};
