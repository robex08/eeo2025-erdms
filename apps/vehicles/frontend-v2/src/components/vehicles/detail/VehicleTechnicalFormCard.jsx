import React from 'react';
import VehicleModulesDashboard from './VehicleModulesDashboard';
import VehicleRecentEventsCard from './VehicleRecentEventsCard';
import ServiceRecordsModule from './modules/ServiceRecordsModule';
import EquipmentModule from './modules/EquipmentModule';
import InsuranceModule from './modules/InsuranceModule';
import ClaimsModule from './modules/ClaimsModule';
import TiresModule from './modules/TiresModule';
import FundingModule from './modules/FundingModule';
import { SupplierModule, WarrantyClaimModule } from './modules/SupplierWarrantyModules';
import AttachmentsModule from './modules/AttachmentsModule';
import HistoryModule from './modules/HistoryModule';
import LookupSelect from './modules/LookupSelect';
import AppIcon from '../../ui/AppIcon';
import DismissibleMessage from '../../ui/DismissibleMessage';

const MODULE_HEADER_META = {
  service: { title: 'Servisy a opravy', icon: 'service' },
  equipment: { title: 'Výbava a zařízení', icon: 'detail' },
  insurance: { title: 'Pojištění', icon: 'ccsCard' },
  claims: { title: 'Škodní události', icon: 'warning' },
  tires: { title: 'Pneumatiky', icon: 'wheel' },
  funding: { title: 'Dotace a financování', icon: 'money' },
  suppliers: { title: 'Dodavatelé', icon: 'users' },
  warrantyClaims: { title: 'Záruka a reklamace', icon: 'approve' },
  attachments: { title: 'Přílohy', icon: 'file' },
  history: { title: 'Historie změn', icon: 'history' },
};

export default function VehicleTechnicalFormCard({ 
  activeModule, 
  onManageModule, 
  onCloseModule, 
  form, 
  onChange, 
  onSubmit, 
  saving, 
  saveMessage, 
  isDirty = false, 
  onReset,
  serviceStations = [],
  serviceRecords = [],
  serviceRecordsLoading,
  serviceRecordsError,
  serviceRecordMessage,
  creatingServiceRecord,
  onCreateServiceRecord,
  onCreateServiceStation,
  onDeleteServiceRecord,
  vehicleEquipment = [],
  equipmentLoading,
  equipmentError,
  equipmentMessage,
  creatingEquipment,
  onCreateEquipment,
  onDeleteEquipment,
  insurancePolicies = [],
  claims = [],
  insuranceLoading,
  insuranceError,
  insuranceMessage,
  creatingInsurance,
  creatingClaim,
  onCreateInsurancePolicy,
  onCreateClaim,
  onDeleteInsurancePolicy,
  onDeleteClaim,
  tires = [],
  tiresLoading,
  tiresError,
  tiresMessage,
  creatingTires,
  onCreateTires,
  onDeleteTires,
  funding = [],
  fundingLoading,
  fundingError,
  fundingMessage,
  creatingFunding,
  onCreateFunding,
  onDeleteFunding,
  suppliers = [],
  suppliersLoading,
  suppliersError,
  suppliersMessage,
  creatingSupplier,
  onSaveSupplier,
  onDeleteSupplier,
  warrantyClaims = [],
  warrantyClaimsLoading,
  warrantyClaimsError,
  warrantyClaimsMessage,
  creatingWarrantyClaim,
  onSaveWarrantyClaim,
  onDeleteWarrantyClaim,
  attachments = [],
  attachmentsLoading,
  attachmentsError,
  attachmentMessage,
  uploadingAttachment,
  attachmentUploadProgress,
  onUploadAttachment,
  onDownloadAttachment,
  onDeleteAttachment,
  cardHistory = [],
  cardHistoryLoading,
  cardHistoryError,
  editingBasic = false,
  onEditingBasicChange,
  lookupByCategory = {},
  validationErrors = {},
  readOnly = false,
}) {
  function hasValidationError(fieldName) {
    return Boolean(validationErrors?.[fieldName]);
  }

  return (
    <>
    <article className="info-card vehicle-edit-card" id="karta">
      {/* Editace základních údajů */}
      {editingBasic ? (
        <form
          className="detail-form"
          onSubmit={async (event) => {
            const saved = await onSubmit(event);
            if (saved !== false) {
              onEditingBasicChange?.(false);
            }
          }}
          style={{ marginTop: '1.5rem' }}
        >
          <fieldset disabled={saving || readOnly}>
            <label htmlFor="zzs_typ">
              ZZS typ
              <LookupSelect
                name="zzs_typ"
                category="vehicle_type"
                lookupByCategory={lookupByCategory}
                value={form.zzs_typ}
                onChange={onChange}
              />
            </label>

            <label htmlFor="w_popis">
              Volací znak
              <input 
                id="w_popis" 
                name="w_popis" 
                value={form.w_popis || ''} 
                onChange={onChange} 
                placeholder="Např. ZKL 123" 
                aria-invalid={hasValidationError('w_popis')}
              />
              {validationErrors.w_popis && <span className="field-error">{validationErrors.w_popis}</span>}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label htmlFor="evidencni_cislo_zzs">
                Evidenční číslo ZZS
                <input 
                  id="evidencni_cislo_zzs" 
                  name="evidencni_cislo_zzs" 
                  value={form.evidencni_cislo_zzs || ''} 
                  onChange={onChange} 
                  aria-invalid={hasValidationError('evidencni_cislo_zzs')}
                />
                {validationErrors.evidencni_cislo_zzs && <span className="field-error">{validationErrors.evidencni_cislo_zzs}</span>}
              </label>

              <label htmlFor="vin">
                VIN
                <input 
                  id="vin" 
                  name="vin" 
                  value={form.vin || ''} 
                  onChange={onChange} 
                  aria-invalid={hasValidationError('vin')}
                />
                {validationErrors.vin && <span className="field-error">{validationErrors.vin}</span>}
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label htmlFor="acquisition_year">
                Rok pořízení
                <input 
                  id="acquisition_year" 
                  name="acquisition_year" 
                  type="number" 
                  min="1900" 
                  max="2100" 
                  value={form.acquisition_year || ''} 
                  onChange={onChange} 
                  aria-invalid={hasValidationError('acquisition_year')}
                />
                {validationErrors.acquisition_year && <span className="field-error">{validationErrors.acquisition_year}</span>}
              </label>

              <label htmlFor="acquisition_supplier">
                Dodavatel
                <input 
                  id="acquisition_supplier" 
                  name="acquisition_supplier" 
                  value={form.acquisition_supplier || ''} 
                  onChange={onChange} 
                  aria-invalid={hasValidationError('acquisition_supplier')}
                />
                {validationErrors.acquisition_supplier && <span className="field-error">{validationErrors.acquisition_supplier}</span>}
              </label>
            </div>

            <div className="vehicle-form-actions">
              <div>
                {isDirty && <span className="vehicle-form-action-note">Máte neuložené změny</span>}
              </div>
              <div className="vehicle-form-action-buttons">
                {isDirty && (
                  <button className="btn btn-ghost" type="button" onClick={onReset} disabled={saving}>
                    Zahodit
                  </button>
                )}
                <button className="btn btn-primary" type="submit" disabled={saving || !isDirty}>
                  {saving ? 'Ukládám...' : 'Uložit změny'}
                </button>
              </div>
            </div>

            <DismissibleMessage message={saveMessage} variant="status" />
          </fieldset>
        </form>
      ) : !activeModule ? (
        /* Dashboard s moduly */
        <div style={{ marginTop: '1.5rem' }}>
          <VehicleModulesDashboard
            serviceRecords={serviceRecords}
            vehicleEquipment={vehicleEquipment}
            insurancePolicies={insurancePolicies}
            claims={claims}
            tires={tires}
            funding={funding}
            suppliers={suppliers}
            warrantyClaims={warrantyClaims}
            attachments={attachments}
            onManageModule={onManageModule}
            lookupByCategory={lookupByCategory}
            readOnly={readOnly}
          />
        </div>
      ) : (
        /* Detail modulu */
        <div style={{ marginTop: '1.5rem' }}>
          <div className="vehicle-form-header vehicle-module-detail-header">
            <h4 className="vehicle-module-detail-title">
              <AppIcon name={MODULE_HEADER_META[activeModule]?.icon || 'detail'} size={19} weight="duotone" />
              <span>{MODULE_HEADER_META[activeModule]?.title || 'Detail'}</span>
            </h4>
            <button type="button" className="btn btn-ghost btn-sm btn-back-icon" onClick={onCloseModule} title="Zpět na přehled modulů">
              <AppIcon name="arrowLeft" size={18} weight="regular" />
            </button>
          </div>

          <div style={{ marginTop: '1rem' }}>
            {activeModule === 'service' && (
              <ServiceRecordsModule
                serviceRecords={serviceRecords}
                serviceStations={serviceStations}
                onCreateServiceRecord={onCreateServiceRecord}
                onCreateServiceStation={onCreateServiceStation}
                onDeleteServiceRecord={onDeleteServiceRecord}
                serviceRecordsLoading={serviceRecordsLoading}
                serviceRecordsError={serviceRecordsError}
                serviceRecordMessage={serviceRecordMessage}
                creatingServiceRecord={creatingServiceRecord}
                attachmentUploadProgress={attachmentUploadProgress}
                attachments={attachments} onUploadAttachment={onUploadAttachment} onDeleteAttachment={onDeleteAttachment} onDownloadAttachment={onDownloadAttachment} uploadingAttachment={uploadingAttachment}
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
              />
            )}

            {activeModule === 'equipment' && (
              <EquipmentModule
                vehicleEquipment={vehicleEquipment}
                onCreateEquipment={onCreateEquipment}
                onDeleteEquipment={onDeleteEquipment}
                equipmentLoading={equipmentLoading}
                equipmentError={equipmentError}
                equipmentMessage={equipmentMessage}
                creatingEquipment={creatingEquipment}
                attachmentUploadProgress={attachmentUploadProgress}
                attachments={attachments} onUploadAttachment={onUploadAttachment} onDeleteAttachment={onDeleteAttachment} onDownloadAttachment={onDownloadAttachment} uploadingAttachment={uploadingAttachment}
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
              />
            )}

            {activeModule === 'insurance' && (
              <InsuranceModule
                insurancePolicies={insurancePolicies}
                onCreateInsurancePolicy={onCreateInsurancePolicy}
                onDeleteInsurancePolicy={onDeleteInsurancePolicy}
                insuranceLoading={insuranceLoading}
                insuranceError={insuranceError}
                insuranceMessage={insuranceMessage}
                creatingInsurance={creatingInsurance}
                attachmentUploadProgress={attachmentUploadProgress}
                attachments={attachments} onUploadAttachment={onUploadAttachment} onDeleteAttachment={onDeleteAttachment} onDownloadAttachment={onDownloadAttachment} uploadingAttachment={uploadingAttachment}
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
              />
            )}

            {activeModule === 'claims' && (
              <ClaimsModule
                claims={claims}
                insurancePolicies={insurancePolicies}
                onCreateClaim={onCreateClaim}
                onDeleteClaim={onDeleteClaim}
                claimsLoading={insuranceLoading}
                claimsError={insuranceError}
                claimsMessage={insuranceMessage}
                creatingClaim={creatingClaim}
                attachmentUploadProgress={attachmentUploadProgress}
                attachments={attachments}
                onUploadAttachment={onUploadAttachment}
                onDeleteAttachment={onDeleteAttachment}
                onDownloadAttachment={onDownloadAttachment}
                uploadingAttachment={uploadingAttachment}
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
              />
            )}

            {activeModule === 'tires' && (
              <TiresModule
                tires={tires}
                onCreateTires={onCreateTires}
                onDeleteTires={onDeleteTires}
                tiresLoading={tiresLoading}
                tiresError={tiresError}
                tiresMessage={tiresMessage}
                creatingTires={creatingTires}
                attachmentUploadProgress={attachmentUploadProgress}
                attachments={attachments} onUploadAttachment={onUploadAttachment} onDeleteAttachment={onDeleteAttachment} onDownloadAttachment={onDownloadAttachment} uploadingAttachment={uploadingAttachment}
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
              />
            )}

            {activeModule === 'funding' && (
              <FundingModule
                funding={funding}
                onCreateFunding={onCreateFunding}
                onDeleteFunding={onDeleteFunding}
                fundingLoading={fundingLoading}
                fundingError={fundingError}
                fundingMessage={fundingMessage}
                creatingFunding={creatingFunding}
                attachmentUploadProgress={attachmentUploadProgress}
                attachments={attachments} onUploadAttachment={onUploadAttachment} onDeleteAttachment={onDeleteAttachment} onDownloadAttachment={onDownloadAttachment} uploadingAttachment={uploadingAttachment}
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
              />
            )}

            {activeModule === 'suppliers' && (
              <SupplierModule
                suppliers={suppliers}
                onSave={onSaveSupplier}
                onDelete={onDeleteSupplier}
                loading={suppliersLoading}
                error={suppliersError}
                message={suppliersMessage}
                saving={creatingSupplier}
                attachments={attachments}
                onUploadAttachment={onUploadAttachment}
                onDeleteAttachment={onDeleteAttachment}
                onDownloadAttachment={onDownloadAttachment}
                uploadingAttachment={uploadingAttachment}
                attachmentUploadProgress={attachmentUploadProgress}
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
              />
            )}

            {activeModule === 'warrantyClaims' && (
              <WarrantyClaimModule
                records={warrantyClaims}
                suppliers={suppliers}
                equipment={vehicleEquipment}
                onSave={onSaveWarrantyClaim}
                onDelete={onDeleteWarrantyClaim}
                loading={warrantyClaimsLoading}
                error={warrantyClaimsError}
                message={warrantyClaimsMessage}
                saving={creatingWarrantyClaim}
                attachments={attachments}
                onUploadAttachment={onUploadAttachment}
                onDeleteAttachment={onDeleteAttachment}
                onDownloadAttachment={onDownloadAttachment}
                uploadingAttachment={uploadingAttachment}
                attachmentUploadProgress={attachmentUploadProgress}
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
                contextRecords={{
                  service: serviceRecords,
                  equipment: vehicleEquipment,
                  insurance: [...insurancePolicies, ...claims],
                  insurance_policy: insurancePolicies,
                  insurance_claim: claims,
                  tires,
                  funding,
                  supplier: suppliers,
                  warranty_claim: warrantyClaims,
                }}
              />
            )}

            {activeModule === 'attachments' && (
              <AttachmentsModule
                attachments={attachments}
                onUploadAttachment={onUploadAttachment}
                onDownloadAttachment={onDownloadAttachment}
                onDeleteAttachment={onDeleteAttachment}
                attachmentsLoading={attachmentsLoading}
                attachmentsError={attachmentsError}
                attachmentMessage={attachmentMessage}
                uploadingAttachment={uploadingAttachment}
                attachmentUploadProgress={attachmentUploadProgress}
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
              />
            )}

            {activeModule === 'history' && (
              <HistoryModule
                cardHistory={cardHistory}
                cardHistoryLoading={cardHistoryLoading}
                cardHistoryError={cardHistoryError}
                lookupByCategory={lookupByCategory}
              />
            )}
          </div>
        </div>
      )}
    </article>
    {!editingBasic && !activeModule ? (
      <VehicleRecentEventsCard
        cardHistory={cardHistory}
        cardHistoryLoading={cardHistoryLoading}
        cardHistoryError={cardHistoryError}
        lookupByCategory={lookupByCategory}
        onShowAll={() => onManageModule?.('history')}
      />
    ) : null}
    </>
  );
}
