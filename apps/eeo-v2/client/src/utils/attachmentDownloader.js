/**
 * 🎯 UNIVERZÁLNÍ LOGIKA PRO STAHOVÁNÍ PŘÍLOH
 * Použití všude stejné - jeden způsob stahování pro celou aplikaci
 */

/**
 * Stažení a zobrazení přílohy - univerzální funkce
 * @param {Blob} blob - Blob souboru z API
 * @param {string} fileName - Název souboru
 * @param {Object} options - Možnosti
 * @param {boolean} options.autoDownload - Automaticky stáhnout po otevření preview (default: true)
 * @param {Function} options.onSuccess - Callback po úspěšném stažení
 * @param {Function} options.onError - Callback při chybě
 */
export async function downloadAndPreviewAttachment(blob, fileName, options = {}) {
  const { 
    autoDownload = true, 
    onSuccess = null,
    onError = null 
  } = options;

  try {
    // Import utility functions
    const { isPreviewableInBrowser, openInBrowser25, createDownloadLink25 } = await import('../services/api25orders');
    
    // Check if file can be previewed in browser
    if (isPreviewableInBrowser(fileName)) {
      const opened = openInBrowser25(blob, fileName);
      
      if (opened) {
        // Preview opened successfully
        if (autoDownload) {
          // Automaticky stáhnout bez potvrzení
          createDownloadLink25(blob, fileName);
        }
        
        if (onSuccess) {
          onSuccess({ fileName, previewed: true, downloaded: autoDownload });
        }
        return { success: true, previewed: true };
      }
    }
    
    // Cannot preview or preview failed - download directly
    createDownloadLink25(blob, fileName);
    
    if (onSuccess) {
      onSuccess({ fileName, previewed: false, downloaded: true });
    }
    
    return { success: true, previewed: false };
    
  } catch (error) {
    console.error('Error in downloadAndPreviewAttachment:', error);
    if (onError) {
      onError(error);
    }
    throw error;
  }
}

/**
 * Hook pro stahování příloh - připraveno pro budoucí použití
 */
export function useAttachmentDownloader() {
  const download = async (blob, fileName, options) => {
    return downloadAndPreviewAttachment(blob, fileName, options);
  };
  
  return { download };
}

export default downloadAndPreviewAttachment;
