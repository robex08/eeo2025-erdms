import React from 'react';
import AppIcon from '../../ui/AppIcon';

export default function VehicleModulesDashboard({
  serviceRecords = [],
  vehicleEquipment = [],
  insurancePolicies = [],
  claims = [],
  tires = [],
  funding = [],
  attachments = [],
  onManageModule,
  readOnly = false,
}) {
  const modules = [
    {
      id: 'service',
      title: 'Servisy a opravy',
      icon: 'service',
      count: serviceRecords.length,
      lastItem: serviceRecords[0]
        ? `${serviceRecords[0].service_type_code} - ${serviceRecords[0].service_date || 'bez data'}`
        : null,
      color: '#3b82f6',
    },
    {
      id: 'equipment',
      title: 'Výbava a zařízení',
      icon: 'detail',
      count: vehicleEquipment.length,
      lastItem: vehicleEquipment[0]
        ? `${vehicleEquipment[0].equipment_type_code}`
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
        ? `${tires[0].season_code} - ${tires[0].status_code}`
        : null,
      color: '#6366f1',
    },
    {
      id: 'funding',
      title: 'Dotace a financování',
      icon: 'money',
      count: funding.length,
      lastItem: funding[0]
        ? `${funding[0].funding_status_code}`
        : null,
      color: '#ec4899',
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
              disabled={readOnly}
            >
              Spravovat
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
