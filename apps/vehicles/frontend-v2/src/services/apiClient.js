import axios from 'axios';

const baseURL = import.meta.env.VITE_API_V2_BASE_URL || '/dev/api.vehicles/vehicle/v2.0';

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
});

const FULL_SYNC_TIMEOUT_MS = 240000;
const QUICK_SYNC_TIMEOUT_MS = 120000;

function resolveLegacyGetUrl() {
  const explicit = String(import.meta.env.VITE_API_LEGACY_GET_URL || '').trim();
  if (explicit !== '') {
    return explicit;
  }

  const fromV2Base = String(baseURL || '').replace(/\/?v2\.0\/?$/, '/api.php');
  if (fromV2Base !== String(baseURL || '')) {
    return fromV2Base;
  }

  return null;
}

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

export async function changePassword(payload) {
  const response = await apiClient.post('/auth/change-password', payload);
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

export async function fetchUsers() {
  const response = await apiClient.get('/users');
  return response.data;
}

export async function fetchUsersVehiclesCatalog() {
  const response = await apiClient.get('/users/vehicles-catalog');
  return response.data;
}

export async function fetchUserVehicleAssignments(userId) {
  const response = await apiClient.get('/users/vehicle-assignments', {
    params: { userId },
  });
  return response.data;
}

export async function createUser(payload) {
  const response = await apiClient.post('/users/create', payload);
  return response.data;
}

export async function updateUser(payload) {
  const response = await apiClient.post('/users/update', payload);
  return response.data;
}

export async function deleteUser(payload) {
  const response = await apiClient.post('/users/delete', payload);
  return response.data;
}

export async function fetchVehicleServiceHistory(spz) {
  const cleanSpz = String(spz || '').trim();
  if (cleanSpz === '') {
    return { status: 'success', orders: [] };
  }

  const legacyGetUrl = resolveLegacyGetUrl();
  if (!legacyGetUrl) {
    throw new Error('Není nastaven endpoint pro servisní historii.');
  }

  const query = new URLSearchParams({ action: 'dbServiceHistory', spz: cleanSpz }).toString();
  const response = await axios.get(`${legacyGetUrl}?${query}`, {
    timeout: 30000,
    withCredentials: true,
  });
  return response.data;
}

export async function fetchStationAddresses() {
  const response = await apiClient.get('/stations/addresses');
  return response.data;
}

export async function fetchWebdispecinkLocations() {
  const response = await apiClient.get('/stations/webdispecink-locations');
  return response.data;
}

export async function fetchVsStationsMap() {
  const response = await apiClient.get('/stations/map-vs');
  return response.data;
}

export async function upsertStationAddressFromWebdispecink(payload) {
  const response = await apiClient.post('/stations/addresses/from-webdispecink', payload);
  return response.data;
}

export async function updateStationAddress(payload) {
  const response = await apiClient.post('/stations/addresses/update', payload);
  return response.data;
}

export async function createStationAddress(payload) {
  const response = await apiClient.post('/stations/addresses/create', payload);
  return response.data;
}

export async function deleteStationAddress(payload) {
  const response = await apiClient.post('/stations/addresses/delete', payload);
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
  const response = await apiClient.post('/sync/vehicles', {}, { timeout: FULL_SYNC_TIMEOUT_MS });
  return response.data;
}

export async function triggerQuickSync() {
  const response = await apiClient.post('/sync/vehicles/quick', {}, { timeout: QUICK_SYNC_TIMEOUT_MS });
  return response.data;
}

export async function fetchDashboardMetrics(params = {}) {
  const response = await apiClient.get('/dashboard/metrics', { params });
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
