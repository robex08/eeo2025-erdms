import React from 'react';

export default function LookupSelect({
  category,
  lookupByCategory = {},
  value,
  onChange,
  name,
  required = false,
  placeholder = '-- Vyberte --',
  disabled = false,
  fallbackLabel,
}) {
  const items = Array.isArray(lookupByCategory[category]) ? lookupByCategory[category] : [];
  const hasCurrentAsInactive = value && !items.some((it) => it.code === value);

  return (
    <select
      name={name}
      value={value || ''}
      onChange={onChange}
      required={required}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {items
        .filter((it) => it && it.is_active !== 0)
        .map((it) => (
          <option key={it.code} value={it.code}>
            {it.item_name || it.code}
          </option>
        ))}
      {hasCurrentAsInactive && (
        <option value={value}>
          {fallbackLabel ? `${fallbackLabel}: ${value}` : value}
        </option>
      )}
    </select>
  );
}
