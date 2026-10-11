import api from './axios';

export interface UserItem {
  id: number;
  email: string;
  name: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  language: string;
  active: boolean;
  createdAt: string;
  vehicleRegNos?: string[];
}

export interface UserPageResponse {
  content: UserItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditLogItem {
  id: number;
  userEmail?: string;
  action: string;
  targetType?: string;
  targetId?: number;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface AuditLogPageResponse {
  content: AuditLogItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface RuleConfigItem {
  id: number;
  configKey: string;
  configValue: string;
  description: string;
}

export interface ApiKeyItem {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export const getUsers = async (params?: { page?: number; size?: number }): Promise<UserPageResponse> => {
  const res = await api.get('/admin/users', { params });
  return res.data;
};

export const updateUserRole = async (userId: number, role: string): Promise<UserItem> => {
  const res = await api.patch(`/admin/users/${userId}/role`, { role });
  return res.data;
};

export const updateUserActive = async (userId: number, active: boolean): Promise<UserItem> => {
  const res = await api.patch(`/admin/users/${userId}/active`, { active });
  return res.data;
};

export const resetUserPassword = async (userId: number, password: string): Promise<void> => {
  await api.post(`/admin/users/${userId}/reset-password`, { password });
};

export const getAuditLogs = async (params?: { page?: number; size?: number }): Promise<AuditLogPageResponse> => {
  const res = await api.get('/admin/audit', { params });
  return res.data;
};

export const getRuleConfigs = async (): Promise<RuleConfigItem[]> => {
  const res = await api.get('/admin/rules');
  return res.data;
};

export const updateRuleConfig = async (key: string, value: string): Promise<RuleConfigItem> => {
  const res = await api.patch(`/admin/rules/${key}`, { value });
  return res.data;
};

export const getApiKeys = async (): Promise<ApiKeyItem[]> => {
  const res = await api.get('/admin/api-keys');
  return res.data;
};

export const createApiKey = async (name: string): Promise<{ name: string; apiKey: string }> => {
  const res = await api.post('/admin/api-keys', { name });
  return res.data;
};

export const deleteApiKey = async (id: number): Promise<void> => {
  await api.delete(`/admin/api-keys/${id}`);
};

export const triggerDemoRain = async (districtId: number, condition: string): Promise<void> => {
  await api.post('/admin/demo/rain', { districtId, condition });
};

export const resetDemoData = async (): Promise<void> => {
  await api.post('/admin/demo/reset');
};
