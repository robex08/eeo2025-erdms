/**
 * useInvoiceAttachments.js
 *
 * 🎯 CUSTOM HOOK pro práci s přílohami faktur
 *
 * Podle dokumentace: ORDER V2 - INVOICE ATTACHMENTS API
 * Datum: 1. listopadu 2025
 * Verze: 2.0
 *
 * @author Senior Developer
 */

import { useState, useCallback } from 'react';
import {
  uploadInvoiceAttachment25,
  listInvoiceAttachments25,
  downloadInvoiceAttachment25,
  deleteInvoiceAttachment25,
  updateInvoiceAttachment25
} from '../services/api25invoices';

/**
 * Custom hook pro správu příloh faktur
 *
 * @param {string} token - JWT token
 * @param {string} username - Username
 * @returns {Object} Hook API
 */
export const useInvoiceAttachments = (token, username) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper pro API volání
  const apiCall = async (apiFunction, ...args) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction(...args);
      return result;
    } catch (err) {
      const errorMsg = err.message || 'API Error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 1. Načti přílohy faktury
   *
   * @param {number|string} invoiceId - ID faktury (nebo "draft")
   * @param {number} orderId - ID objednávky
   * @returns {Promise<Array>} Seznam příloh
   */
  const getAttachments = useCallback(async (invoiceId, orderId) => {
    const response = await apiCall(
      listInvoiceAttachments25,
      {
        token,
        username,
        faktura_id: invoiceId,
        objednavka_id: orderId
      }
    );

    return response.attachments || response.prilohy || [];
  }, [token, username]);

  /**
   * 2. Nahraj přílohu
   *
   * @param {number|string} invoiceId - ID faktury (nebo "draft")
   * @param {number} orderId - ID objednávky
   * @param {File} file - Soubor k nahrání
   * @param {string} typPrilohy - Typ přílohy (FAKTURA, ISDOC, DOPLNEK_FA)
   * @returns {Promise<Object>} Nahraná příloha
   */
  const uploadAttachment = useCallback(async (
    invoiceId,
    orderId,
    file,
    typPrilohy = 'FAKTURA'
  ) => {
    const response = await apiCall(
      uploadInvoiceAttachment25,
      {
        token,
        username,
        faktura_id: invoiceId,
        objednavka_id: orderId,
        typ_prilohy: typPrilohy,
        file: file
      }
    );

    return response.attachment || response.priloha;
  }, [token, username]);

  /**
   * 3. Stáhni přílohu
   *
   * @param {number} invoiceId - ID faktury
   * @param {number} attachmentId - ID přílohy
   * @param {number} orderId - ID objednávky
   * @param {string} filename - Název souboru pro uložení
   * @returns {Promise<boolean>} True pokud úspěch
   */
  const downloadAttachment = useCallback(async (
    invoiceId,
    attachmentId,
    orderId,
    filename
  ) => {
    try {
      const blob = await apiCall(
        downloadInvoiceAttachment25,
        {
          token,
          username,
          faktura_id: invoiceId,
          priloha_id: attachmentId,
          objednavka_id: orderId
        }
      );

      // Automatické stažení souboru
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      // Vyhoď chybu dál s user-friendly message z BE
      const errorMessage = error.response?.data?.err || 
                          error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Nepodařilo se stáhnout přílohu faktury';
      throw new Error(errorMessage);
    }
  }, [token, username]);

  /**
   * 4. Smaž přílohu
   *
   * @param {number} invoiceId - ID faktury
   * @param {number} attachmentId - ID přílohy
   * @param {number} orderId - ID objednávky
   * @returns {Promise<boolean>} True pokud úspěch
   */
  const deleteAttachment = useCallback(async (
    invoiceId,
    attachmentId,
    orderId
  ) => {
    await apiCall(
      deleteInvoiceAttachment25,
      {
        token,
        username,
        faktura_id: invoiceId,
        priloha_id: attachmentId,
        objednavka_id: orderId
      }
    );

    return true;
  }, [token, username]);

  /**
   * 5. Aktualizuj metadata přílohy
   *
   * @param {number} invoiceId - ID faktury
   * @param {number} attachmentId - ID přílohy
   * @param {number} orderId - ID objednávky
   * @param {Object} updates - Změny (typ_prilohy, originalni_nazev_souboru)
   * @returns {Promise<Object>} Aktualizovaná příloha
   */
  const updateAttachment = useCallback(async (
    invoiceId,
    attachmentId,
    orderId,
    updates
  ) => {
    const response = await apiCall(
      updateInvoiceAttachment25,
      {
        token,
        username,
        faktura_id: invoiceId,
        priloha_id: attachmentId,
        objednavka_id: orderId,
        ...updates
      }
    );

    return response.attachment || response.priloha;
  }, [token, username]);

  return {
    loading,
    error,
    getAttachments,
    uploadAttachment,
    downloadAttachment,
    deleteAttachment,
    updateAttachment
  };
};

export default useInvoiceAttachments;
