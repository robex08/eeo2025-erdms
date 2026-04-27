/**
 * Orders API služby
 * Podle MOBILE_API_ORDER_LIST_DETAIL_DOCUMENTATION.md a MOBILE_API_ORDER_STATS_DOCUMENTATION.md
 */

import { apiClient } from './client';
import type {
  OrderStats,
  OrderListItem,
  OrderDetail,
  OrderItem,
  Invoice,
  OrderFilter,
} from '../types/api';

/**
 * 1️⃣ Statistiky objednávek - POST /order-v3/stats
 * Podle MOBILE_API_ORDER_STATS_DOCUMENTATION.md
 */
export const getOrderStats = async (
  period: 'all' | 'current-year' | 'current-month' | 'last-month' | 'last-quarter' = 'current-year'
): Promise<OrderStats> => {
  const response = await apiClient.post<OrderStats>('/order-v3/stats', { period }, true);
  
  if (response.status === 'error') {
    throw new Error(response.message || 'Failed to load stats');
  }
  
  if (!response.data) {
    throw new Error('Invalid response from server');
  }
  
  return response.data;
};

/**
 * 2️⃣ Seznam objednávek - POST /order-v3/list
 * Podle MOBILE_API_ORDER_LIST_DETAIL_DOCUMENTATION.md
 */
export const getOrdersList = async (
  filter: OrderFilter = {}
): Promise<{ items: OrderListItem[]; total_count: number; page: number; page_size: number }> => {
  const {
    status = 'all',
    period = 'current-year',
    search = '',
    page = 1,
    page_size = 20,
  } = filter;

  const payload = {
    status: status === 'all' ? undefined : status,
    period,
    search: search || undefined,
    page,
    page_size,
  };

  const response = await apiClient.post<{
    items: OrderListItem[];
    total_count: number;
    page: number;
    page_size: number;
  }>('/order-v3/list', payload, true);
  
  if (response.status === 'error') {
    throw new Error(response.message || 'Failed to load orders');
  }
  
  if (!response.data) {
    throw new Error('Invalid response from server');
  }
  
  return response.data;
};

/**
 * 3️⃣ Detail položek objednávky - POST /order-v3/items
 * Lazy loading - načte položky až když uživatel klikne na objednávku
 */
export const getOrderItems = async (
  orderId: number
): Promise<{
  order: OrderDetail;
  items: OrderItem[];
  invoices?: Invoice[];
  attachments?: any[];
  notes?: any[];
}> => {
  const response = await apiClient.post<{
    order: OrderDetail;
    items: OrderItem[];
    invoices?: Invoice[];
    attachments?: any[];
    notes?: any[];
  }>('/order-v3/items', { order_id: orderId }, true);
  
  if (response.status === 'error') {
    throw new Error(response.message || 'Failed to load order items');
  }
  
  if (!response.data) {
    throw new Error('Invalid response from server');
  }
  
  return response.data;
};

/**
 * 4️⃣ Faktury objednávky - POST /orders-v3/invoices
 * Lazy loading - načte faktury až když uživatel klikne na "Zobrazit faktury"
 */
export const getOrderInvoices = async (orderId: number): Promise<Invoice[]> => {
  const response = await apiClient.post<{ invoices: Invoice[] }>(
    '/orders-v3/invoices',
    { order_id: orderId },
    true
  );
  
  if (response.status === 'error') {
    throw new Error(response.message || 'Failed to load invoices');
  }
  
  if (!response.data || !response.data.invoices) {
    return [];
  }
  
  return response.data.invoices;
};

/**
 * 5️⃣ Rychlé schválení objednávky - POST /order-v3/quick-approve
 * Podle MOBILE_API_QUICK_APPROVAL_DOCUMENTATION.md
 */
export const approveOrder = async (
  orderId: number,
  comment?: string
): Promise<{ order_id: number; new_status: string; message: string }> => {
  const response = await apiClient.post<{
    order_id: number;
    new_status: string;
    message: string;
  }>(
    '/order-v3/quick-approve',
    {
      order_id: orderId,
      comment: comment || undefined,
    },
    true
  );
  
  if (response.status === 'error') {
    throw new Error(response.message || 'Schválení selhalo');
  }
  
  if (!response.data) {
    throw new Error('Invalid response from server');
  }
  
  return response.data;
};

/**
 * 6️⃣ Zamítnutí objednávky - POST /order-v3/reject
 */
export const rejectOrder = async (
  orderId: number,
  reason: string
): Promise<{ order_id: number; new_status: string; message: string }> => {
  if (!reason || reason.trim() === '') {
    throw new Error('Důvod zamítnutí je povinný');
  }

  const response = await apiClient.post<{
    order_id: number;
    new_status: string;
    message: string;
  }>(
    '/order-v3/reject',
    {
      order_id: orderId,
      reason,
    },
    true
  );
  
  if (response.status === 'error') {
    throw new Error(response.message || 'Zamítnutí selhalo');
  }
  
  if (!response.data) {
    throw new Error('Invalid response from server');
  }
  
  return response.data;
};
