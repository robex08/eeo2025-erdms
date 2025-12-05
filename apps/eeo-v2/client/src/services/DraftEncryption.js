/**
 * 🔧 ENCRYPTION KEY PERSISTENCE FIX
 *
 * Řeší problém s encryption key rotation při logout
 * Zajišťuje že drafty zůstanou čitelné i po logout/login
 */

const DRAFT_ENCRYPTION_KEY = 'draft_encryption_seed_persistent';

/**
 * Získá persistentní encryption seed pro drafty
 */
export const getDraftEncryptionSeed = () => {
  let seed = localStorage.getItem(DRAFT_ENCRYPTION_KEY);

  if (!seed) {
    // Vytvoř nový persistentní seed
    seed = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(DRAFT_ENCRYPTION_KEY, seed);
    // console.log('🔑 [DraftEncryption] Created new persistent encryption seed');
  }

  return seed;
};

/**
 * Rotuje encryption seed (pouze při explicitním požadavku)
 */
export const rotateDraftEncryptionSeed = () => {
  const newSeed = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(DRAFT_ENCRYPTION_KEY, newSeed);
  return newSeed;
};

/**
 * Smaže encryption seed (pouze při kompletním reset)
 */
export const clearDraftEncryptionSeed = () => {
  localStorage.removeItem(DRAFT_ENCRYPTION_KEY);
};