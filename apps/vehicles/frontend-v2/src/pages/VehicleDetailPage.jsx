import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchVehicleDetail, saveVehicleDetail } from '../services/apiClient';
import VehicleBasicInfoCard from '../components/vehicles/detail/VehicleBasicInfoCard';
import VehicleTechnicalFormCard from '../components/vehicles/detail/VehicleTechnicalFormCard';

export default function VehicleDetailPage() {
  const { vehicleId } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    zzs_typ: '',
    service_notes: '',
    technical_notes: '',
    insurance_policy: '',
    stk_valid_to: '',
    emission_valid_to: '',
    equipment_json: '',
  });

  useEffect(() => {
    let active = true;

    fetchVehicleDetail(vehicleId)
      .then((response) => {
        if (!active) return;
        const detail = response?.data?.item || null;
        setItem(detail);
        if (detail) {
          setForm({
            zzs_typ: detail.zzs_typ || '',
            service_notes: detail.service_notes || '',
            technical_notes: detail.technical_notes || '',
            insurance_policy: detail.insurance_policy || '',
            stk_valid_to: detail.stk_valid_to || '',
            emission_valid_to: detail.emission_valid_to || '',
            equipment_json: detail.equipment_json || '',
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        const apiMessage = err?.response?.data?.error?.message;
        setError(apiMessage || 'Detail vozidla se nepodařilo načíst.');
      });

    return () => {
      active = false;
    };
  }, [vehicleId]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setError('');
    setSaveMessage('');
    setSaving(true);

    try {
      const response = await saveVehicleDetail({
        vehicleId: Number(vehicleId),
        ...form,
      });

      const updated = response?.data?.item || null;
      if (updated) {
        setItem(updated);
      }

      setSaveMessage(response?.data?.message || 'Detail vozidla byl uložen.');
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setError(apiMessage || 'Uložení detailu vozidla se nepodařilo.');
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <section>
        <h2>Detail vozidla</h2>
        <div className="error-box">{error}</div>
        <Link className="btn btn-ghost" to="/vehicles">
          Zpět na přehled
        </Link>
      </section>
    );
  }

  if (!item) {
    return (
      <section>
        <h2>Detail vozidla</h2>
        <p className="muted">Načítám detail...</p>
      </section>
    );
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Detail vozidla {item.spz}</h2>
          <p className="muted">Připraveno pro budoucí rozšíření karty vozidla.</p>
        </div>
        <Link className="btn btn-ghost" to="/vehicles">
          Zpět na přehled
        </Link>
      </div>

      <div className="cards-grid detail-grid">
        <VehicleBasicInfoCard item={item} />
        <VehicleTechnicalFormCard
          form={form}
          onChange={handleChange}
          onSubmit={handleSave}
          saving={saving}
          saveMessage={saveMessage}
        />
      </div>
    </section>
  );
}
