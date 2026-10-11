export interface VehiclePositionUpdate {
  vehicleId: number;
  regNo: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmph?: number;
  progressPct?: number;
  shipmentId?: number;
}

export interface ShipmentEventData {
  id: number;
  status?: string;
  code?: string;
  driverUserId?: number;
  vehicleId?: number;
  reason?: string;
}

export interface IncidentEventData {
  id: number;
  title?: string;
  severity?: string;
  status?: string;
}

export interface AlertEventData {
  id: number;
  message?: string;
  severity?: string;
}

export interface DispatchEventData {
  shipmentId: number;
  driverUserId: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  reason?: string;
}

export type RealtimeEventName =
  | 'connected'
  | 'ping'
  | 'vehicles.positions'
  | 'vehicle.update'
  | 'shipment.created'
  | 'shipment.updated'
  | 'shipment.assigned'
  | 'dispatch.assigned'
  | 'dispatch.accepted'
  | 'dispatch.declined'
  | 'incident.created'
  | 'incident.updated'
  | 'alert.created'
  | 'weather.updated';
