import axios from 'axios';

const baseURL = import.meta.env.VITE_API_V2_BASE_URL || '/dev/api.vehicles/vehicle/v2.0';

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
});

export async function fetchHealth() {
  const response = await apiClient.get('/health');
  return response.data;
}

export async function loginLocal(payload) {
  const response = await apiClient.post('/auth/login-local', payload);
  return response.data;
}

export async function fetchEntraLoginUrl(redirectUrl) {
  const response = await apiClient.get('/auth/entra-login-url', {
    params: { redirect: redirectUrl },
  });
  return response.data;
}

export async function loginEntra() {
  const response = await apiClient.post('/auth/login-entra');
  return response.data;
}

export async function fetchMe() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}

export async function logout() {
  const response = await apiClient.post('/auth/logout');
  return response.data;
}

export async function fetchVehicles(params = {}) {
  const response = await apiClient.get('/vehicles', { params });
  return response.data;
}

export async function fetchVehicleDetail(vehicleId) {
  const response = await apiClient.get('/vehicles/detail', {
    params: { vehicleId },
  });
  return response.data;
}

export async function saveVehicleDetail(payload) {
  const response = await apiClient.post('/vehicles/detail', payload);
  return response.data;
}

export async function triggerSync() {
  const response = await apiClient.post('/sync/vehicles');
  return response.data;
}

export async function fetchDashboardMetrics() {
  const response = await apiClient.get('/dashboard/metrics');
  return response.data;
}

export async function fetchFleetForecast(params = {}) {
  const response = await apiClient.get('/dashboard/fleet-forecast', { params });
  return response.data;
}

export async function refreshFleetForecast(months) {
  const response = await apiClient.post('/dashboard/fleet-forecast/refresh', { months });
  return response.data;
}
