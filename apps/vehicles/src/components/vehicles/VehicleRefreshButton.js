import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';

const VehicleRefreshButton = ({ refreshing, handleWebDispecinkRefresh }) => (
  <span
    style={{
      cursor: refreshing ? 'wait' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: '1.45rem',
      color: refreshing ? '#999' : '#1976d2',
      padding: '0.18rem 0.5rem',
      borderRadius: 6,
      transition: 'background 0.2s'
    }}
    title="Aktualizuj data z webDispečinku"
    onClick={refreshing ? undefined : handleWebDispecinkRefresh}
  >
    <FiRefreshCw />
  </span>
);

export default VehicleRefreshButton;
