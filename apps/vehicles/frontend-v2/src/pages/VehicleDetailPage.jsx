import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import AppIcon from '../components/ui/AppIcon';
import WdBadge from '../components/vehicles/detail/modules/WdBadge';
import {
  createStationAddress,
  fetchStationAddresses,
  fetchVehicleAttachments,
  fetchVehicleCardHistory,
  fetchVehicleDetail,
  fetchVehicleServiceRecords,
  createVehicleServiceRecord,
  updateVehicleServiceRecord,
  deleteVehicleServiceRecord,
  fetchVehicleEquipment,
  createVehicleEquipment,
  updateVehicleEquipment,
  deleteVehicleEquipment,
  fetchVehicleInsurancePolicies,
  createVehicleInsurancePolicy,
  updateVehicleInsurancePolicy,
  deleteVehicleInsurancePolicy,
  fetchVehicleClaims,
  createVehicleClaim,
  updateVehicleClaim,
  deleteVehicleClaim,
  fetchVehicleTires,
  createVehicleTires,
  updateVehicleTires,
  deleteVehicleTires,
  fetchVehicleFunding,
  createVehicleFunding,
  updateVehicleFunding,
  deleteVehicleFunding,
  fetchVehicleSuppliers,
  createVehicleSupplier,
  updateVehicleSupplier,
  deleteVehicleSupplier,
  fetchVehicleWarrantyClaims,
  createVehicleWarrantyClaim,
  updateVehicleWarrantyClaim,
  deleteVehicleWarrantyClaim,
  fetchLookupItems,
  deleteVehicleAttachment,
  downloadVehicleAttachment,
  uploadVehicleAttachment,
  saveVehicleDetail,
} from '../services/apiClient';
import VehicleTechnicalFormCard from '../components/vehicles/detail/VehicleTechnicalFormCard';
import { useAuth } from '../auth/AuthContext';
import { usePersistentDialog } from '../components/ui/PersistentDialog';

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

function formatCcsExpiration(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '-';
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('cs-CZ');
}

export default function VehicleDetailPage() {
  const { user } = useAuth();
  const { confirm } = usePersistentDialog();
  const { vehicleId } = useParams();
  const location = useLocation();
  const [item, setItem] = useState(null);
  const [editingBasic, setEditingBasic] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [cardHistory, setCardHistory] = useState([]);
  const [cardHistoryLoading, setCardHistoryLoading] = useState(false);
  const [cardHistoryError, setCardHistoryError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState('');
  const [attachmentMessage, setAttachmentMessage] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(null);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [serviceRecordsLoading, setServiceRecordsLoading] = useState(false);
  const [serviceRecordsError, setServiceRecordsError] = useState('');
  const [serviceRecordMessage, setServiceRecordMessage] = useState('');
  const [creatingServiceRecord, setCreatingServiceRecord] = useState(false);
  const [vehicleEquipment, setVehicleEquipment] = useState([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [equipmentError, setEquipmentError] = useState('');
  const [equipmentMessage, setEquipmentMessage] = useState('');
  const [creatingEquipment, setCreatingEquipment] = useState(false);
  const [insurancePolicies, setInsurancePolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [insuranceError, setInsuranceError] = useState('');
  const [insuranceMessage, setInsuranceMessage] = useState('');
  const [creatingInsurance, setCreatingInsurance] = useState(false);
  const [creatingClaim, setCreatingClaim] = useState(false);
  const [tires, setTires] = useState([]);
  const [tiresLoading, setTiresLoading] = useState(false);
  const [tiresError, setTiresError] = useState('');
  const [tiresMessage, setTiresMessage] = useState('');
  const [creatingTires, setCreatingTires] = useState(false);
  const [funding, setFunding] = useState([]);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [fundingError, setFundingError] = useState('');
  const [fundingMessage, setFundingMessage] = useState('');
  const [creatingFunding, setCreatingFunding] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState('');
  const [suppliersMessage, setSuppliersMessage] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [warrantyClaims, setWarrantyClaims] = useState([]);
  const [warrantyClaimsLoading, setWarrantyClaimsLoading] = useState(false);
  const [warrantyClaimsError, setWarrantyClaimsError] = useState('');
  const [warrantyClaimsMessage, setWarrantyClaimsMessage] = useState('');
  const [creatingWarrantyClaim, setCreatingWarrantyClaim] = useState(false);
  const [lookupByCategory, setLookupByCategory] = useState({});
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
    evidencni_cislo_zzs: '',
    vin: '',
    acquisition_year: '',
    acquisition_supplier: '',
    warranty_valid_to: '',
    acquisition_price: '',
    technical_condition_code: '',
    service_interval_km: '',
    service_interval_months: '',
    battery_condition_code: '',
    vehicle_lifetime_percent: '',
    equipment_json: '',
  });
  const [savedForm, setSavedForm] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [appliedRequestedTab, setAppliedRequestedTab] = useState(null);
  const currentRole = String(user?.role || '').toLowerCase();
  const canEditVehicleDetails = ['superadmin', 'administrator', 'fleet_manager'].includes(currentRole);
  const requestedTab = new URLSearchParams(location.search).get('tab') || null;
  const navigate = useNavigate();

  const handleBackToPreviousView = useCallback(() => {
    const returnTo = location.state && typeof location.state === 'object' ? location.state.returnTo : null;

    if (typeof returnTo === 'string' && returnTo.trim() !== '') {
      navigate(returnTo);
      return;
    }

    if (returnTo && typeof returnTo === 'object') {
      const pathname = typeof returnTo.pathname === 'string' ? returnTo.pathname : '/vehicles';
      const search = typeof returnTo.search === 'string' ? returnTo.search : '';
      const hash = typeof returnTo.hash === 'string' ? returnTo.hash : '';
      navigate(`${pathname}${search}${hash}`);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/vehicles');
  }, [location.state, navigate]);

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
            evidencni_cislo_zzs: detail.evidencni_cislo_zzs || '',
            vin: detail.vin || '',
            acquisition_year: detail.acquisition_year || '',
            acquisition_supplier: detail.acquisition_supplier || '',
            warranty_valid_to: detail.warranty_valid_to || '',
            acquisition_price: detail.acquisition_price || '',
            technical_condition_code: detail.technical_condition_code || '',
            service_interval_km: detail.service_interval_km || '',
            service_interval_months: detail.service_interval_months || '',
            battery_condition_code: detail.battery_condition_code || '',
            vehicle_lifetime_percent: detail.vehicle_lifetime_percent || '',
            equipment_json: detail.equipment_json || '',
          });
          setSavedForm({
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
            evidencni_cislo_zzs: detail.evidencni_cislo_zzs || '',
            vin: detail.vin || '',
            acquisition_year: detail.acquisition_year || '',
            acquisition_supplier: detail.acquisition_supplier || '',
            warranty_valid_to: detail.warranty_valid_to || '',
            acquisition_price: detail.acquisition_price || '',
            technical_condition_code: detail.technical_condition_code || '',
            service_interval_km: detail.service_interval_km || '',
            service_interval_months: detail.service_interval_months || '',
            battery_condition_code: detail.battery_condition_code || '',
            vehicle_lifetime_percent: detail.vehicle_lifetime_percent || '',
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

  const loadInsuranceData = useCallback(async () => {
    setInsuranceLoading(true);
    setInsuranceError('');
    try {
      const [policiesResponse, claimsResponse] = await Promise.all([
        fetchVehicleInsurancePolicies(vehicleId),
        fetchVehicleClaims(vehicleId),
      ]);
      setInsurancePolicies(Array.isArray(policiesResponse?.data?.items) ? policiesResponse.data.items : []);
      setClaims(Array.isArray(claimsResponse?.data?.items) ? claimsResponse.data.items : []);
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setInsuranceError(apiMessage || 'Pojištění a škody se nepodařilo načíst.');
    } finally {
      setInsuranceLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void loadInsuranceData();
  }, [loadInsuranceData]);

  const loadTires = useCallback(async () => {
    setTiresLoading(true);
    setTiresError('');
    try {
      const response = await fetchVehicleTires(vehicleId);
      setTires(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setTiresError(apiMessage || 'Pneumatiky se nepodařilo načíst.');
    } finally {
      setTiresLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void loadTires();
  }, [loadTires]);

  const loadFunding = useCallback(async () => {
    setFundingLoading(true);
    setFundingError('');
    try {
      const response = await fetchVehicleFunding(vehicleId);
      setFunding(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setFundingError(apiMessage || 'Financování se nepodařilo načíst.');
    } finally {
      setFundingLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { void loadFunding(); }, [loadFunding]);

  const loadSuppliers = useCallback(async () => {
    setSuppliersLoading(true);
    setSuppliersError('');
    try {
      const response = await fetchVehicleSuppliers(vehicleId);
      setSuppliers(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      setSuppliersError(err?.response?.data?.error?.message || 'Dodavatele se nepodařilo načíst.');
    } finally {
      setSuppliersLoading(false);
    }
  }, [vehicleId]);

  const loadWarrantyClaims = useCallback(async () => {
    setWarrantyClaimsLoading(true);
    setWarrantyClaimsError('');
    try {
      const response = await fetchVehicleWarrantyClaims(vehicleId);
      setWarrantyClaims(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      setWarrantyClaimsError(err?.response?.data?.error?.message || 'Záruky a reklamace se nepodařilo načíst.');
    } finally {
      setWarrantyClaimsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { void loadSuppliers(); }, [loadSuppliers]);
  useEffect(() => { void loadWarrantyClaims(); }, [loadWarrantyClaims]);

  useEffect(() => {
    let active = true;
    fetchLookupItems()
      .then((response) => {
        if (!active) return;
        const grouped = {};
        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        items.forEach((lookup) => {
          const category = String(lookup.category || '').trim();
          if (!category) return;
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push(lookup);
        });
        setLookupByCategory(grouped);
      })
      .catch(() => {
        if (active) setLookupByCategory({});
      });
    return () => {
      active = false;
    };
  }, []);

  async function loadEquipment() {
    setEquipmentLoading(true);
    setEquipmentError('');
    try {
      const response = await fetchVehicleEquipment(vehicleId);
      setVehicleEquipment(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setEquipmentError(apiMessage || 'Vybavení se nepodařilo načíst.');
    } finally {
      setEquipmentLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    setEquipmentLoading(true);
    fetchVehicleEquipment(vehicleId)
      .then((response) => {
        if (active) setVehicleEquipment(Array.isArray(response?.data?.items) ? response.data.items : []);
      })
      .catch((err) => {
        if (active) {
          const apiMessage = err?.response?.data?.error?.message;
          setEquipmentError(apiMessage || 'Vybavení se nepodařilo načíst.');
        }
      })
      .finally(() => {
        if (active) setEquipmentLoading(false);
      });
    return () => {
      active = false;
    };
  }, [vehicleId]);

  async function loadServiceRecords() {
    setServiceRecordsLoading(true);
    setServiceRecordsError('');
    try {
      const response = await fetchVehicleServiceRecords(vehicleId);
      setServiceRecords(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setServiceRecordsError(apiMessage || 'Servisní záznamy se nepodařilo načíst.');
    } finally {
      setServiceRecordsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    setServiceRecordsLoading(true);
    fetchVehicleServiceRecords(vehicleId)
      .then((response) => {
        if (active) setServiceRecords(Array.isArray(response?.data?.items) ? response.data.items : []);
      })
      .catch((err) => {
        if (active) {
          const apiMessage = err?.response?.data?.error?.message;
          setServiceRecordsError(apiMessage || 'Servisní záznamy se nepodařilo načíst.');
        }
      })
      .finally(() => {
        if (active) setServiceRecordsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [vehicleId]);

  async function loadAttachments() {
    setAttachmentsLoading(true);
    setAttachmentsError('');
    try {
      const response = await fetchVehicleAttachments(vehicleId);
      setAttachments(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setAttachmentsError(apiMessage || 'Přílohy se nepodařilo načíst.');
    } finally {
      setAttachmentsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    setAttachmentsLoading(true);
    fetchVehicleAttachments(vehicleId)
      .then((response) => {
        if (active) setAttachments(Array.isArray(response?.data?.items) ? response.data.items : []);
      })
      .catch((err) => {
        if (active) {
          const apiMessage = err?.response?.data?.error?.message;
          setAttachmentsError(apiMessage || 'Přílohy se nepodařilo načíst.');
        }
      })
      .finally(() => {
        if (active) setAttachmentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [vehicleId]);

  const loadCardHistory = useCallback(async () => {
    setCardHistoryLoading(true);
    setCardHistoryError('');
    try {
      const response = await fetchVehicleCardHistory(vehicleId, { limit: 500 });
      setCardHistory(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setCardHistoryError(apiMessage || 'Historii změn se nepodařilo načíst.');
    } finally {
      setCardHistoryLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void loadCardHistory();
  }, [loadCardHistory]);

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
    setValidationErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!canEditVehicleDetails) {
      setSaveMessage('Režim pouze pro čtení: nemáte oprávnění k editaci vozidla.');
      return false;
    }
    setError('');
    setSaveMessage('');
    const nextErrors = {};
    const year = form.acquisition_year === '' ? null : Number(form.acquisition_year);
    const price = form.acquisition_price === '' ? null : Number(form.acquisition_price);
    const intervalKm = form.service_interval_km === '' ? null : Number(form.service_interval_km);
    const intervalMonths = form.service_interval_months === '' ? null : Number(form.service_interval_months);
    const lifetime = form.vehicle_lifetime_percent === '' ? null : Number(form.vehicle_lifetime_percent);
    if (form.vin && !/^[A-HJ-NPR-Z0-9]{11,17}$/i.test(String(form.vin).trim())) {
      nextErrors.vin = 'VIN musí obsahovat 11 až 17 znaků bez mezer.';
    }
    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) nextErrors.acquisition_year = 'Rok musí být v rozsahu 1900 až 2100.';
    if (price !== null && (!Number.isFinite(price) || price < 0)) nextErrors.acquisition_price = 'Cena musí být nezáporné číslo.';
    if (intervalKm !== null && (!Number.isInteger(intervalKm) || intervalKm < 0)) nextErrors.service_interval_km = 'Interval musí být celé nezáporné číslo.';
    if (intervalMonths !== null && (!Number.isInteger(intervalMonths) || intervalMonths < 0)) nextErrors.service_interval_months = 'Interval musí být celé nezáporné číslo.';
    if (lifetime !== null && (!Number.isFinite(lifetime) || lifetime < 0 || lifetime > 100)) nextErrors.vehicle_lifetime_percent = 'Životnost musí být mezi 0 a 100 %.';
    if (form.stk_valid_to && form.emission_valid_to && form.stk_valid_to < form.emission_valid_to) nextErrors.emission_valid_to = 'Emise nemohou platit déle než STK.';
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSaveMessage('Opravte prosím zvýrazněná pole.');
      return false;
    }
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

      setSavedForm({ ...form });

      setSaveMessage(response?.data?.message || 'Detail vozidla byl uložen.');
      setValidationErrors({});
      await loadCardHistory();
      return true;
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setError(apiMessage || 'Uložení detailu vozidla se nepodařilo.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  const isDirty = Boolean(savedForm && JSON.stringify(savedForm) !== JSON.stringify(form));

  async function resetForm() {
    if (!savedForm || !(await confirm({ title: 'Zahodit změny', message: 'Opravdu zahodit všechny neuložené změny?', confirmLabel: 'Zahodit', danger: true }))) return;
    setForm({ ...savedForm });
    setSaveMessage('Neuložené změny byly zahozeny.');
    setError('');
  }

  async function handleUploadAttachment({ file, classKey, note, contextModule = 'vehicle', contextRecordId = null }) {
    if (!file) {
      throw new Error('Nebyl vybrán soubor přílohy.');
    }
    if (!canEditVehicleDetails) {
      const permissionMessage = 'Nemáte oprávnění nahrávat přílohy k tomuto vozidlu.';
      setAttachmentsError(permissionMessage);
      throw new Error(permissionMessage);
    }
    setUploadingAttachment(true);
    setAttachmentUploadProgress(0);
    setAttachmentMessage('');
    setAttachmentsError('');
    try {
      const payload = new FormData();
      payload.append('vehicleId', String(vehicleId));
      payload.append('document_type_code', classKey);
      payload.append('context_module', contextModule);
      if (contextRecordId) payload.append('context_record_id', String(contextRecordId));
      payload.append('note', note || '');
      payload.append('file', file);
      const response = await uploadVehicleAttachment(payload, {
        onUploadProgress: (event) => {
          const total = Number(event?.total || file.size || 0);
          const loaded = Number(event?.loaded || 0);
          if (total > 0) {
            const next = Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
            setAttachmentUploadProgress(next);
          }
        },
      });
      setAttachmentMessage(response?.data?.message || 'Příloha byla uložena.');
      await loadAttachments();
      await loadCardHistory();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setAttachmentsError(apiMessage || 'Přílohu se nepodařilo uložit.');
      throw err;
    } finally {
      setUploadingAttachment(false);
      setAttachmentUploadProgress(null);
    }
  }

  async function handleDownloadAttachment(attachment) {
    try {
      const response = await downloadVehicleAttachment(attachment.id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.original_filename || 'priloha';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setAttachmentsError(apiMessage || 'Přílohu se nepodařilo stáhnout.');
    }
  }

  async function handleDeleteAttachment(attachment) {
    if (!canEditVehicleDetails) {
      return;
    }

    try {
      setAttachmentsError('');
      const response = await deleteVehicleAttachment(attachment.id);
      setAttachmentMessage(response?.data?.message || 'Příloha byla označena jako smazaná.');
      await loadAttachments();
      await loadCardHistory();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setAttachmentsError(apiMessage || 'Přílohu se nepodařilo smazat.');
    }
  }

  async function handleCreateServiceRecord(payload) {
    if (!canEditVehicleDetails) return;
    setCreatingServiceRecord(true);
    setServiceRecordMessage('');
    setServiceRecordsError('');
    try {
      const response = payload?.id
        ? await updateVehicleServiceRecord({ id: payload.id, ...payload })
        : await createVehicleServiceRecord({ vehicleId: Number(vehicleId), ...payload });
      setServiceRecordMessage(response?.data?.message || (payload?.id ? 'Servisní záznam byl upraven.' : 'Servisní záznam byl uložen.'));
      await loadServiceRecords();
      await loadCardHistory();
      return response?.data?.item || { id: response?.data?.id };
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setServiceRecordsError(apiMessage || 'Servisní záznam se nepodařilo uložit.');
    } finally {
      setCreatingServiceRecord(false);
    }
  }

  async function handleCreateServiceStation(payload) {
    const response = await createStationAddress({ ...payload, typ: 'Servis' });
    const station = response?.data?.item;
    if (!station) {
      throw new Error('Nový servis se nepodařilo načíst.');
    }
    setServiceStations((previous) => [...previous, station]);
    return station;
  }

  async function handleDeleteServiceRecord(record) {
    if (!canEditVehicleDetails || !record?.id) return;
    setServiceRecordsError('');
    try {
      const response = await deleteVehicleServiceRecord(record.id);
      setServiceRecordMessage(response?.data?.message || 'Servisní záznam byl smazán.');
      await loadServiceRecords();
      await loadCardHistory();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setServiceRecordsError(apiMessage || 'Servisní záznam se nepodařilo smazat.');
    }
  }

  async function handleCreateEquipment(payload) {
    if (!canEditVehicleDetails) return;
    setCreatingEquipment(true);
    setEquipmentMessage('');
    setEquipmentError('');
    try {
      const response = payload?.id
        ? await updateVehicleEquipment({ id: payload.id, ...payload })
        : await createVehicleEquipment({ vehicleId: Number(vehicleId), ...payload });
      setEquipmentMessage(response?.data?.message || (payload?.id ? 'Vybavení bylo upraveno.' : 'Vybavení bylo uloženo.'));
      await loadEquipment();
      await loadCardHistory();
      return response?.data?.item || { id: response?.data?.id };
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setEquipmentError(apiMessage || 'Vybavení se nepodařilo uložit.');
    } finally {
      setCreatingEquipment(false);
    }
  }

  async function handleDeleteEquipment(equipment) {
    if (!canEditVehicleDetails || !equipment?.id) return;
    setEquipmentError('');
    try {
      const response = await deleteVehicleEquipment(equipment.id);
      setEquipmentMessage(response?.data?.message || 'Vybavení bylo smazáno.');
      await loadEquipment();
      await loadCardHistory();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setEquipmentError(apiMessage || 'Vybavení se nepodařilo smazat.');
    }
  }

  async function handleCreateInsurancePolicy(payload) {
    if (!canEditVehicleDetails) return;
    setCreatingInsurance(true);
    setInsuranceMessage('');
    setInsuranceError('');
    try {
      const response = payload?.id
        ? await updateVehicleInsurancePolicy({ id: payload.id, ...payload })
        : await createVehicleInsurancePolicy({ vehicleId: Number(vehicleId), ...payload });
      setInsuranceMessage(response?.data?.message || (payload?.id ? 'Pojistná smlouva byla upravena.' : 'Pojistná smlouva byla uložena.'));
      await loadInsuranceData();
      await loadCardHistory();
      return response?.data?.item || { id: response?.data?.id };
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setInsuranceError(apiMessage || 'Pojistnou smlouvu se nepodařilo uložit.');
    } finally {
      setCreatingInsurance(false);
    }
  }

  async function handleDeleteInsurancePolicy(policy) {
    if (!canEditVehicleDetails || !policy?.id) return;
    setInsuranceError('');
    try {
      const response = await deleteVehicleInsurancePolicy(policy.id);
      setInsuranceMessage(response?.data?.message || 'Pojistná smlouva byla smazána.');
      await loadInsuranceData();
      await loadCardHistory();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setInsuranceError(apiMessage || 'Pojistnou smlouvu se nepodařilo smazat.');
    }
  }

  async function handleCreateClaim(payload) {
    if (!canEditVehicleDetails) return;
    setCreatingClaim(true);
    setInsuranceMessage('');
    setInsuranceError('');
    try {
      const response = payload?.id
        ? await updateVehicleClaim({ id: payload.id, ...payload })
        : await createVehicleClaim({ vehicleId: Number(vehicleId), ...payload });
      setInsuranceMessage(response?.data?.message || (payload?.id ? 'Škodní událost byla upravena.' : 'Škodní událost byla uložena.'));
      await loadInsuranceData();
      await loadCardHistory();
      return response?.data?.item || { id: response?.data?.id };
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setInsuranceError(apiMessage || 'Škodní událost se nepodařilo uložit.');
    } finally {
      setCreatingClaim(false);
    }
  }

  async function handleDeleteClaim(claim) {
    if (!canEditVehicleDetails || !claim?.id) return;
    setInsuranceError('');
    try {
      const response = await deleteVehicleClaim(claim.id);
      setInsuranceMessage(response?.data?.message || 'Škodní událost byla smazána.');
      await loadInsuranceData();
      await loadCardHistory();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setInsuranceError(apiMessage || 'Škodní událost se nepodařilo smazat.');
    }
  }

  async function handleCreateTires(payload) {
    if (!canEditVehicleDetails) return;
    setCreatingTires(true);
    setTiresMessage('');
    setTiresError('');
    try {
      const response = payload?.id
        ? await updateVehicleTires({ id: payload.id, ...payload })
        : await createVehicleTires({ vehicleId: Number(vehicleId), ...payload });
      setTiresMessage(response?.data?.message || (payload?.id ? 'Sada pneumatik byla upravena.' : 'Sada pneumatik byla uložena.'));
      await loadTires();
      await loadCardHistory();
      return response?.data?.item || { id: response?.data?.id };
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setTiresError(apiMessage || 'Sadu pneumatik se nepodařilo uložit.');
    } finally {
      setCreatingTires(false);
    }
  }

  async function handleDeleteTires(tire) {
    if (!canEditVehicleDetails || !tire?.id) return;
    setTiresError('');
    try {
      const response = await deleteVehicleTires(tire.id);
      setTiresMessage(response?.data?.message || 'Sada pneumatik byla smazána.');
      await loadTires();
      await loadCardHistory();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setTiresError(apiMessage || 'Sadu pneumatik se nepodařilo smazat.');
    }
  }

  async function handleCreateFunding(payload) {
    if (!canEditVehicleDetails) return;
    setCreatingFunding(true);
    setFundingMessage('');
    setFundingError('');
    try {
      const response = payload?.id
        ? await updateVehicleFunding({ id: payload.id, ...payload })
        : await createVehicleFunding({ vehicleId: Number(vehicleId), ...payload });
      setFundingMessage(response?.data?.message || (payload?.id ? 'Financování bylo upraveno.' : 'Financování bylo uloženo.'));
      await loadFunding();
      await loadCardHistory();
      return response?.data?.item || { id: response?.data?.id };
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setFundingError(apiMessage || 'Financování se nepodařilo uložit.');
    } finally {
      setCreatingFunding(false);
    }
  }

  async function handleDeleteFunding(fundingItem) {
    if (!canEditVehicleDetails || !fundingItem?.id) return;
    setFundingError('');
    try {
      const response = await deleteVehicleFunding(fundingItem.id);
      setFundingMessage(response?.data?.message || 'Financování bylo smazáno.');
      await loadFunding();
      await loadCardHistory();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setFundingError(apiMessage || 'Financování se nepodařilo smazat.');
    }
  }

  async function handleSaveSupplier(payload) {
    if (!canEditVehicleDetails) return null;
    setCreatingSupplier(true); setSuppliersError(''); setSuppliersMessage('');
    try {
      const response = payload?.id ? await updateVehicleSupplier(payload) : await createVehicleSupplier({ vehicleId: Number(vehicleId), ...payload });
      setSuppliersMessage(response?.data?.message || 'Dodavatel byl uložen.');
      await Promise.all([loadSuppliers(), loadCardHistory()]);
      return response?.data?.item || { id: response?.data?.id };
    } catch (err) {
      setSuppliersError(err?.response?.data?.error?.message || 'Dodavatele se nepodařilo uložit.');
      return null;
    } finally { setCreatingSupplier(false); }
  }

  async function handleDeleteSupplier(supplier) {
    if (!canEditVehicleDetails || !supplier?.id) return;
    setSuppliersError('');
    try {
      const response = await deleteVehicleSupplier(supplier.id);
      setSuppliersMessage(response?.data?.message || 'Dodavatel byl smazán.');
      await Promise.all([loadSuppliers(), loadWarrantyClaims(), loadAttachments(), loadCardHistory()]);
    } catch (err) { setSuppliersError(err?.response?.data?.error?.message || 'Dodavatele se nepodařilo smazat.'); }
  }

  async function handleSaveWarrantyClaim(payload) {
    if (!canEditVehicleDetails) return null;
    setCreatingWarrantyClaim(true); setWarrantyClaimsError(''); setWarrantyClaimsMessage('');
    try {
      const response = payload?.id ? await updateVehicleWarrantyClaim(payload) : await createVehicleWarrantyClaim({ vehicleId: Number(vehicleId), ...payload });
      setWarrantyClaimsMessage(response?.data?.message || 'Záruka nebo reklamace byla uložena.');
      await Promise.all([loadWarrantyClaims(), loadCardHistory()]);
      return response?.data?.item || { id: response?.data?.id };
    } catch (err) {
      setWarrantyClaimsError(err?.response?.data?.error?.message || 'Záruku nebo reklamaci se nepodařilo uložit.');
      return null;
    } finally { setCreatingWarrantyClaim(false); }
  }

  async function handleDeleteWarrantyClaim(record) {
    if (!canEditVehicleDetails || !record?.id) return;
    setWarrantyClaimsError('');
    try {
      const response = await deleteVehicleWarrantyClaim(record.id);
      setWarrantyClaimsMessage(response?.data?.message || 'Záznam záruky nebo reklamace byl smazán.');
      await Promise.all([loadWarrantyClaims(), loadAttachments(), loadCardHistory()]);
    } catch (err) { setWarrantyClaimsError(err?.response?.data?.error?.message || 'Záznam se nepodařilo smazat.'); }
  }

  function handleManageModule(moduleId) {
    setActiveModule(moduleId);
  }

  function handleCloseModule() {
    setActiveModule(null);
    if (requestedTab) {
      const nextSearch = new URLSearchParams(location.search);
      nextSearch.delete('tab');
      navigate({ pathname: location.pathname, search: nextSearch.toString() ? `?${nextSearch.toString()}` : '' }, { replace: true });
    }
  }

  // Auto-open module from URL parameter on first render
  useEffect(() => {
    if (requestedTab && requestedTab !== appliedRequestedTab && !activeModule) {
      setActiveModule(requestedTab);
      setAppliedRequestedTab(requestedTab);
    }
  }, [requestedTab, appliedRequestedTab, activeModule]);

  if (error) {
    return (
      <section>
        <h2>Detail vozidla</h2>
        <div className="error-box">{error}</div>
        <button type="button" className="btn btn-ghost btn-back-icon" onClick={handleBackToPreviousView} title="Zpět na přehled" aria-label="Zpět na přehled">
          <AppIcon name="arrowLeft" size={20} weight="regular" />
        </button>
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
      <div className="section-head vehicle-detail-heading">
        <div>
          <h2>
            {item.w_tovarni_znacka || 'Neznámý'} {item.w_model_vozu || 'model'}
            <span className="vehicle-detail-registration">
              , SPZ: {item.spz || '-'}{item.w_popis ? ` (${item.w_popis})` : ''}
            </span>
            <sup className="vehicle-detail-id">#{item.id}</sup>
            <span className="vehicle-status-badge" data-status={item.status?.toLowerCase()}>
              {item.status || 'Neznámý'}
            </span>
          </h2>
          {item.last_update && (
            <div className="vehicle-detail-last-update">
              <AppIcon name="clockCounterClockwise" size={15} weight="duotone" />
              <span>Poslední aktualizace: {new Date(item.last_update).toLocaleString('cs-CZ', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}</span>
            </div>
          )}
          {isDirty && (
            <div className="vehicle-detail-meta">
              <span className="vehicle-detail-state dirty">Neuložené změny</span>
            </div>
          )}
        </div>
        {!(!canEditVehicleDetails) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm vehicle-detail-edit"
            onClick={() => setEditingBasic(!editingBasic)}
            title={editingBasic ? 'Zrušit úpravy' : 'Upravit základní údaje'}
          >
            <AppIcon name="pencilSimple" size={16} />
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-back-icon" onClick={handleBackToPreviousView} title="Zpět na přehled" aria-label="Zpět na přehled">
          <AppIcon name="arrowLeft" size={20} weight="regular" />
        </button>

        <div className="vehicle-detail-data-grid">
          <div className="vehicle-banner-item">
            <div className="vehicle-banner-icon-stack">
              <AppIcon name="chatCircleText" size={18} weight="duotone" />
              <WdBadge />
            </div>
            <div>
              <span className="vehicle-banner-label">Volací znak</span>
              <span className="vehicle-banner-value">{item.w_popis || '-'}</span>
            </div>
          </div>
          <div className="vehicle-banner-item">
            <AppIcon name="car" size={18} weight="duotone" />
            <div>
              <span className="vehicle-banner-label">ZZS typ</span>
              <span className="vehicle-banner-value">
                {item.zzs_typ
                  ? (lookupByCategory?.vehicle_type || []).find((option) => option.code === item.zzs_typ)?.item_name || item.zzs_typ
                  : '-'}
              </span>
            </div>
          </div>
          <div className="vehicle-banner-item">
            <div className="vehicle-banner-icon-stack">
              <AppIcon name="drop" size={18} weight="duotone" />
              <WdBadge />
            </div>
            <div>
              <span className="vehicle-banner-label">Palivo</span>
              <span className="vehicle-banner-value">{item.w_typ_phm || '-'}</span>
            </div>
          </div>
          <div className="vehicle-banner-item">
            <div className="vehicle-banner-icon-stack">
              <AppIcon name="mapPin" size={18} weight="duotone" />
              <WdBadge />
            </div>
            <div>
              <span className="vehicle-banner-label">Stanoviště</span>
              <span className="vehicle-banner-value">{item.w_stanoviste || '-'}</span>
            </div>
          </div>
          <div className="vehicle-banner-item">
            <div className="vehicle-banner-icon-stack">
              <AppIcon name="calendarBlank" size={18} weight="duotone" />
              <WdBadge />
            </div>
            <div>
              <span className="vehicle-banner-label">Datum zařazení</span>
              <span className="vehicle-banner-value">
                {item.datum_zarazeni
                  ? new Date(item.datum_zarazeni).toLocaleDateString('cs-CZ')
                  : '-'}
              </span>
            </div>
          </div>
          <div className="vehicle-banner-item">
            <div className="vehicle-banner-icon-stack">
              <AppIcon name="gauge" size={18} weight="duotone" />
              <WdBadge />
            </div>
            <div>
              <span className="vehicle-banner-label">Nájezd KM</span>
              <span className="vehicle-banner-value">
                {item.najeto_km !== null && item.najeto_km !== undefined
                  ? `${Number(item.najeto_km).toLocaleString('cs-CZ')} km`
                  : '-'}
              </span>
            </div>
          </div>
          <div className="vehicle-banner-item">
            <AppIcon name="identifier" size={18} weight="duotone" />
            <div>
              <span className="vehicle-banner-label">Evidenční číslo</span>
              <span className="vehicle-banner-value">{item.evidencni_cislo_zzs || '-'}</span>
            </div>
          </div>
          <div className="vehicle-banner-item">
            <AppIcon name="barcode" size={18} weight="duotone" />
            <div>
              <span className="vehicle-banner-label">VIN</span>
              <span className="vehicle-banner-value">{item.vin || '-'}</span>
            </div>
          </div>
          <div className="vehicle-banner-item">
            <div className="vehicle-banner-icon-stack">
              <AppIcon name="ccsCard" size={18} weight="duotone" />
              <WdBadge />
            </div>
            <div>
              <span className="vehicle-banner-label">Číslo CCS karty</span>
              <span className="vehicle-banner-value">{item.ccs_card_number || '-'}</span>
            </div>
          </div>
          <div className="vehicle-banner-item">
            <div className="vehicle-banner-icon-stack">
              <AppIcon name="calendarBlank" size={18} weight="duotone" />
              <WdBadge />
            </div>
            <div>
              <span className="vehicle-banner-label">Platnost CCS karty</span>
              <span className="vehicle-banner-value">{formatCcsExpiration(item.ccs_card_expiration)}</span>
            </div>
          </div>
        </div>

      </div>

      <div className="cards-grid detail-grid">
        <VehicleTechnicalFormCard
          activeModule={activeModule}
          onManageModule={handleManageModule}
          onCloseModule={handleCloseModule}
            initialTab={activeModule}
            item={item}
            onClose={handleCloseModule}
          serviceStations={serviceStations}
          form={form}
          onChange={handleChange}
          onSubmit={handleSave}
          saving={saving}
          saveMessage={saveMessage}
          isDirty={isDirty}
          onReset={resetForm}
          cardHistory={cardHistory}
          cardHistoryLoading={cardHistoryLoading}
          cardHistoryError={cardHistoryError}
          attachments={attachments}
          attachmentsLoading={attachmentsLoading}
          attachmentsError={attachmentsError}
          attachmentMessage={attachmentMessage}
          uploadingAttachment={uploadingAttachment}
          attachmentUploadProgress={attachmentUploadProgress}
          onUploadAttachment={handleUploadAttachment}
          onDownloadAttachment={handleDownloadAttachment}
          onDeleteAttachment={handleDeleteAttachment}
          serviceRecords={serviceRecords}
          serviceRecordsLoading={serviceRecordsLoading}
          serviceRecordsError={serviceRecordsError}
          serviceRecordMessage={serviceRecordMessage}
          creatingServiceRecord={creatingServiceRecord}
          onCreateServiceRecord={handleCreateServiceRecord}
          onCreateServiceStation={handleCreateServiceStation}
          onDeleteServiceRecord={handleDeleteServiceRecord}
          vehicleEquipment={vehicleEquipment}
          equipmentLoading={equipmentLoading}
          equipmentError={equipmentError}
          equipmentMessage={equipmentMessage}
          creatingEquipment={creatingEquipment}
          onCreateEquipment={handleCreateEquipment}
          onDeleteEquipment={handleDeleteEquipment}
          insurancePolicies={insurancePolicies}
          claims={claims}
          insuranceLoading={insuranceLoading}
          insuranceError={insuranceError}
          insuranceMessage={insuranceMessage}
          creatingInsurance={creatingInsurance}
          creatingClaim={creatingClaim}
          onCreateInsurancePolicy={handleCreateInsurancePolicy}
          onCreateClaim={handleCreateClaim}
          onDeleteInsurancePolicy={handleDeleteInsurancePolicy}
          onDeleteClaim={handleDeleteClaim}
          tires={tires}
          tiresLoading={tiresLoading}
          tiresError={tiresError}
          tiresMessage={tiresMessage}
          creatingTires={creatingTires}
          onCreateTires={handleCreateTires}
          onDeleteTires={handleDeleteTires}
          funding={funding}
          fundingLoading={fundingLoading}
          fundingError={fundingError}
          fundingMessage={fundingMessage}
          creatingFunding={creatingFunding}
          onCreateFunding={handleCreateFunding}
          onDeleteFunding={handleDeleteFunding}
          suppliers={suppliers}
          suppliersLoading={suppliersLoading}
          suppliersError={suppliersError}
          suppliersMessage={suppliersMessage}
          creatingSupplier={creatingSupplier}
          onSaveSupplier={handleSaveSupplier}
          onDeleteSupplier={handleDeleteSupplier}
          warrantyClaims={warrantyClaims}
          warrantyClaimsLoading={warrantyClaimsLoading}
          warrantyClaimsError={warrantyClaimsError}
          warrantyClaimsMessage={warrantyClaimsMessage}
          creatingWarrantyClaim={creatingWarrantyClaim}
          onSaveWarrantyClaim={handleSaveWarrantyClaim}
          onDeleteWarrantyClaim={handleDeleteWarrantyClaim}
          lookupByCategory={lookupByCategory}
          validationErrors={validationErrors}
          editingBasic={editingBasic}
          onEditingBasicChange={setEditingBasic}
          readOnly={!canEditVehicleDetails}
        />
      </div>
    </section>
  );
}
