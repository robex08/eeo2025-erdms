# 📋 TODO: Naming Consistency Migration Plan

**Vytvořeno:** 7. ledna 2026  
**Status:** 🟡 PLANNING  
**Owner:** Development Team  
**Timeline:** Q1 2026 (leden - březen)

---

## 📚 Dokumentace & Analýzy

### Dokončené Analýzy ✅

- [x] **User ID Analysis** - [MIGRATION_SAFETY_ANALYSIS_USER_ID.md](MIGRATION_SAFETY_ANALYSIS_USER_ID.md)
  - Severity: 🟡 MEDIUM
  - 3 varianty (userId, user_id, uzivatel_id)
  - 4 fallback chains identified

- [x] **Order ID Analysis** - [REPORT_ORDER_ID_NAMING_INCONSISTENCY.md](REPORT_ORDER_ID_NAMING_INCONSISTENCY.md)
  - Severity: 🔴 HIGH (CRITICAL)
  - 5 variant (order.id, orderId, order_id, objednavka_id, order.objednavka_id)
  - 8 fallback chains, 5-variant extreme fallback discovered
  - **PRIORITA #1**

- [x] **Invoice & Cashbook Analysis** - [REPORT_INVOICE_CASHBOOK_NAMING_ANALYSIS.md](REPORT_INVOICE_CASHBOOK_NAMING_ANALYSIS.md)
  - Invoice: 🟡 MEDIUM-HIGH (3 varianty, API instability)
  - Cashbook: 🟢 LOW (best practice template)
  - **Cashbook = no action needed ✅**

### Další Doporučené Analýzy 📝

- [ ] **Contract Module** (smlouvy)
  - Očekáváno: `contract_id` vs `smlouva_id` mismatch
  - Priorita: MEDIUM
  - Odhad: 1-2 dny analýzy

- [ ] **Supplier Module** (dodavatelé)
  - Očekáváno: `supplier_id` vs `dodavatel_id` mismatch
  - Priorita: MEDIUM
  - Odhad: 1 den analýzy

- [ ] **Registry Module** (spisovky)
  - Očekáváno: `registry_id` vs `spisovna_id` chaos
  - Priorita: LOW-MEDIUM
  - Odhad: 1 den analýzy

---

## 🎯 Migration Roadmap

### FÁZE 1: Order Module Migration (PRIORITA #1)
**Timeline:** 12-15 pracovních dní  
**Status:** ⏳ NOT STARTED  
**Severity:** 🔴 CRITICAL

#### Checklist FÁZE 1.0 - Příprava (1 týden, 0% riziko)
- [ ] Vytvořit `services/orderIdMapper.js`
  - [ ] `normalizeOrderId()` - unified ID extraction
  - [ ] `getOrderIdKey()` - context-aware key selection
  - [ ] Unit tests (100% coverage)
- [ ] Vytvořit `lib/apiPayloadMapper.php`
  - [ ] `mapOrderPayload()` - accept order_id AND orderId
  - [ ] `mapOrderResponse()` - always return consistent structure
  - [ ] PHPUnit tests
- [ ] TypeScript interfaces
  - [ ] `OrderDBRow` (PK: id, FK: objednavka_id)
  - [ ] `OrderAPIResponse` (order_id standardized)
  - [ ] `OrderFormData` (orderId in FE state)
  - [ ] `OrderDraft` (draft_X ID handling)
- [ ] ESLint custom rule: `no-multiple-order-id-fallbacks`
- [ ] CI/CD pipeline updates (lint + type checks)

#### Checklist FÁZE 1.1 - Backend API Dual Support (2 týdny, 5% riziko)
- [ ] Update ALL Order V2 endpoints pro dual support
  - [ ] Accept: `order_id`, `orderId`, `objednavka_id` (all 3!)
  - [ ] Response: ALWAYS `{status: 'ok', data: {order_id: X}}`
- [ ] Logging middleware: detect problematic payloads
- [ ] Backward compatibility testing
  - [ ] Old FE code musí fungovat
  - [ ] New mapper musí fungovat
- [ ] Deploy to staging
- [ ] Monitoring: track API errors 3 dny

#### Checklist FÁZE 1.2 - FE Critical Components (2 týdny, 15% riziko)
- [ ] **Week 1: Orders25List.js** (100+ occurrences)
  - [ ] Replace `order.id || order.objednavka_id` with `normalizeOrderId(order)`
  - [ ] Update `highlightOrderId`, `editOrderId`, `expandedOrderIds` logic
  - [ ] Testing:
    - [ ] Create order flow
    - [ ] Edit order flow
    - [ ] Delete order flow
    - [ ] Expand/collapse rows
    - [ ] Highlight after save
- [ ] **Week 2: OrderForm25.js** (70+ occurrences)
  - [ ] Unified `editOrderId` logic (URL + localStorage + draft)
  - [ ] Fix unlock logic: use `normalizeOrderId(formData)`
  - [ ] Testing:
    - [ ] New order creation
    - [ ] Edit existing order
    - [ ] Draft save/restore
    - [ ] Lock/unlock mechanism
    - [ ] Attachment upload

#### Checklist FÁZE 1.3 - FE Integration Components (1 týden, 10% riziko)
- [ ] **InvoiceEvidencePage.js** (50+ occurrences)
  - [ ] Fix `orderId` URL param → `formData.order_id` mapping
  - [ ] Invoice-to-order attachment logic
  - [ ] Testing:
    - [ ] Create invoice with order
    - [ ] Add invoice to existing order
    - [ ] Invoice attachment to order
- [ ] **DocxGeneratorModal.js** (CRITICAL - 5-variant fallback!)
  - [ ] Replace: `order.id || order.objednavka_id || order.order_id || order.ID || order.OBJEDNAVKA_ID`
  - [ ] With: `normalizeOrderId(order)`
  - [ ] Testing:
    - [ ] Generate DOCX from order (all scenarios)
    - [ ] Verify correct order ID used
- [ ] **API Services** (apiOrderV2.js)
  - [ ] Consolidate `orderId` vs `order_id` parameters
  - [ ] All payloads use mapper
  - [ ] All responses parsed with mapper

#### Checklist FÁZE 1.4 - Stabilizace (3 měsíce monitoring, 20% riziko)
- [ ] Deploy to production
- [ ] Monitor 2 týdny:
  - [ ] API error rate (target: <0.1%)
  - [ ] Order creation success rate (target: >99.9%)
  - [ ] Draft system stability
- [ ] Po 1 měsíci stable: Remove fallback chains
  - [ ] ESLint enforce strict mode
  - [ ] Throw errors na invalid IDs
- [ ] Po 3 měsících stable: Deprecate old payload keys
  - [ ] Backend: only accept `orderId`
  - [ ] Remove `order_id`, `objednavka_id` support

**Acceptance Criteria:**
- [x] Zero API errors related to order_id for 1 week
- [x] All fallback chains removed
- [x] ESLint passing with strict rules
- [x] TypeScript compilation zero errors
- [x] Full regression test suite passing

---

### FÁZE 2: Invoice Module Migration (PRIORITA #2)
**Timeline:** 8-10 pracovních dní  
**Status:** ⏳ WAITING (start po Order FÁZE 1.1)  
**Severity:** 🟡 MEDIUM-HIGH

#### Checklist FÁZE 2.0 - Příprava (2 dny, 0% riziko)
- [ ] Vytvořit `services/invoiceResponseMapper.js`
  - [ ] `normalizeInvoiceResponse()` - unified API response parsing
  - [ ] Unit tests
- [ ] Backend response standardization design
  - [ ] ALL endpoints MUST return: `{status: 'ok', data: {invoice_id: X}}`
  - [ ] Remove alternative structures
- [ ] TypeScript interfaces
  - [ ] `InvoiceDBRow` (PK: id, FK: faktura_id)
  - [ ] `InvoiceAPIResponse` (invoice_id standardized)
  - [ ] `InvoiceFormData`

#### Checklist FÁZE 2.1 - Backend API Standardization (2 dny, 5% riziko)
- [ ] Update ALL invoice endpoints
- [ ] Mapping layer: `faktura_id` (DB) → `invoice_id` (API)
- [ ] Backward compatibility: accept both for 1 release
- [ ] Testing + deploy to staging

#### Checklist FÁZE 2.2 - FE Fallback Removal (2 dny, 10% riziko)
- [ ] Replace fallback chains:
  - [ ] `result?.data?.invoice_id || result?.invoice_id || result?.id`
  - [ ] `attachment.faktura_id || attachment.invoice_id`
- [ ] Use `normalizeInvoiceResponse()` everywhere
- [ ] Strict error handling (throw on invalid)
- [ ] Testing: InvoiceEvidencePage, OrderForm25, Invoices25List

#### Checklist FÁZE 2.3 - API Service Consolidation (2 dny, 10% riziko)
- [ ] Unify `apiInvoiceV2.js` vs `apiOrderV2.js` duplicates
- [ ] Single parameter naming: `invoiceId` in FE
- [ ] Mapper: `invoiceId` → `invoice_id` (API)

#### Checklist FÁZE 2.4 - Stabilizace (2 měsíce monitoring)
- [ ] Monitor API errors
- [ ] Remove backward compatibility after stable period

**Acceptance Criteria:**
- [x] Zero fallback chains v invoice code
- [x] Stable API response structure for 2 weeks
- [x] No invoice creation/update failures

---

### FÁZE 3: User Module Migration (PRIORITA #3)
**Timeline:** 8-10 pracovních dní  
**Status:** ⏳ DEFERRED (start po Invoice FÁZE 2 complete)  
**Severity:** 🟡 MEDIUM

**Plán:** TBD - podobný approach jako Order/Invoice, ale nižší priorita

#### Quick Checklist
- [ ] Vytvořit `services/userIdMapper.js`
- [ ] Backend dual support: `user_id` + `uzivatel_id`
- [ ] FE fallback removal (4 chains identified)
- [ ] Stabilizace

**Poznámka:** Možnost začít jen s **Varianta B (Documentation)** a odložit full migration o 6 měsíců.

---

### FÁZE 4: Cashbook Module
**Timeline:** 0 dní ✅  
**Status:** ✅ DONE  
**Severity:** 🟢 LOW

**Action:** **NO MIGRATION NEEDED**

- [x] Current state je best practice
- [x] Use as template for future modules
- [x] Monitor only, žádné code changes
- [x] Document as "Golden Standard"

---

## 📊 Progress Tracking

### Overall Status

| Module | Status | Progress | Risk | ETA |
|--------|--------|----------|------|-----|
| **Order** | ⏳ Not Started | 0% | 🔴 HIGH | End Feb 2026 |
| **Invoice** | ⏳ Waiting | 0% | 🟡 MEDIUM | End Mar 2026 |
| **User** | ⏳ Deferred | 0% | 🟡 MEDIUM | Q3 2026 |
| **Cashbook** | ✅ Done | 100% | 🟢 LOW | N/A |

### Milestones

- [ ] **M1: Order FÁZE 0 Complete** (1 týden) - Target: 17. ledna 2026
- [ ] **M2: Order FÁZE 1 Complete** (2 týdny) - Target: 31. ledna 2026
- [ ] **M3: Order FÁZE 2 Complete** (2 týdny) - Target: 14. února 2026
- [ ] **M4: Order FÁZE 3 Complete** (1 týden) - Target: 21. února 2026
- [ ] **M5: Order Stabilization** (3 měsíce) - Target: 21. května 2026
- [ ] **M6: Invoice Migration Complete** (8-10 dní) - Target: 31. března 2026
- [ ] **M7: User Migration** (deferred) - Target: TBD (Q3 2026)

---

## 👥 Resource Allocation

### Team Assignment

| Role | Name | Responsibility | Time Allocation |
|------|------|----------------|-----------------|
| **Senior Backend Dev** | TBD | Order/Invoice PHP migration | 50% (6 weeks) |
| **Senior Frontend Dev** | TBD | Order/Invoice FE migration | 50% (6 weeks) |
| **Mid Frontend Dev** | TBD | Testing + bugfixes | 25% (8 weeks) |
| **QA Engineer** | TBD | Regression testing | 100% (2 weeks) |
| **Tech Lead** | TBD | Review + approval | 10% (6 weeks) |

### Approval Required

- [ ] **Tech Lead:** Approve migration plan
- [ ] **Product Owner:** Approve timeline (Q1 impact)
- [ ] **Dev Team:** Commit to work allocation
- [ ] **Management:** Approve budget (240+ dev hours)

---

## 🚨 Risk Management

### Critical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Order unlock failure** | HIGH | 🔴 CRITICAL | Phased rollout, feature flag |
| **Draft system breaks** | MEDIUM | 🔴 HIGH | Comprehensive draft testing |
| **API backward compat breaks** | MEDIUM | 🔴 HIGH | Dual support for 1 release |
| **Invoice attachment orphaned** | LOW | 🟡 MEDIUM | File system audit scripts |
| **User session issues** | LOW | 🟡 MEDIUM | Gradual rollout per user group |

### Rollback Plan

1. **Feature Flags:** All migrations za feature flag
2. **Database backups:** Before každého deploy
3. **Rollback scripts:** Prepared pro každou fázi
4. **Monitoring alerts:** Auto-rollback na >1% error rate
5. **Communication plan:** User notification if rollback needed

---

## 📈 Success Metrics

### KPIs

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Order creation error rate** | 0.5% | <0.1% | API logs |
| **Draft save success rate** | 98% | >99.5% | Frontend telemetry |
| **API response time (p95)** | 250ms | <200ms | APM monitoring |
| **Fallback chain executions** | 1000+/day | 0/day | Custom logging |
| **TypeScript type errors** | 50+ | 0 | CI pipeline |
| **Bug reports (ID-related)** | 5/month | 0/month | Jira tracker |

### Post-Migration Validation

- [ ] **Week 1:** Zero critical bugs
- [ ] **Week 2:** <5 minor bugs
- [ ] **Month 1:** All KPIs meeting targets
- [ ] **Month 3:** Ready for next phase

---

## 📝 Documentation Updates

### Required Updates

- [ ] **API Documentation**
  - [ ] Update endpoint specs (invoice_id standardization)
  - [ ] Add migration guide for API consumers
  - [ ] Deprecation notices for old payload keys

- [ ] **Developer Docs**
  - [ ] Naming conventions guide (use Cashbook as example)
  - [ ] ID mapper usage examples
  - [ ] TypeScript interface reference

- [ ] **Onboarding Docs**
  - [ ] Update new developer guide
  - [ ] Add "Why we have mappers" section
  - [ ] Common pitfalls and solutions

- [ ] **Runbooks**
  - [ ] ID-related debugging guide
  - [ ] Rollback procedures
  - [ ] Monitoring alert response

---

## 🎯 Next Actions (This Week)

### Immediate TODO (do 14. ledna 2026)

1. **Týmová diskuze:**
   - [ ] Prezentovat všechny 3 reporty (Order, Invoice, Cashbook)
   - [ ] Diskutovat timeline impact (6+ týdnů dev time)
   - [ ] Rozhodnout: Full migration vs Documentation only

2. **Management approval:**
   - [ ] Získat souhlas s resource allocation
   - [ ] Potvrdit Q1 deadline jako realistický
   - [ ] Budget approval (240+ dev hours)

3. **Technical prep:**
   - [ ] Setup feature flags infrastructure
   - [ ] Prepare monitoring dashboards
   - [ ] Create migration branch `feature/order-id-migration`

4. **Team assignment:**
   - [ ] Assign senior backend dev
   - [ ] Assign senior frontend dev
   - [ ] Assign QA engineer

---

## 📞 Contacts & Escalation

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| **Technical blocker** | Tech Lead | 2 hours |
| **Timeline slip** | Product Owner | 4 hours |
| **Critical bug** | On-call dev | 30 minutes |
| **Rollback decision** | Tech Lead + PO | 1 hour |

---

## 📚 Related Documents

- [MIGRATION_SAFETY_ANALYSIS_USER_ID.md](MIGRATION_SAFETY_ANALYSIS_USER_ID.md) - User ID analysis
- [REPORT_ORDER_ID_NAMING_INCONSISTENCY.md](REPORT_ORDER_ID_NAMING_INCONSISTENCY.md) - Order ID analysis (CRITICAL)
- [REPORT_INVOICE_CASHBOOK_NAMING_ANALYSIS.md](REPORT_INVOICE_CASHBOOK_NAMING_ANALYSIS.md) - Invoice + Cashbook analysis
- [BUILD.md](BUILD.md) - Build & deployment procedures
- [CASHBOX_MAIN_ASSIGNMENT_VALIDATION_SUMMARY.md](CASHBOX_MAIN_ASSIGNMENT_VALIDATION_SUMMARY.md) - Cashbook best practices

---

**Last Updated:** 7. ledna 2026  
**Next Review:** 14. ledna 2026 (po týmové diskuzi)  
**Version:** 1.0

**Pro otázky kontaktovat:** Tech Lead nebo GitHub Copilot 😊
