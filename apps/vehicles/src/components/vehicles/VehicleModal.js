import React from 'react';
import '../../styles/components/VehicleModal.css';

export default function VehicleModal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="vehicle-modal-overlay" onClick={onClose}>
      <div className="vehicle-modal-content" onClick={e => e.stopPropagation()}>
        <button className="vehicle-modal-close" onClick={onClose} title="Zavřít">×</button>
        {children}
      </div>
    </div>
  );
}
