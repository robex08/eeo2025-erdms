import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchStationAddresses, fetchVehicleDetail, saveVehicleDetail } from '../services/apiClient';
import VehicleBasicInfoCard from '../components/vehicles/detail/VehicleBasicInfoCard';
import VehicleTechnicalFormCard from '../components/vehicles/detail/VehicleTechnicalFormCard';
import { useAuth } from '../auth/AuthContext';

function parseServiceContext(rawValue) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === 'object') {
    return rawValue;
  }

  try {
    const decoded = JSON.parse(String(rawValue));
    return decoded && typeof decoded === 'object' ? decoded : {};
  } catch {
    return {};
  }
}

export default function VehicleDetailPage() {
  const { user } = useAuth();
  const { vehicleId } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [serviceStations, setServiceStations] = useState([]);
  const [form, setForm] = useState({
    zzs_typ: '',
    w_popis: '',
    service_context_name: '',
    service_context_address: '',
    service_context_contact: '',
    service_notes: '',
    technical_notes: '',
    insurance_policy: '',
    stk_valid_to: '',
    emission_valid_to: '',
    equipment_json: '',
  });
  const currentRole = String(user?.role || '').toLowerCase();
  const canEditVehicleDetails = ['superadmin', 'administrator', 'fleet_manager'].includes(currentRole);

  useEffect(() => {
    let active = true;

    fetchVehicleDetail(vehicleId)
      .then((response) => {
        if (!active) return;
        const detail = response?.data?.item || null;
        setItem(detail);
        if (detail) {
          const serviceContext = parseServiceContext(detail.service_context_json);
          setForm({
            zzs_typ: detail.zzs_typ || '',
            w_popis: detail.w_popis || '',
            service_context_name: serviceContext.name || serviceContext.service_name || '',
            service_context_address: serviceContext.address || serviceContext.service_address || '',
            service_context_contact: serviceContext.contact || serviceContext.service_contact || '',
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

  useEffect(() => {
    let active = true;

    fetchStationAddresses()
      .then((response) => {
        if (!active) return;
        const stations = Array.isArray(response?.data?.items) ? response.data.items : [];
        const services = stations.filter((item) => String(item?.typ || '').toLowerCase() === 'servis');
        setServiceStations(services);
      })
      .catch(() => {
        if (!active) return;
        setServiceStations([]);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!canEditVehicleDetails) {
      setSaveMessage('Režim pouze pro čtení: nemáte oprávnění k editaci vozidla.');
      return;
    }
    setError('');
    setSaveMessage('');
    setSaving(true);

    try {
      const serviceContext = {
        name: String(form.service_context_name || '').trim(),
        address: String(form.service_context_address || '').trim(),
        contact: String(form.service_context_contact || '').trim(),
      };

      if (!serviceContext.name && !serviceContext.address && !serviceContext.contact) {
        delete serviceContext.name;
        delete serviceContext.address;
        delete serviceContext.contact;
      }

      const response = await saveVehicleDetail({
        vehicleId: Number(vehicleId),
        ...form,
        service_context_json: Object.keys(serviceContext).length > 0 ? serviceContext : null,
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
          <p className="muted">Editační karta je rozdělena do sekcí Základní parametry, Technika, Servisy a Přílohy.</p>
        </div>
        <Link className="btn btn-ghost" to="/vehicles">
          Zpět na přehled
        </Link>
      </div>

      <div className="cards-grid detail-grid">
        <VehicleBasicInfoCard item={item} />
        <VehicleTechnicalFormCard
          item={item}
          serviceStations={serviceStations}
          form={form}
          onChange={handleChange}
          onSubmit={handleSave}
          saving={saving}
          saveMessage={saveMessage}
          readOnly={!canEditVehicleDetails}
        />
      </div>
    </section>
  );
}
