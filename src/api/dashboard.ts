import api from './axios';

export interface DashboardSummary {
  totalDistricts: number;
  degradedOrInaccessibleDistricts: number;
  activeVehicles: number;
  activeShipments: number;
  pendingFieldReports: number;
  criticalAlerts: number;
  supplyGaps: number;
  emergencyMode: boolean;
}

export interface DistrictConnectivity {
  id: number;
  name: string;
  state: string;
  connectivityScore: number;
  category: 'GOOD' | 'DEGRADED' | 'POOR' | 'INACCESSIBLE';
}

export interface SupplyItem {
  id: number;
  districtName: string;
  state: string;
  category: string;
  stockUnits: number;
  dailyDemandUnits: number;
  daysOfCover: number;
  isSupplyGap: boolean;
}

export interface AnalyticsCharts {
  roadStatusBreakdown: Array<{ name: string; value: number }>;
  incidentsByType: Array<{ type: string; count: number }>;
  cargoCategoryDistribution: Array<{ category: string; count: number }>;
}

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await api.get('/dashboard/summary');
  return res.data;
};

export const getDistrictConnectivityList = async (): Promise<DistrictConnectivity[]> => {
  const res = await api.get('/dashboard/districts');
  return res.data;
};

export const getSupplyStatus = async (): Promise<SupplyItem[]> => {
  const res = await api.get('/dashboard/supply');
  return res.data;
};

export const getAnalyticsCharts = async (): Promise<AnalyticsCharts> => {
  const res = await api.get('/analytics/charts');
  return res.data;
};
