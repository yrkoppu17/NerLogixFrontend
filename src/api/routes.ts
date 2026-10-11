import api from './axios';

export interface RoutePlanRequest {
  originNodeId: number;
  destinationNodeId: number;
  vehicleType?: 'TRUCK' | 'MEDICAL_VAN' | 'TANKER' | 'MINI_TRUCK';
  priority?: 'NORMAL' | 'HIGH' | 'EMERGENCY';
}

export interface RouteOptionDto {
  optionIndex: number;
  name: string;
  distanceKm: number;
  etaMinutes: number;
  riskScore: number;
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expectedDelayMin: number;
  reason: string;
  geometry: string; // JSON string of [[lat, lng], ...]
  segmentIds: number[];
  segmentNames: string[];
  isEmergencyOptimized: boolean;
  nodeIds?: number[];
  label?: string;
  highlights?: string[];
}

export const planRoutes = async (req: RoutePlanRequest): Promise<RouteOptionDto[]> => {
  const res = await api.post<RouteOptionDto[]>('/routes/plan', req);
  return res.data;
};
