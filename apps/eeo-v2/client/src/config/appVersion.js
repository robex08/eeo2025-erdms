export const APP_VERSION = process.env.REACT_APP_VERSION || 'unknown';

export const APP_VERSION_SHORT = APP_VERSION.match(/(\d+\.\d+[a-z]?)/)?.[1] || APP_VERSION;

export const APP_BUILD_FLAVOR = APP_VERSION.includes('-DEV') ? 'DEV' : 'PROD';