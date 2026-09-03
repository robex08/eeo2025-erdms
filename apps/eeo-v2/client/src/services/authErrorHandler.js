import { loadAuthData } from '../utils/authStorage.js';

const AUTH_ERROR_THROTTLE_MS = 5000;
let lastAuthErrorDispatchAt = 0;

const hasCachedAuthSession = async () => {
  try {
    const [storedToken, storedUser] = await Promise.all([
      loadAuthData.token(),
      loadAuthData.user()
    ]);

    return Boolean(storedToken && storedUser);
  } catch (error) {
    return false;
  }
};

export const dispatchAuthErrorUnlessCached = async (message) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.__erdmsAuthLogoutInProgress) {
    return;
  }

  if (await hasCachedAuthSession()) {
    return;
  }

  const now = Date.now();
  if (now - lastAuthErrorDispatchAt < AUTH_ERROR_THROTTLE_MS) {
    return;
  }

  lastAuthErrorDispatchAt = now;
  window.dispatchEvent(new CustomEvent('authError', {
    detail: { message }
  }));
};