import React from "react";

function PartyForm({ title, values, onChange, disabled }) {
  const labelStyle = {
    fontWeight: 500,
    color: '#c3e88d',
    letterSpacing: 0.5,
    fontSize: 14,
    minWidth: 90,
    maxWidth: 120,
    flex: '0 0 120px',
    textAlign: 'right',
    paddingRight: 18
  };
  const inputStyle = {
    flex: '1 1 0',
    minWidth: 320,
    width: '100%',
    padding: '12px 18px',
    borderRadius: 6,
    border: '1.5px solid #444',
    background: '#23272e',
    color: '#fff',
    fontSize: 15,
    outline: 'none',
    transition: 'border 0.2s',
    marginBottom: 0,
    whiteSpace: 'nowrap',
    overflow: 'auto',
  };
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      maxWidth: '1000px',
      background: 'linear-gradient(135deg, #23272e 80%, #2d3140 100%)',
      padding: 38,
      borderRadius: 10,
      border: '1.5px solid #343a40',
      marginBottom: 16,
      boxShadow: '0 2px 16px 0 #0002',
      color: '#f8f8f2',
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }}>
      <h3 style={{ marginTop: 0, marginBottom: 18, fontWeight: 700, letterSpacing: 1, color: '#82aaff', fontSize: 20 }}>{title}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8 }}>
        <label style={labelStyle}>Celé jméno</label>
        <input
          type="text"
          value={values.name}
          onChange={e => onChange({ ...values, name: e.target.value })}
          disabled={disabled}
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8 }}>
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={values.email}
          onChange={e => onChange({ ...values, email: e.target.value })}
          disabled={disabled}
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 0 }}>
        <label style={labelStyle}>Telefon</label>
        <input
          type="tel"
          value={values.phone}
          onChange={e => onChange({ ...values, phone: e.target.value })}
          disabled={disabled}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

export default PartyForm;
