export interface MonthlyBillingData {
  car_id: number;
  driver_name: string | null;
  driver_personal_number: string | null;
  ccs_card_imported: boolean;
  ccs_card_number: string | null;
  ccs_card_expiration: string | null;
  km_business: number;
  km_private: number;
  km_total: number;
  fuel_start_l: number;
  fuel_end_l: number;
  fuel_draw_l: number;
  fuel_draw_cost_czk: number;
  paid_by_driver_czk: number;
  avg_fuel_price_czk_l: number;
  total_consumption_l: number;
  avg_consumption: number;
  amortization_czk: number;
  driver_reimbursement_czk: number;
  total_costs_czk: number;
  costs_business_czk: number;
  costs_private_czk: number;
}

export interface BillingApiSuccessResponse {
  status: 'ok';
  data: {
    period: string;
    item: MonthlyBillingData;
  };
}

export interface BillingApiErrorResponse {
  status: 'error';
  error: {
    message: string;
  };
}

export type BillingApiResponse = BillingApiSuccessResponse | BillingApiErrorResponse;