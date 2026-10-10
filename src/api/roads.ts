import api from './axios';

export interface RoadSegmentDto {
  id: number;
  name: string;
  highwayCode: string;
  assetType: 'ROAD' | 'BRIDGE' | 'PASS';
  lengthKm: number;
  baseSpeedKmph: number;
  terrainClass: number;
  landslideProne: boolean;
  floodProne: boolean;
  status: 'OPEN' | 'RESTRICTED' | 'BLOCKED';
  riskScore: number;
  statusReason: string | null;
  polyline: string | null;
  fromNodeName: string;
  toNodeName: string;
  state: string;
  updatedAt: string;
}

export interface RiskFactorDto {
  label: string;
  points: number;
}

export interface RoadStatusHistoryDto {
  id: number;
  segmentId: number;
  oldStatus: 'OPEN' | 'RESTRICTED' | 'BLOCKED';
  newStatus: 'OPEN' | 'RESTRICTED' | 'BLOCKED';
  reason: string;
  changedByName: string;
  changedAt: string;
}

export interface RoadSegmentDetailDto extends RoadSegmentDto {
  fromNodeId: number;
  fromLat: number;
  fromLng: number;
  toNodeId: number;
  toLat: number;
  toLng: number;
  riskFactors: RiskFactorDto[];
  history: RoadStatusHistoryDto[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface RoadParams {
  status?: string;
  state?: string;
  assetType?: string;
  risk?: string;
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const getRoads = async (params: RoadParams = {}): Promise<PageResponse<RoadSegmentDto>> => {
  const cleaned: Record<string, unknown> = {};
  if (params.status) cleaned.status = params.status;
  if (params.state) cleaned.state = params.state;
  if (params.assetType) cleaned.assetType = params.assetType;
  if (params.risk) cleaned.risk = params.risk;
  if (params.q && params.q.trim()) cleaned.q = params.q.trim();
  cleaned.page = params.page ?? 0;
  cleaned.size = params.size ?? 20;
  if (params.sort) cleaned.sort = params.sort;

  const res = await api.get<PageResponse<RoadSegmentDto>>('/roads', { params: cleaned });
  return res.data;
};

export const getRoadDetail = async (id: number): Promise<RoadSegmentDetailDto> => {
  const res = await api.get<RoadSegmentDetailDto>(`/roads/${id}`);
  return res.data;
};

export const updateRoadStatus = async (
  id: number,
  data: { status: 'OPEN' | 'RESTRICTED' | 'BLOCKED'; reason: string }
): Promise<RoadSegmentDto> => {
  const res = await api.patch<RoadSegmentDto>(`/roads/${id}/status`, data);
  return res.data;
};
