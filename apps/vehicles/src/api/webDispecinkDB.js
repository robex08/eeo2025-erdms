// Získání měsíčních km vozidla podle carid
export async function fetchVehicleKmMonth(carid) {
  const API_URL = process.env.REACT_APP_APIURL_GET;
  const query = new URLSearchParams({ action: 'dbCarsKmMonth', carid }).toString();
  const url = `${API_URL}?${query}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Chyba při načítání měsíčních km vozidla');
  return response.json();
}

// Získání servisní historie vozidla dle SPZ (z EEO objednávek)
export async function fetchServiceHistory(spz) {
  const API_URL = process.env.REACT_APP_APIURL_GET;
  const query = new URLSearchParams({ action: 'dbServiceHistory', spz }).toString();
  const url = `${API_URL}?${query}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Chyba při načítání servisní historie');
  return response.json();
}

// Získání obecných informací o vozidlech přes POST action wdCarsGeneralInfo
export async function fetchGeneralInfo() {
  return await postWebDispecink('wdCarsGeneralInfo');
}
// Získání pozic vozidla podle carid
export async function fetchVehiclePositions(carid) {
  const API_URL = process.env.REACT_APP_APIURL_GET;
  const query = new URLSearchParams({ action: 'dbCarsPosition', carid }).toString();
  const url = `${API_URL}?${query}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Chyba při načítání pozic vozidla');
  return response.json();
}
// api/vehicles.js
// Základní API klient pro získání dat o vozidlech


const API_URL = process.env.REACT_APP_APIURL_GET;

export async function fetchVehicles(params = {}) {
  // Vždy přidat action=dbCarsListDetail
  const query = new URLSearchParams({ action: 'dbCarsListDetail', ...params }).toString();
  const url = `${API_URL}?${query}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Chyba při načítání dat vozidel');
  return response.json();
}


const API_POST_URL = process.env.REACT_APP_APIURL_POST;

// Univerzální POST dotaz na webDispečink API, ošetření chyb
export async function postWebDispecink(action) {
  try {
    const formData = new FormData();
    formData.append('action', action);
    const response = await fetch(API_POST_URL, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      return { status: 'error', data: [] };
    }
    const json = await response.json();
    return json;
  } catch (e) {
    return { status: 'error', data: [] };
  }
}

// Funkce pro načtení měsíčních km vozidla s možností obnovení dat
export async function fetchVehicleKmMonthWithRefresh(carid, interval) {
  // 1. Zkusit načíst data přes GET
  const API_URL = process.env.REACT_APP_APIURL_GET;
  const API_POST_URL = process.env.REACT_APP_APIURL_POST;
  const query = new URLSearchParams({ action: 'dbCarsKmMonth', carid, interval }).toString();
  const url = `${API_URL}?${query}`;
  let response = await fetch(url);
  if (!response.ok) throw new Error('Chyba při načítání měsíčních km vozidla');
  let json = await response.json();
  if (json.status === 'success' && json.km && json.km.length > 0) {
    return json;
  }
  // 2. Pokud nejsou data, provést POST na vehicle.php
  const formData = new FormData();
  formData.append('action', 'wdCarsIDKmMesic');
  formData.append('id', carid);
  formData.append('interval', interval);
  let postResponse = await fetch(API_POST_URL, {
    method: 'POST',
    body: formData
  });
  if (!postResponse.ok) throw new Error('Chyba při POST refreshi dat vozidla');
  // 3. Znovu zkusit GET
  response = await fetch(url);
  if (!response.ok) throw new Error('Chyba při načítání měsíčních km vozidla po POST refreshi');
  json = await response.json();
  if (json.status === 'success' && json.km && json.km.length > 0) {
    return json;
  }
  // 4. Pokud stále nejsou data, vrátit error
  return { status: 'error', message: 'Zadaná statistická data nejsou dostupná.' };
}

/**
 * Batch načtení KM statistik pro VŠECHNA vozidla (1 request).
 * Vrací objekt { status, km: { [carid]: row } }
 */
export async function fetchAllVehiclesKmMonth() {
  const API_URL = process.env.REACT_APP_APIURL_GET;
  const query = new URLSearchParams({ action: 'dbCarsKmMonthAll' }).toString();
  const url = `${API_URL}?${query}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Chyba při načítání KM statistik');
  return response.json();
}

// Další funkce (např. fetchVehicleById, createVehicle, updateVehicle, deleteVehicle) lze přidat dle potřeby.
