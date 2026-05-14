import type { MobileOrder, MobileStats, MobileUser } from '../domain/mobile';

export const mockUser: MobileUser = {
  name: 'RH ADMIN',
  email: 'robert.holovsky@zachranka.cz',
  roles: '@admin | IT | Programátor | Kladno',
  phone: '731137100',
};

export const mockStats: MobileStats = {
  total: { count: 1347, value: '34 427 379 Kc' },
  inProgress: { count: 517, value: '10 M Kc' },
  completed: { count: 858, value: '22 M Kc' },
  toApprove: 7,
  approved: 78,
  myOrders: 1,
};

export const mockOrders: MobileOrder[] = [
  {
    id: 'O-1038/75030926/2026/EN',
    date: '27.04.2026',
    title: 'Kurz interních auditorů 23. 4. 2026 od 09:00 - Ústí n L.',
    price: '6 050 Kč',
    status: 'Dokončená',
    requester: 'Zuzana Vávrová',
    finance: 'LPP3',
    approver: 'Kateřina Pávková',
    badges: [1, 1],
    supplier: { name: 'Aliaves & Co., a.s.', ico: '28988230' },
    garant: 'Pavel Rusý',
    created: '27.04.2026 07:49',
    itemsCount: 1,
    type: 'Školení - nelékařské',
    details: [
      { name: 'Kurz interních auditorů', code: 'LPP3 - Zákonné sociální náklady', price: '6 050 Kč' },
    ],
    invoicesCount: 1,
    invoices: [
      {
        vs: 'VS: 1040260266 / 999260535',
        desc: 'Kurz interních auditorů',
        center: 'Střediska: 901 Vedení ZZS SK',
        price: '6 050 Kč',
      },
    ],
    totalAmountCena: '6 050 Kč',
    totalAmountCastka: '6 050 Kč',
  },
  {
    id: 'O-1010/75030926/2026/PN',
    date: '27.04.2026',
    title: 'Kurz interních auditorů',
    price: '6 050 Kč',
    status: 'Dokončená',
    requester: 'Kateřina Pávková',
    finance: 'LPP3',
    approver: 'Kateřina Pávková',
    badges: [1, 1],
    supplier: { name: 'Medica s.r.o.', ico: '12345678' },
    garant: 'Jan Novák',
    created: '27.04.2026 08:30',
    itemsCount: 1,
    type: 'Školení - nelékařské',
    details: [
      { name: 'Kurz interních auditorů', code: 'LPP3 - Zákonné sociální náklady', price: '6 050 Kč' },
    ],
    invoicesCount: 1,
    invoices: [
      {
        vs: 'VS: 1040260266 / 999260535',
        desc: 'Kurz interních auditorů',
        center: 'Střediska: 901 Vedení ZZS SK',
        price: '6 050 Kč',
      },
    ],
    totalAmountCena: '6 050 Kč',
    totalAmountCastka: '6 050 Kč',
  },
];
