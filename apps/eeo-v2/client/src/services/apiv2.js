import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const DB_ORDER_KEY = process.env.REACT_APP_DB_ORDER_KEY; // Ensure DB_ORDER_KEY is from .env
const DB_ATTACHMENT_KEY = process.env.REACT_APP_DB_ATTACHMENT_KEY; // Ensure DB_ATTACHMENT_KEY is from .env

let apiDebugEnabled = false; // řízeno z UI (ADMIN)
export function setApiDebugEnabled(v){ apiDebugEnabled = !!v; }

const api = axios.create({
  baseURL: `${API_BASE_URL}/query`, // Use the correct base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach interceptors for debugging (request / response / error)
api.interceptors.request.use((config) => {
  try {
    config.metadata = { start: Date.now() };
    if (apiDebugEnabled && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apiDebug', {
        detail: {
          phase: 'request',
            url: (config.baseURL || '') + (config.url || ''),
            method: (config.method || 'post').toUpperCase(),
            data: safeParse(config.data),
            ts: Date.now(),
        }
      }));
    }
  } catch {}
  return config;
});

api.interceptors.response.use((response) => {
  try {
    const start = response.config?.metadata?.start;
    if (apiDebugEnabled && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apiDebug', {
        detail: {
          phase: 'response',
          url: (response.config.baseURL || '') + (response.config.url || ''),
          method: (response.config.method || 'post').toUpperCase(),
          status: response.status,
          duration: start ? (Date.now() - start) : undefined,
          data: response.data,
          ts: Date.now(),
        }
      }));
    }
  } catch {}
  return response;
}, (error) => {
  try {
    const resp = error.response;
    const start = resp?.config?.metadata?.start;
    if (apiDebugEnabled && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apiDebug', {
        detail: {
          phase: 'error',
          url: (resp?.config?.baseURL || '') + (resp?.config?.url || ''),
          method: (resp?.config?.method || 'post').toUpperCase(),
          status: resp?.status,
          duration: start ? (Date.now() - start) : undefined,
          error: error.message,
          data: resp?.data,
          ts: Date.now(),
        }
      }));
    }
  } catch {}
  return Promise.reject(error);
});

function safeParse(data) {
  if (!data) return data;
  try {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return data;
  } catch { return data; }
}

// Clear memory cache
export function clearMemoryCache() {
  try {
    localStorage.clear(); // Clear all localStorage data
  } catch (error) {
  }
}

// Login method
export async function login({ username, password }) {
  const payload = {
    query: 'login-user', // Include the query parameter
    username,
    password
  };

  try {
    const response = await api.post('/', payload); // Send JSON payload

    if (response.status === 200 && response.data.success === 'Login successful' && response.data.token) {
      return response.data; // Return user data and token
    } else {
      throw new Error(response.data.message || 'Špatné kredentialy!'); // Handle error
    }
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Nesprávné přihlašovací údaje!'); // Handle error
  }
}

// Fetch orders filtered by year range
export async function getOrders({ query, yearFrom, yearTo, token }) {
  if (!token) {
    throw new Error('Authentication token is missing. Please log in again.');
  }

  const payload = {
    query: query || 'react-get-year-orders',
    yearFrom,
    yearTo,
    dborders: DB_ORDER_KEY, // Use DB_ORDER_KEY from .env
    dbattach: DB_ATTACHMENT_KEY, // Use DB_ATTACHMENT_KEY from .env
    token,
  };

  try {
    const response = await api.post('/', payload);

    if (response.status === 200 && response.data && Array.isArray(response.data[0])) {
      return response.data[0];
    } else {
      throw new Error('Invalid response format: Expected an array under key `0`');
    }
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch order details by ID
export async function getOrderById({ id, token, query = 'react-order-id' }) {
  const payload = { query, id, dborders: DB_ORDER_KEY, dbattach: DB_ATTACHMENT_KEY, token };
  try {
    const response = await api.post('/', payload);
    if (response.status === 200 && response.data[0]) {
      return response.data[0];
    }
    throw new Error('Invalid response format or no data received');
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch order detail using 'order/detail' query which expects { token, username, orderId }
// (Removed experimental getOrderDetail for new API2 — handled now in api2auth.js)

// Unified function to fetch attachments by order ID
export async function getAttachments({ id, token }) {
  const payload = {
    query: 'react-attachment-id',
    id,
    dborders: DB_ORDER_KEY, // Use DB_ORDER_KEY from .env
    dbattach: DB_ATTACHMENT_KEY, // Use DB_ATTACHMENT_KEY from .env
    token,
  };

  try {
    const response = await api.post('/', payload);

    if (response.status === 200 && response.data && Array.isArray(response.data[0])) {
      return response.data[0];
    } else {
      throw new Error('Invalid response format or no data received for attachments');
    }
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch all Garants
export async function getGarants({ token }) {
  const payload = {
    query: 'react-all-garants', // Query for fetching garants
    token, // Include the token for authentication
  };

  try {
    const response = await api.post('/', payload); // Send JSON payload
    if (response.status === 200 && response.data && Array.isArray(response.data[0])) {
      return response.data[0]; // Return the list of garants
    } else {
      throw new Error('Invalid response format or no data received for garants');
    }
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch all Limited Promises
export async function getLimitedPromises({ token }) {
  const payload = {
    query: 'react-all-lps', // Query for fetching limited promises
    token, // Include the token for authentication
  };

  try {
    const response = await api.post('/', payload); // Send JSON payload

    if (response.status === 200 && response.data && Array.isArray(response.data[0])) {
      return response.data[0]; // Return the list of limited promises
    } else {
      throw new Error('Invalid response format or no data received for limited promises');
    }
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch all Types
export async function getOrderTypes({ token }) {
  const payload = {
    query: 'react-all-types', // Query for fetching types
    token,
  };

  try {
    const response = await api.post('/', payload); // Send JSON payload
    if (response.status === 200 && response.data && Array.isArray(response.data[0])) {
      return response.data[0]; // Return the list of types
    } else {
      throw new Error('Invalid response format or no data received for types');
    }
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch all Locations
export async function getLocations({ token }) {
  const payload = {
    query: 'react-all-stanoviste', // Query for fetching locations
    token, // Include the token for authentication
  };

  try {
    const response = await api.post('/', payload); // Send JSON payload

    if (response.status === 200 && response.data && Array.isArray(response.data[0])) {
      return response.data[0].map((location) => ({
        id: location.id,               // Ensure correct mapping
        house_nr: location.house_nr,   // Ensure correct mapping
        name: location.name,           // Ensure correct mapping
        description: location.description || '', // Ensure correct mapping with fallback
      })); // Return the list of locations
    } else {
      throw new Error('Invalid response format or no data received for locations');
    }
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch all Countries
export async function getCountries({ token }) {
  const payload = {
    query: 'react-all-okres', // Query for fetching countries
    token, // Include the token for authentication
  };

  try {
    const response = await api.post('/', payload); // Send JSON payload

    if (response.status === 200 && response.data && Array.isArray(response.data[0])) {
      return response.data[0]; // Return the list of countries
    } else {
      throw new Error('Invalid response format or no data received for countries');
    }
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch all Positions
export async function getPositions({ token }) {
  const payload = {
    query: 'react-all-umisteni', // Query for fetching positions
    token, // Include the token for authentication
  };

  try {
    const response = await api.post('/', payload); // Send JSON payload

    if (response.status === 200 && response.data && Array.isArray(response.data[0])) {
      return response.data[0]; // Return the list of positions
    } else {
      throw new Error('Invalid response format or no data received for positions');
    }
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch all Partners
export async function getPartners({ token }) {
  const payload = {
    query: 'react-all-partners', // Query for fetching partners
    token, // Include the token for authentication
  };

  try {
    const response = await api.post('/', payload); // Send JSON payload

    if (response.status === 200 && response.data && Array.isArray(response.data[0])) {
      return response.data[0]; // Return the list of partners
    } else {
      throw new Error('Invalid response format or no data received for partners');
    }
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch all Users
export async function getUsers({ token }) {
  const payload = {
    query: 'react-all-users', // Query for fetching users
    token, // Include the token for authentication
  };

  try {
    const response = await api.post('/', payload); // Send JSON payload

    if (response.status === 200 && response.data) {
      // Zkus různé formáty odpovědi
      if (Array.isArray(response.data[0])) {
        return response.data[0];
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        return response.data.users;
      } else {
        throw new Error('Invalid response format or no data received for users');
      }
    } else {
      throw new Error('Invalid response format or no data received for users');
    }
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

// Fetch user information by ID
export async function getUserInfo({ query, id, token }) {
  const payload = {
    query: 'react-user-info', // Query for fetching user info
    id,    // User ID
    token, // Include the token for authentication
  };

  try {
    const response = await api.post('/', payload); // Send JSON payload

    if (response.status === 200 && response.data && Array.isArray(response.data[0])) {
    // console.log('User info response:', response.data[0]); // Debug log for user info response
      return response.data[0][0]; // Return the first user object from the array
    } else {
      throw new Error('Invalid response format or no data received for user info');
    }
  } catch (error) {
  throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

/**
 * Update an order by ID using the POST method.
 * @param {Object} payload - The payload containing the order data.
 * @param {string} token - The authentication token.
 * @returns {Object} - The response from the API.
 */
export async function updateOrder({ payload, token }) {
  if (!token) {
    throw new Error('Authentication token is missing. Please log in again.');
  }

  const requestPayload = {
    query: 'react-update-order-id', // Query for updating the order
    ...payload, // Include the formatted payload
    token, // Include the authentication token
  };

  try {
    const response = await api.put('/', requestPayload); // Use POST method

    if (response.status === 200 && response.data.success) {
      return response.data; // Return the success response
    } else {
      throw new Error(response.data.message || 'Chyba na serveru. Zkuste to prosím později.');
    }
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}