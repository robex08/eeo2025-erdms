/**
 * Debug utility pro testování logout toast notifikací
 * Používá se pouze pro development testing
 */

import { showLogoutToast, LOGOUT_REASONS } from './logoutNotifications.js';

// Test všech typů logout notifikací
export const testAllLogoutToasts = (showToast) => {
  if (!showToast) {
    return;
  }


  const reasons = Object.values(LOGOUT_REASONS);
  let delay = 0;

  reasons.forEach((reason, index) => {
    setTimeout(() => {
      showLogoutToast(showToast, reason, {
        details: `Test ${index + 1}/${reasons.length}: ${reason.code}`
      });
    }, delay);

    // Postupné zobrazení s delay
    delay += reason.duration + 500;
  });

  return delay;
};

// Test konkrétního typu
export const testLogoutToast = (showToast, reasonCode = 'USER_MANUAL', details = null) => {
  if (!showToast) {
    return;
  }

  const reason = LOGOUT_REASONS[reasonCode];
  if (!reason) {
    return;
  }

  showLogoutToast(showToast, reason, details ? { details } : null);
};

// Export pro browser console
if (typeof window !== 'undefined') {
  window.debugLogoutToasts = {
    testAll: (showToast) => testAllLogoutToasts(showToast),
    test: (showToast, reason, details) => testLogoutToast(showToast, reason, details),
    reasons: LOGOUT_REASONS
  };

}