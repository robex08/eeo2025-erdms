/**
 * Asset paths configuration
 * Centralized asset URLs to handle subdirectory deployment
 */

// Get the public URL base path from environment
const PUBLIC_URL = process.env.PUBLIC_URL || '';

/**
 * Asset paths - automatically prefixed with PUBLIC_URL
 */
export const ASSETS = {
  // Company logos
  LOGO_ZZS_MAIN: `${PUBLIC_URL}/logo_zzs_main.png`,
  LOGO_ZZS: `${PUBLIC_URL}/logo-ZZS.png`,
  LOGO_192: `${PUBLIC_URL}/logo192.png`,
  LOGO_512: `${PUBLIC_URL}/logo512.png`,
  
  // Favicons
  FAVICON: `${PUBLIC_URL}/favicon.ico`,
  
  // Helper/UI assets
  HELPER_AVATAR: `${PUBLIC_URL}/assets/helper-avatar.png`,
  BITCOIN_COIN: `${PUBLIC_URL}/assets/bitcoin-coin.svg`,
};

/**
 * Get asset URL with proper base path
 * @param {string} path - Relative path to asset (e.g., '/logo.png' or 'logo.png')
 * @returns {string} Full asset URL with PUBLIC_URL prefix
 */
export const getAssetUrl = (path) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${PUBLIC_URL}/${cleanPath}`;
};

export default ASSETS;
