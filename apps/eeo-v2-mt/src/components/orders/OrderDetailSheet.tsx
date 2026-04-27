/**
 * Order Detail Bottom Sheet - Modern Design
 */

import { useQuery } from '@tanstack/react-query';
import { getOrderItems } from '../../api/orders';
import { formatCurrency, formatDate } from '../../utils/format';
import { X, Package, FileText, Building2, User, Calendar } from 'lucide-react';

interface OrderDetailSheetProps {
  orderId: number;
  onClose: () => void;
}

export default function OrderDetailSheet({ orderId, onClose }: OrderDetailSheetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => getOrderItems(orderId),
    staleTime: 1000 * 60,
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slideUp safe-bottom">
        <div className="glass rounded-t-3xl max-h-[85vh] overflow-hidden border-t border-white/10">
          {/* Header */}
          <div className="sticky top-0 glass border-b border-white/10 p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Detail objednávky</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-64px)] p-4 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : !data ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Chyba při načítání</p>
              </div>
            ) : (
              <>
                {/* Order Info Card */}
                <div className="glass rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Package className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold mb-1">
                        {data.order.cislo_objednavky}
                      </div>
                      <div className="text-slate-400 text-sm">
                        {data.order.stav_workflow_nazev}
                      </div>
                    </div>
                  </div>

                  {data.order.dodavatel_nazev && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-300">{data.order.dodavatel_nazev}</span>
                    </div>
                  )}

                  {data.order.garant_jmeno && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-300">
                        Garant: {data.order.garant_jmeno} {data.order.garant_prijmeni}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">
                      {formatDate(data.order.dt_vytvoreno)}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Celková částka</span>
                    <span className="text-white font-bold text-lg">
                      {formatCurrency(data.order.celkova_castka)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                {data.items && data.items.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-400" />
                      Položky ({data.items.length})
                    </h3>
                    <div className="space-y-2">
                      {data.items.map((item) => (
                        <div
                          key={item.id}
                          className="glass rounded-lg p-3"
                        >
                          <div className="text-white font-medium text-sm mb-1">
                            {item.nazev}
                          </div>
                          {item.lp_kod && (
                            <div className="text-blue-400 text-xs mb-2">
                              {item.lp_kod} - {item.lp_nazev}
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">
                              {item.mnozstvi} × {formatCurrency(item.cena_za_jednotku)}
                            </span>
                            <span className="text-white font-semibold">
                              {formatCurrency(item.celkova_cena)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoices */}
                {data.invoices && data.invoices.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      Faktury ({data.invoices.length})
                    </h3>
                    <div className="space-y-2">
                      {data.invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="glass rounded-lg p-3"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-white font-medium text-sm">
                                {invoice.cislo_faktury}
                              </div>
                              {invoice.variabilni_symbol && (
                                <div className="text-slate-400 text-xs">
                                  VS: {invoice.variabilni_symbol}
                                </div>
                              )}
                            </div>
                            <div className="text-white font-semibold">
                              {formatCurrency(invoice.castka)}
                            </div>
                          </div>
                          {invoice.dt_vystaveni && (
                            <div className="text-slate-400 text-xs">
                              {formatDate(invoice.dt_vystaveni)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
