function formatDate(value) {
  if (!value) return '-';
  return String(value);
}

export default function VehicleBasicInfoCard({ item }) {
  const manufacturer = item.w_tovarni_znacka || '-';
  const model = item.w_model_vozu || '-';
  const fuelType = item.w_typ_phm || '-';

  return (
    <article className="info-card">
      <h3>Základní údaje</h3>
      <div className="key-value-grid">
        <p><strong>SPZ:</strong> {item.spz || '-'}</p>
        <p><strong>Status:</strong> {item.status || '-'}</p>
        <p><strong>Typ:</strong> {item.zzs_typ || '-'}</p>
        <p><strong>Popis:</strong> {item.w_popis || '-'}</p>
        <p><strong>Výrobce:</strong> {manufacturer}</p>
        <p><strong>Model:</strong> {model}</p>
        <p><strong>Palivo:</strong> {fuelType}</p>
        <p><strong>Poslední aktualizace:</strong> {formatDate(item.last_update)}</p>
      </div>
    </article>
  );
}
