import api from './axios';

export interface DriverCandidate {
  driverUserId: number;
  driverName: string;
  driverEmail: string;
  vehicleId: number;
  vehicleRegNo: string;
  vehicleType: string;
  vehicleCapacityKg: number;
  distanceToOriginKm: number;
  matchScore: number;
  matchReasons: string[];
}

export interface DispatchAssignment {
  id: number;
  shipmentId: number;
  shipmentCode: string;
  cargoCategory?: string;
  cargoDescription?: string;
  weightKg: number;
  originName?: string;
  destinationName?: string;
  driverUserId: number;
  driverName: string;
  vehicleId: number;
  vehicleRegNo: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
  declineReason?: string;
  assignedAt: string;
  respondedAt?: string;
}

export interface DispatchBoardData {
  unassignedShipments: any[];
  pendingAssignments: DispatchAssignment[];
  recentAccepted: DispatchAssignment[];
}

export interface DriverListItem {
  id: number;
  name: string;
  email: string;
  active: boolean;
  vehicleRegNos: string[];
  vehicleType?: string;
  vehicleCapacityKg?: number;
  currentJob?: string;
}

export const getDispatchCandidates = async (shipmentId: number): Promise<DriverCandidate[]> => {
  const res = await api.get('/dispatch/candidates', { params: { shipmentId } });
  return res.data;
};

export const getDrivers = async (q?: string): Promise<DriverListItem[]> => {
  const res = await api.get('/dispatch/drivers', { params: q ? { q } : undefined });
  return res.data;
};

export const assignShipment = async (data: {
  shipmentId: number;
  driverUserId: number;
  vehicleId: number;
}): Promise<DispatchAssignment> => {
  const res = await api.post('/dispatch/assign', data);
  return res.data;
};

export const unassignShipment = async (shipmentId: number): Promise<void> => {
  await api.post(`/dispatch/unassign/${shipmentId}`);
};

export const acceptAssignment = async (id: number): Promise<DispatchAssignment> => {
  const res = await api.post(`/dispatch/accept/${id}`);
  return res.data;
};

export const declineAssignment = async (id: number, reason?: string): Promise<DispatchAssignment> => {
  const res = await api.post(`/dispatch/decline/${id}`, { reason });
  return res.data;
};

export const getPendingAssignments = async (): Promise<DispatchAssignment[]> => {
  const res = await api.get('/dispatch/pending');
  return res.data;
};

export const getDispatchBoard = async (): Promise<DispatchBoardData> => {
  const res = await api.get('/dispatch/board');
  return res.data;
};

