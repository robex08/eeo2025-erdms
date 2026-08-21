import axios from 'axios';

const baseURL = import.meta.env.VITE_API_V2_BASE_URL || '/dev/api.vehicles/vehicle/v2.0';

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
});

const FULL_SYNC_TIMEOUT_MS = 240000;
const QUICK_SYNC_TIMEOUT_MS = 120000;

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

export async function fetchDrivers(params = {}) {
  const response = await apiClient.get('/drivers', { params });
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

export async function fetchStationAddresses() {
  const response = await apiClient.get('/stations/addresses');
  return response.data;
}

export async function fetchWebdispecinkLocations() {
  const response = await apiClient.get('/stations/webdispecink-locations');
  return response.data;
}

export async function fetchLookupItems(params = {}) {
  const response = await apiClient.get('/lookups', { params });
  return response.data;
}

export async function saveLookupItem(payload) {
  const response = await apiClient.post('/lookups/save', payload);
  return response.data;
}

export async function deactivateLookupItem(category, code) {
  const response = await apiClient.post('/lookups/deactivate', { category, code });
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

export async function fetchVehicleManualEvents(vehicleId, params = {}) {
  const response = await apiClient.get('/vehicles/events', {
    params: { vehicleId, ...params },
  });
  return response.data;
}

export async function fetchVehicleCardHistory(vehicleId, params = {}) {
  const response = await apiClient.get('/vehicles/card-history', {
    params: { vehicleId, ...params },
  });
  return response.data;
}

export async function fetchVehicleAttachments(vehicleId, params = {}) {
  const response = await apiClient.get('/vehicles/attachments', {
    params: { vehicleId, ...params },
  });
  return response.data;
}

export async function fetchVehicleServiceRecords(vehicleId, params = {}) {
  const response = await apiClient.get('/vehicles/service-records', {
    params: { vehicleId, ...params },
  });
  return response.data;
}

export async function createVehicleServiceRecord(payload) {
  const response = await apiClient.post('/vehicles/service-records', payload);
  return response.data;
}

export async function updateVehicleServiceRecord(payload) {
  const response = await apiClient.post('/vehicles/service-records/update', payload);
  return response.data;
}

export async function deleteVehicleServiceRecord(id) {
  const response = await apiClient.post('/vehicles/service-records/delete', { id });
  return response.data;
}

export async function fetchVehicleEquipment(vehicleId) {
  const response = await apiClient.get('/vehicles/equipment', { params: { vehicleId } });
  return response.data;
}

export async function createVehicleEquipment(payload) {
  const response = await apiClient.post('/vehicles/equipment', payload);
  return response.data;
}

export async function updateVehicleEquipment(payload) {
  const response = await apiClient.post('/vehicles/equipment/update', payload);
  return response.data;
}

export async function deleteVehicleEquipment(id) {
  const response = await apiClient.post('/vehicles/equipment/delete', { id });
  return response.data;
}

export async function fetchVehicleInsurancePolicies(vehicleId) {
  const response = await apiClient.get('/vehicles/insurance-policies', { params: { vehicleId } });
  return response.data;
}

export async function createVehicleInsurancePolicy(payload) {
  const response = await apiClient.post('/vehicles/insurance-policies', payload);
  return response.data;
}

export async function updateVehicleInsurancePolicy(payload) {
  const response = await apiClient.post('/vehicles/insurance-policies/update', payload);
  return response.data;
}

export async function deleteVehicleInsurancePolicy(id) {
  const response = await apiClient.post('/vehicles/insurance-policies/delete', { id });
  return response.data;
}

export async function fetchVehicleClaims(vehicleId) {
  const response = await apiClient.get('/vehicles/claims', { params: { vehicleId } });
  return response.data;
}

export async function createVehicleClaim(payload) {
  const response = await apiClient.post('/vehicles/claims', payload);
  return response.data;
}

export async function updateVehicleClaim(payload) {
  const response = await apiClient.post('/vehicles/claims/update', payload);
  return response.data;
}

export async function deleteVehicleClaim(id) {
  const response = await apiClient.post('/vehicles/claims/delete', { id });
  return response.data;
}

export async function fetchVehicleTires(vehicleId) {
  const response = await apiClient.get('/vehicles/tires', { params: { vehicleId } });
  return response.data;
}

export async function createVehicleTires(payload) {
  const response = await apiClient.post('/vehicles/tires', payload);
  return response.data;
}

export async function updateVehicleTires(payload) {
  const response = await apiClient.post('/vehicles/tires/update', payload);
  return response.data;
}

export async function deleteVehicleTires(id) {
  const response = await apiClient.post('/vehicles/tires/delete', { id });
  return response.data;
}

export async function fetchVehicleFunding(vehicleId) {
  const response = await apiClient.get('/vehicles/funding', { params: { vehicleId } });
  return response.data;
}

export async function createVehicleFunding(payload) {
  const response = await apiClient.post('/vehicles/funding', payload);
  return response.data;
}

export async function updateVehicleFunding(payload) {
  const response = await apiClient.post('/vehicles/funding/update', payload);
  return response.data;
}

export async function deleteVehicleFunding(id) {
  const response = await apiClient.post('/vehicles/funding/delete', { id });
  return response.data;
}

export async function uploadVehicleAttachment(formData) {
  const response = await apiClient.post('/vehicles/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteVehicleAttachment(id) {
  const response = await apiClient.post('/vehicles/attachments/delete', { id });
  return response.data;
}

export async function downloadVehicleAttachment(id) {
  const response = await apiClient.get('/vehicles/attachments/download', {
    params: { id },
    responseType: 'blob',
  });
  return response;
}

export async function fetchVehicleMonthlyBilling(vehicleId, params = {}) {
  const response = await apiClient.get('/vehicles/billing/monthly', {
    params: { vehicleId, ...params },
  });
  return response.data;
}

export async function saveVehicleDetail(payload) {
  const response = await apiClient.post('/vehicles/detail', payload);
  return response.data;
}

export async function bulkUpdateVehicleLocationState(payload) {
  const response = await apiClient.post('/vehicles/bulk/location-state', payload);
  return response.data;
}

export async function bulkUpdateVehicleStatus(payload) {
  const response = await apiClient.post('/vehicles/bulk/status', payload);
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

export async function triggerDriversQuickSync() {
  const response = await apiClient.post('/sync/drivers/quick', {}, { timeout: QUICK_SYNC_TIMEOUT_MS });
  return response.data;
}

export async function syncDriversKm(year, month) {
  const response = await apiClient.post('/drivers/sync-km', { year, month }, { timeout: 60000 });
  return response.data;
}

export async function syncDriversKmForVehicle(vehicleId, year, month) {
  const response = await apiClient.post('/drivers/sync-km-vehicle', { vehicleId, year, month }, { timeout: 30000 });
  return response.data;
}

export async function fetchVehiclesForDriversSync(year, month, force = false) {
  const response = await apiClient.get('/drivers/vehicles-for-sync', {
    params: { year, month, force: force ? '1' : '0' },
  });
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
