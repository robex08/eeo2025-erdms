import React, { useState } from 'react';
import VehicleModulesDashboard from './VehicleModulesDashboard';
import VehicleRecentEventsCard from './VehicleRecentEventsCard';
import ServiceRecordsModule from './modules/ServiceRecordsModule';
import EquipmentModule from './modules/EquipmentModule';
import InsuranceModule from './modules/InsuranceModule';
import TiresModule from './modules/TiresModule';
import FundingModule from './modules/FundingModule';
import AttachmentsModule from './modules/AttachmentsModule';
import HistoryModule from './modules/HistoryModule';
import LookupSelect from './modules/LookupSelect';
import AppIcon from '../../ui/AppIcon';

function formatValue(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '-';
  }
  return String(value);
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('cs-CZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export default function VehicleTechnicalFormCard({ 
  activeModule, 
  onManageModule, 
  onCloseModule, 
  item, 
  form, 
  onChange, 
  onSubmit, 
  saving, 
  saveMessage, 
  isDirty = false, 
  onReset,
  serviceRecords = [],
  serviceRecordsLoading,
  serviceRecordsError,
  serviceRecordMessage,
  creatingServiceRecord,
  onCreateServiceRecord,
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
  attachments = [],
  attachmentsLoading,
  attachmentsError,
  attachmentMessage,
  uploadingAttachment,
  onUploadAttachment,
  onDownloadAttachment,
  onDeleteAttachment,
  cardHistory = [],
  cardHistoryLoading,
  cardHistoryError,
  editingBasic = false,
  onEditingBasicChange,
  lookupByCategory = {},
  readOnly = false,
}) {
  return (
    <>
    <article className="info-card vehicle-edit-card" id="karta">
      {/* Editace základních údajů */}
      {editingBasic ? (
        <form
          className="detail-form"
          onSubmit={async (event) => {
            await onSubmit(event);
            onEditingBasicChange?.(false);
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
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label htmlFor="evidencni_cislo_zzs">
                Evidenční číslo ZZS
                <input 
                  id="evidencni_cislo_zzs" 
                  name="evidencni_cislo_zzs" 
                  value={form.evidencni_cislo_zzs || ''} 
                  onChange={onChange} 
                />
              </label>

              <label htmlFor="vin">
                VIN
                <input 
                  id="vin" 
                  name="vin" 
                  value={form.vin || ''} 
                  onChange={onChange} 
                />
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
                />
              </label>

              <label htmlFor="acquisition_supplier">
                Dodavatel
                <input 
                  id="acquisition_supplier" 
                  name="acquisition_supplier" 
                  value={form.acquisition_supplier || ''} 
                  onChange={onChange} 
                />
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

            {saveMessage && <div className="status-box">{saveMessage}</div>}
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
            attachments={attachments}
            onManageModule={onManageModule}
            readOnly={readOnly}
          />
        </div>
      ) : (
        /* Detail modulu */
        <div style={{ marginTop: '1.5rem' }}>
          <div className="vehicle-form-header">
            <h4>
              {activeModule === 'service' ? 'Servisy a opravy' :
               activeModule === 'equipment' ? 'Výbava a zařízení' :
               activeModule === 'insurance' ? 'Pojištění a škody' :
               activeModule === 'tires' ? 'Pneumatiky' :
               activeModule === 'funding' ? 'Dotace a financování' :
               activeModule === 'attachments' ? 'Přílohy' :
               activeModule === 'history' ? 'Historie změn' :
               'Detail'}
            </h4>
            <button type="button" className="btn btn-ghost btn-sm btn-back-icon" onClick={onCloseModule} title="Zpět na přehled modulů">
              <AppIcon name="arrowLeft" size={18} weight="regular" />
            </button>
          </div>

          <div style={{ marginTop: '1rem' }}>
            {activeModule === 'service' && (
              <ServiceRecordsModule
                serviceRecords={serviceRecords}
                onCreateServiceRecord={onCreateServiceRecord}
                onDeleteServiceRecord={onDeleteServiceRecord}
                serviceRecordsLoading={serviceRecordsLoading}
                serviceRecordsError={serviceRecordsError}
                serviceRecordMessage={serviceRecordMessage}
                creatingServiceRecord={creatingServiceRecord}
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
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
              />
            )}

            {activeModule === 'insurance' && (
              <InsuranceModule
                insurancePolicies={insurancePolicies}
                claims={claims}
                onCreateInsurancePolicy={onCreateInsurancePolicy}
                onDeleteInsurancePolicy={onDeleteInsurancePolicy}
                onCreateClaim={onCreateClaim}
                onDeleteClaim={onDeleteClaim}
                insuranceLoading={insuranceLoading}
                insuranceError={insuranceError}
                insuranceMessage={insuranceMessage}
                creatingInsurance={creatingInsurance}
                creatingClaim={creatingClaim}
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
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
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
                readOnly={readOnly}
                lookupByCategory={lookupByCategory}
              />
            )}

            {activeModule === 'history' && (
              <HistoryModule
                cardHistory={cardHistory}
                cardHistoryLoading={cardHistoryLoading}
                cardHistoryError={cardHistoryError}
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
        onShowAll={() => onManageModule?.('history')}
      />
    ) : null}
    </>
  );
}
