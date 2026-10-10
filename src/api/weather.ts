import api from './axios';

export interface DistrictWeatherDto {
  districtId: number;
  districtName: string;
  state: string;
  condition: 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME';
  rainMm: number | null;
  note: string | null;
  source: 'MANUAL' | 'OPEN_METEO' | 'SEED';
  loggedAt: string;
}

export interface WeatherLogRequest {
  districtId: number;
  condition: 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME';
  rainMm?: number;
  note?: string;
}

export interface DemoRainRequest {
  districtId: number;
  condition: 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME';
}

export const getDistrictWeatherList = async (): Promise<DistrictWeatherDto[]> => {
  const res = await api.get<DistrictWeatherDto[]>('/weather/districts');
  return res.data;
};

export const logWeather = async (data: WeatherLogRequest): Promise<DistrictWeatherDto> => {
  const res = await api.post<DistrictWeatherDto>('/weather/logs', data);
  return res.data;
};

export const triggerDemoRain = async (data: DemoRainRequest): Promise<DistrictWeatherDto> => {
  const res = await api.post<DistrictWeatherDto>('/admin/demo/rain', data);
  return res.data;
};
