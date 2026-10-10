import api from './axios';

export interface MapSegmentDto {
  id: number;
  name: string;
  highwayCode: string;
  assetType: 'ROAD' | 'BRIDGE' | 'PASS';
  status: 'OPEN' | 'RESTRICTED' | 'BLOCKED';
  riskScore: number;
  terrainClass: number;
  landslideProne: boolean;
  floodProne: boolean;
  statusReason: string | null;
  polyline: string | null;
  fromNodeId: number;
  fromNodeName: string;
  fromLat: number;
  fromLng: number;
  toNodeId: number;
  toNodeName: string;
  toLat: number;
  toLng: number;
}

export interface MapVehicleDto {
  id: number;
  regNo: string;
  type: 'TRUCK' | 'MEDICAL_VAN' | 'TANKER' | 'MINI_TRUCK';
  status: 'IDLE' | 'ON_TRIP' | 'MAINTENANCE';
  lat: number;
  lng: number;
  heading: number;
  speedKmph: number;
  driverName?: string;
  currentShipmentId?: number;
  currentShipmentCode?: string;
}

export interface MapIncidentDto {
  id: number;
  type: 'LANDSLIDE' | 'FLOOD' | 'ROAD_DAMAGE' | 'BRIDGE_DAMAGE' | 'CONGESTION' | 'ACCIDENT' | 'OTHER';
  severity: number;
  lat: number;
  lng: number;
  segmentId?: number;
  districtId?: number;
  description: string;
  status: 'REPORTED' | 'VERIFIED' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
}

export interface MapDistrictDto {
  id: number;
  name: string;
  state: string;
  lat: number;
  lng: number;
  populationBand: string;
  connectivityScore: number;
  status: 'GOOD' | 'DEGRADED' | 'POOR' | 'INACCESSIBLE';
}

export interface RoadNodeDto {
  id: number;
  name: string;
  lat: number;
  lng: number;
  districtId?: number;
  districtName?: string;
  kind: 'CITY' | 'JUNCTION' | 'DEPOT' | 'HOSPITAL';
}

export interface MapWeatherDto {
  districtId: number;
  districtName: string;
  condition: 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME';
  rainMm: number | null;
  note: string | null;
  source: 'MANUAL' | 'OPEN_METEO' | 'SEED';
  loggedAt: string;
}

export const getMapSegments = async (): Promise<MapSegmentDto[]> => {
  const res = await api.get<MapSegmentDto[]>('/map/segments');
  return res.data;
};

export const getMapVehicles = async (): Promise<MapVehicleDto[]> => {
  const res = await api.get<MapVehicleDto[]>('/map/vehicles');
  return res.data;
};

export const getMapIncidents = async (): Promise<MapIncidentDto[]> => {
  const res = await api.get<MapIncidentDto[]>('/map/incidents');
  return res.data;
};

export const getMapDistricts = async (): Promise<MapDistrictDto[]> => {
  const res = await api.get<MapDistrictDto[]>('/map/districts');
  return res.data;
};

export const getMapLocations = async (): Promise<RoadNodeDto[]> => {
  const res = await api.get<RoadNodeDto[]>('/map/locations');
  return res.data;
};

export const getMapWeather = async (): Promise<MapWeatherDto[]> => {
  const res = await api.get<MapWeatherDto[]>('/map/weather');
  return res.data;
};
