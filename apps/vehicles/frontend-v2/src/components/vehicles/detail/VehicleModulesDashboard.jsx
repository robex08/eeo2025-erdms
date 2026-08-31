import React from 'react';
import AppIcon from '../../ui/AppIcon';

function lookupPreviewLabel(lookupByCategory, category, code) {
  const normalizedCode = String(code || '').trim();
  if (normalizedCode === '') {
    return '';
  }

  const items = Array.isArray(lookupByCategory?.[category]) ? lookupByCategory[category] : [];
  const item = items.find((candidate) => candidate && candidate.code === normalizedCode);
  return String(item?.item_name || '').trim();
}

function joinPreviewParts(...values) {
  return values.filter((value) => String(value || '').trim() !== '').join(' - ');
}

export default function VehicleModulesDashboard({
  serviceRecords = [],
  vehicleEquipment = [],
  insurancePolicies = [],
  claims = [],
  tires = [],
  funding = [],
  suppliers = [],
  warrantyClaims = [],
  attachments = [],
  onManageModule,
  lookupByCategory = {},
  readOnly = false,
}) {
  const modules = [
    {
      id: 'service',
      title: 'Servisy a opravy',
      icon: 'service',
      count: serviceRecords.length,
      lastItem: serviceRecords[0]
        ? joinPreviewParts(
          lookupPreviewLabel(lookupByCategory, 'service_type', serviceRecords[0].service_type_code),
          serviceRecords[0].service_date || 'bez data'
        )
        : null,
      color: '#3b82f6',
    },
    {
      id: 'equipment',
      title: 'Výbava a zařízení',
      icon: 'detail',
      count: vehicleEquipment.length,
      lastItem: vehicleEquipment[0]
        ? vehicleEquipment[0].equipment_name || lookupPreviewLabel(lookupByCategory, 'equipment_type', vehicleEquipment[0].equipment_type_code)
        : null,
      color: '#8b5cf6',
    },
    {
      id: 'insurance',
      title: 'Pojištění',
      icon: 'ccsCard',
      count: insurancePolicies.length,
      lastItem: insurancePolicies[0]
        ? `Platnost do ${insurancePolicies[0].valid_to || '-'}`
        : null,
      color: '#10b981',
    },
    {
      id: 'claims',
      title: 'Škodní události',
      icon: 'warning',
      count: claims.length,
      lastItem: claims[0]
        ? `${claims[0].title || 'Bez názvu'}`
        : null,
      color: '#f59e0b',
    },
    {
      id: 'tires',
      title: 'Pneumatiky',
      icon: 'wheel',
      count: tires.length,
      lastItem: tires[0]
        ? joinPreviewParts(
          lookupPreviewLabel(lookupByCategory, 'tire_season', tires[0].season_code),
          lookupPreviewLabel(lookupByCategory, 'tire_status', tires[0].status_code)
        )
        : null,
      color: '#6366f1',
    },
    {
      id: 'funding',
      title: 'Dotace a financování',
      icon: 'money',
      count: funding.length,
      lastItem: funding[0]
        ? lookupPreviewLabel(lookupByCategory, 'grant_title', funding[0].grant_title_code)
          || funding[0].reference_number
          || lookupPreviewLabel(lookupByCategory, 'funding_status', funding[0].funding_status_code)
        : null,
      color: '#ec4899',
    },
    {
      id: 'suppliers',
      title: 'Dodavatelé',
      icon: 'users',
      count: suppliers.length,
      lastItem: suppliers[0]?.supplier_name || null,
      color: '#0ea5e9',
    },
    {
      id: 'warrantyClaims',
      title: 'Záruka a reklamace',
      icon: 'approve',
      count: warrantyClaims.length,
      lastItem: warrantyClaims[0]?.title || null,
      color: '#16a34a',
    },
    {
      id: 'attachments',
      title: 'Přílohy a dokumenty',
      icon: 'file',
      count: attachments.length,
      lastItem: attachments[0]
        ? attachments[0].original_filename
        : null,
      color: '#14b8a6',
    },
  ];

  return (
    <div className="vehicle-modules-dashboard">
      <div className="vehicle-form-header">
        <div>
          <span className="lookup-section-label">MODULY KARTY</span>
          <h3>Správa vozidla</h3>
          <p className="muted">Vyberte modul pro správu údajů</p>
        </div>
      </div>

      <div className="vehicle-modules-grid">
        {modules.map((module) => (
          <div
            key={module.id}
            className="vehicle-module-card"
            style={{ '--module-color': module.color }}
          >
            <div className="vehicle-module-header">
              <div className="vehicle-module-icon" style={{ backgroundColor: module.color }}>
                <AppIcon name={module.icon} size={22} weight="duotone" color="white" />
              </div>
              <div className="vehicle-module-heading">
                <h4>{module.title}</h4>
                <span className="vehicle-module-count-badge" data-empty={module.count === 0}>
                  {module.count === 0 ? 'Žádné záznamy' : `${module.count} ${module.count === 1 ? 'záznam' : module.count < 5 ? 'záznamy' : 'záznamů'}`}
                </span>
              </div>
            </div>
            {module.lastItem && (
              <p className="vehicle-module-preview">{module.lastItem}</p>
            )}
            <button
              type="button"
              className="btn btn-ghost vehicle-module-btn"
              onClick={() => onManageModule?.(module.id)}
            >
              {readOnly ? 'Zobrazit' : 'Spravovat'}
            </button>
          </div>
        ))}

        <div className="vehicle-module-card" style={{ '--module-color': '#64748b' }}>
          <div className="vehicle-module-header">
            <div className="vehicle-module-icon" style={{ backgroundColor: '#64748b' }}>
              <AppIcon name="history" size={22} weight="duotone" color="white" />
            </div>
            <div className="vehicle-module-heading">
              <h4>Historie změn</h4>
              <span className="vehicle-module-count-badge">Audit log karty</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost vehicle-module-btn"
            onClick={() => onManageModule?.('history')}
          >
            Zobrazit historii
          </button>
        </div>
      </div>
    </div>
  );
}
