import React, { useState, useEffect, useContext, useCallback, useRef } from 'react'; // Import useContext
import { getOrderById, getOrderTypes, getGarants, getAttachments } from '../services/apiv2'; // Import getAttachments function
import { getErrorCodeCZ } from '../services/api2auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faCalculator } from '@fortawesome/free-solid-svg-icons';
import { css } from '@emotion/react';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext

const OrderFormTabs = ({ orderId, onClose }) => {
  const { token, fullName } = useContext(AuthContext); // Retrieve token and fullName from global context
  const [activeTab, setActiveTab] = useState('order');
  const [formData, setFormData] = useState({}); // Initialize as an empty object to avoid null errors
  const [error, setError] = useState(null);
  const [orderTypes, setOrderTypes] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [garants, setGarants] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState(null);
  const memoryCache = useRef({}); // Memory cache for fetched data

  const formatFileSize = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const generateSafeFilename = (originalName) => {
    const timestamp = Date.now(); // Add a timestamp for uniqueness
    const normalized = originalName
      .toLowerCase()
      .normalize('NFD') // Decompose diacritics
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritic marks
      .replace(/[^a-z0-9.]/g, '-') // Replace non-alphanumeric characters with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with a single hyphen
      .replace(/^-|-$/g, ''); // Remove leading or trailing hyphens
    const extension = originalName.split('.').pop(); // Extract file extension
    return `${normalized}-${timestamp}.${extension}`;
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map((file) => {
      const safeFilename = generateSafeFilename(file.name);
  // debug: filename mapping omitted in production
      return { file, description: file.name, safeFilename };
    });
    setUploadedFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    const newFiles = files.map((file) => {
      const safeFilename = generateSafeFilename(file.name);
  // debug: filename mapping omitted in production
      return { file, description: file.name, safeFilename };
    });
    setUploadedFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const handleDescriptionChange = (index, value) => {
    setUploadedFiles((prevFiles) =>
      prevFiles.map((file, i) =>
        i === index ? { ...file, description: value } : file
      )
    );
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleFileClick = (file) => {
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, '_blank');
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value })); // Directly set the value without formatting
  };

  const calculatePriceWithVAT = (priceWithoutVAT) => {
    const numericValue = parseFloat(priceWithoutVAT.replace(',', '.')) || 0; // Convert to a number
    const priceWithVAT = Math.round(numericValue * 1.21); // Multiply by 1.21 and round to the nearest integer
    return priceWithVAT.toString().replace('.', ','); // Return as a string
  };

  const calculatePriceWithoutVAT = (priceWithVAT) => {
    const numericValue = parseFloat(priceWithVAT.replace(',', '.')) || 0; // Convert to a number
    const priceWithoutVAT = Math.round(numericValue / 1.21); // Divide by 1.21 and round to the nearest integer
    return priceWithoutVAT.toString().replace('.', ','); // Return as a string
  };

  const handleCalculatePriceWithVAT = () => {
    const updatedPriceWithVAT = calculatePriceWithVAT(formData.cena);
    setFormData((prevData) => ({ ...prevData, cena_rok: updatedPriceWithVAT }));
  };

  const handleCalculatePriceWithoutVAT = () => {
    const updatedPriceWithoutVAT = calculatePriceWithoutVAT(formData.cena_rok);
    setFormData((prevData) => ({ ...prevData, cena: updatedPriceWithoutVAT }));
  };

  const formatDateForInput = (dateString) => {
    if (!dateString || dateString === '00.00.0000') return ''; // Handle invalid or empty dates
    const [day, month, year] = dateString.split('.');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Format as YYYY-MM-DD
  };

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        // Check if the order data is already in the memory cache
        if (memoryCache.current[orderId]) { setFormData(memoryCache.current[orderId]); return; }

        const data = orderId
          ? await getOrderById({ id: orderId, token }) // Use token from context
          : {};

  // fetched order data (debug log removed)

        // Access data[0] and format the fields
        const formattedData = {
          partner_nazev: data[0]?.partner_nazev || '', // Populate only partner fields
          partner_adresa: data[0]?.partner_adresa || '',
          partner_ic: data[0]?.partner_ic || '',
          poznamka: data[0]?.evidencni_c ? `Evidenční číslo: ${data[0].evidencni_c}` : '', // Move evidencni_c to poznamka
          datum_p: formatDateForInput(data[0]?.datum_p),
          cena: data[0]?.cena || '0',
          cena_rok: data[0]?.cena_rok || '0',
          druh_sml: data[0]?.druh_sml || '', // Ensure druh_sml name is set correctly
          obsah: data[0]?.obsah || '',
          tt_vyrc: data[0]?.tt_vyrc || '',
          tt_dinfo: data[0]?.tt_dinfo || '',
          zverejnit: data[0]?.zverejnit === 'Ano', // Convert to boolean for checkbox
          dt_zverejneni: formatDateForInput(data[0]?.dt_zverejneni),
          idds: data[0]?.idds || '',
          garant: data[0]?.garant || '', // Ensure garant name is set correctly
          evidencni_c: data[0]?.evidencni_c || '', // Add evidenční číslo
          userCreator: data[0]?.userCreator || 'Neznámý uživatel', // Add creator's name
          faktura: data[0]?.faktura === 'Ano', // Convert to boolean for checkbox
          pokladni_dok: data[0]?.pokladni_dok === 'Ano', // Convert to boolean for checkbox
        };

        memoryCache.current[orderId] = formattedData; // Cache the fetched data
  // cached order data (debug log removed)
        setFormData(formattedData);

        if (orderId) {
          localStorage.setItem('orderData', JSON.stringify(data));
        }

  // saved order data to localStorage (debug log removed)
      } catch (err) {
        // Normalize server errors to a consistent Czech message, otherwise show a local fallback
        try {
          const code = getErrorCodeCZ(err) || '';
          if (code === 'chyba_serveru' || code === 'server_error') {
            setError('Chyba na serveru. Zkuste to prosím později.');
          } else {
            setError('Nepodařilo se načíst data objednávky.');
          }
        } catch (e) {
          setError('Nepodařilo se načíst data objednávky.');
        }
      }
    };

  fetchOrderData();

    const fetchOrderTypes = async () => {
      try {
        const types = await getOrderTypes({ token }); // Use token from context
        if (Array.isArray(types)) {
          setOrderTypes(types);
        } else {
          setOrderTypes([]);
        }
      } catch (err) {
        setOrderTypes([]);
      }
    };

    const fetchGarants = async () => {
      try {
        const data = await getGarants({ token }); // Use token from context
        setGarants(data || []);
      } catch (error) {
        try {
          const code = getErrorCodeCZ(error) || '';
          if (code === 'chyba_serveru' || code === 'server_error') {
            setError('Chyba na serveru. Zkuste to prosím později.');
          } else {
            setError('Nepodařilo se načíst garanty.');
          }
        } catch (e) {
          setError('Nepodařilo se načíst garanty.');
        }
      }
    };

    fetchOrderTypes(); // Fetch order types on component mount
    fetchGarants(); // Fetch garants on component mount
  }, [orderId, token, formData]); // Add token as a dependency

  const fetchRemoteFileSize = useCallback(async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const contentLength = response.headers.get('Content-Length');
      return contentLength ? parseInt(contentLength, 10) : 0; // Return size in bytes or 0 if unavailable
    } catch (error) {
      return 0; // Return 0 in case of an error
    }
  }, []);

  const getAttachmentUrl = useCallback((filename) => {
    // Pro staré objednávky před 2026 používáme původní eeo.zachranka.cz URL
    const baseUrl = process.env.REACT_APP_LEGACY_ATTACHMENTS_BASE_URL || 'https://eeo.zachranka.cz/prilohy/';
    return `${baseUrl}${filename}`;
  }, []);

  const updateAttachmentSizes = useCallback(async () => {
    const updatedAttachments = await Promise.all(
      attachments.map(async (attachment) => {
        const url = getAttachmentUrl(attachment.soubor);
        const size = await fetchRemoteFileSize(url);
        return { ...attachment, size };
      })
    );
    setAttachments(updatedAttachments);
  }, [attachments, getAttachmentUrl, fetchRemoteFileSize]);

  useEffect(() => {
    const fetchAttachments = async () => {
      if (!orderId) return; // Skip fetching if no orderId is provided
      setAttachmentsLoading(true);
      setAttachmentsError(null);
      try {
        const data = await getAttachments({ id: orderId, token });
        setAttachments(data || []);
      } catch (error) {
        setAttachmentsError('Nepodařilo se načíst přílohy.');
      } finally {
        setAttachmentsLoading(false);
      }
    };

    fetchAttachments();
  }, [orderId, token]); // Fetch attachments when orderId or token changes

  useEffect(() => {
    if (attachments.length > 0) {
      updateAttachmentSizes();
    }
  }, [attachments, updateAttachmentSizes]);

  useEffect(() => {
    if (orderId == null) { // Explicitly check for null or undefined
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD for date input
      setFormData((prevData) => ({
        ...prevData,
        datum_p: formattedDate,
        cena: '0', // Ensure default value for new orders
        cena_rok: '0', // Ensure default value for new orders
        userCreator: fullName || 'Neznámý uživatel', // Use fullName from context
      }));
    }
  }, [orderId, fullName]); // Add fullName as a dependency

  useEffect(() => { // Fix typo: useEfect -> useEffect
    if (orderId) {
      setFormData((prevData) => ({
        ...prevData,
        cena: prevData.cena || '0', // Default to 0
        cena_rok: prevData.cena_rok || '0', // Default to 0
      }));
    }
  }, [orderId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: checked ? 'Ano' : 'Ne' }));
  };

  const handleSelectChange = (e) => {
    const selectedName = e.target.value;
    setFormData((prevData) => ({ ...prevData, druh_sml: selectedName })); // Update druh_sml name in formData
  };

  const handleGarantChange = (e) => {
    const selectedName = e.target.value;
    setFormData((prevData) => ({ ...prevData, garant: selectedName })); // Update garant name in formData
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleRemoveFetchedAttachment = (attachmentId) => {
    setAttachments((prevAttachments) =>
      prevAttachments.map((attachment) =>
        attachment.id === attachmentId
          ? { ...attachment, markedForDeletion: !attachment.markedForDeletion }
          : attachment
      )
    );
  };

  const handleFetchedDescriptionChange = (attachmentId, value) => {
    setAttachments((prevAttachments) =>
      prevAttachments.map((attachment) =>
        attachment.id === attachmentId ? { ...attachment, popis: value } : attachment
      )
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const attachmentsToDelete = attachments
      .filter((attachment) => attachment.markedForDeletion)
      .map((attachment) => attachment.id);
  // debug: attachments deletion and submit events (logs removed)
    // Add logic to save the form data and handle removed attachments
    onClose();
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // Emotion styles migrated from OrderFormTabs.css
  const modalOverlay = css`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  const modalContent = css`
    background-color: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    width: 70%;
    max-width: 900px;
    max-height: 90%;
    overflow-y: auto;
    padding: 20px;
    position: relative;
    /* Posun pod fixní hlavičku (+ menu). Použij globální proměnnou, fallback ~96+48 = 144px */
  /* Posun zvětšen o ~3em aby hlavička formuláře nebyla v kolizi s menu */
  /* Posun zvětšen ještě o +1em (původně +3em) na žádost: více prostoru pod fixní hlavičkou */
  margin-top: calc(var(--app-fixed-offset, 144px) + 4em);
  `;
  const modalHeader = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    position: relative;
    h2 {
      margin: 0;
      color: #3f3688;
      font-size: 18px;
    }
  `;
  const closeButton = css`
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #f44336;
    &:hover {
      color: #d32f2f;
    }
  `;
  const tabs = css`
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  `;
  const tabButton = css`
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background-color: #f9f9f9;
    cursor: pointer;
    text-align: center;
    transition: background-color 0.3s ease;
    font-size: 16px;
    &.active {
      background-color: #3f3688;
      color: #fff;
    }
  `;
  const tabContent = css`
    margin-bottom: 20px;
  `;
  const blockTitle = css`
    font-size: 18px;
    font-weight: bold;
    color: #3f3688;
    margin-bottom: 10px;
    text-align: left;
  `;
  const formBlock = css`
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 10px;
    background-color: #f9f9f9;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;
  const flexRow = css`
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  `;
  const flexItem = css`
    flex: 1 1 auto;
    min-width: 150px;
    &.narrow {
      flex: 1 1 30%;
      min-width: 150px;
    }
  `;
  const modernLabel = css`
    display: block;
    margin-bottom: 15px;
    font-size: 16px;
    font-weight: bold;
    color: #333;
  `;
  const modernInput = css`
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 14px;
    box-sizing: border-box;
    background-color: #fff;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
    &:focus {
      outline: none;
      border-color: #3f3688;
      box-shadow: 0 0 5px rgba(63, 54, 136, 0.5);
    }
  `;
  const priceInput = css`
    text-align: right;
  `;
  const formActions = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1%;
  `;
  const actionButtons = css`
    display: flex;
    gap: 1%;
  `;
  const creatorInfo = css`
    font-size: 14px;
    color: #666;
  `;
  const dragDropArea = css`
    border: 2px dashed #ddd;
    border-radius: 5px;
    padding: 20px;
    text-align: center;
    color: #666;
    background-color: #f9f9f9;
    cursor: pointer;
    transition: background-color 0.3s ease;
    &:hover {
      background-color: #e0e0e0;
    }
    &:active {
      background-color: #d0d0d0;
    }
  `;
  const uploadedFilesStyle = css`
    margin-top: 20px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background-color: #f9f9f9;
    h4 {
      margin-bottom: 10px;
      font-size: 16px;
      color: #3f3688;
    }
  `;
  const fileItem = css`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    &.marked-for-deletion {
      background-color: #ffe6e6;
      border: 1px solid #ffcccc;
      .file-name {
        color: gray;
        text-decoration: line-through;
      }
      .remove-file-button {
        background-color: green;
        color: white;
        &:hover {
          background-color: #006400;
        }
      }
    }
  `;
  const fileStatusIcon = css`
    font-size: 16px;
    font-weight: bold;
  `;
  const fileName = css`
    flex: 1;
    font-size: 14px;
    color: #333;
    &.clickable {
      color: #3f3688;
      text-decoration: underline;
      cursor: pointer;
      &:hover {
        color: #2e2766;
      }
    }
  `;
  const fileSize = css`
    font-size: 12px;
    color: #666;
    margin-left: 5px;
  `;
  const fileDescriptionInput = css`
    flex: 2;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 14px;
  `;
  const removeFileButton = css`
    padding: 5px 10px;
    background-color: #f44336;
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    &:hover {
      background-color: #d32f2f;
    }
  `;
  const fileUploadButton = css`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    background-color: #3f3688;
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
    position: relative;
    overflow: hidden;
    &:hover {
      background-color: #2e2766;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    }
    .upload-icon {
      font-size: 18px;
    }
    .file-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }
  `;
  const fileUploadWrapper = css`
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
  `;
  return (
    <div css={modalOverlay}>
      <div css={modalContent}>
        <div css={modalHeader}>
          <h2>{orderId ? 'Editace objednávky' : 'Přidat objednávku'}</h2>
          {formData.evidencni_c && (
            <span css={css`color: green; font-size: 1.2em; font-weight: bold; margin-left: auto;`}>
              {formData.evidencni_c}
            </span>
          )}
          <button css={closeButton} onClick={onClose}>✖</button>
        </div>
        <div css={tabs}>
          <button
            css={[tabButton, activeTab === 'order' && css`.active`]}
            className={activeTab === 'order' ? 'active' : ''}
            onClick={() => handleTabChange('order')}
          >
            Objednávka
          </button>
          <button
            css={[tabButton, activeTab === 'technical' && css`.active`]}
            className={activeTab === 'technical' ? 'active' : ''}
            onClick={() => handleTabChange('technical')}
          >
            Ostatní informace
          </button>
          <button
            css={[tabButton, activeTab === 'attachments' && css`.active`]}
            className={activeTab === 'attachments' ? 'active' : ''}
            onClick={() => handleTabChange('attachments')}
          >
            Přílohy
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {activeTab === 'order' && (
            <div css={tabContent}>
              <div css={formBlock}>
                <h4 css={blockTitle}>Objednávka</h4>
                <div css={flexRow}>
                  <label css={[flexItem, css`.narrow`]}>Datum:
                    <input
                      type="date"
                      name="datum_p"
                      value={formData.datum_p || ''}
                      onChange={handleInputChange}
                      css={modernInput}
                    />
                  </label>
                  <label css={[flexItem, css`.narrow`]}>Cena bez DPH:
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1%' }}>
                      <input
                        type="text"
                        name="cena"
                        value={formData.cena || ''}
                        onChange={handlePriceChange}
                        css={[modernInput, priceInput]}
                      />
                      <button
                        type="button"
                        onClick={handleCalculatePriceWithVAT}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3f3688' }}
                        title="Vypočítat cenu s DPH"
                      >
                        <FontAwesomeIcon icon={faCalculator} />
                      </button>
                    </div>
                  </label>
                  <label css={[flexItem, css`.narrow`]}>Cena s DPH:
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1%' }}>
                      <input
                        type="text"
                        name="cena_rok"
                        value={formData.cena_rok || ''}
                        onChange={handlePriceChange}
                        css={[modernInput, priceInput]}
                      />
                      <button
                        type="button"
                        onClick={handleCalculatePriceWithoutVAT}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3f3688' }}
                        title="Vypočítat cenu bez DPH"
                      >
                        <FontAwesomeIcon icon={faCalculator} />
                      </button>
                    </div>
                  </label>
                </div>
                <div css={flexRow}>
                  {/* Faktura */}
                  <div css={[flexItem, css`.narrow`]}>
                    <label htmlFor="faktura">Faktura</label>
                    <input
                      type="checkbox"
                      id="faktura"
                      name="faktura"
                      checked={formData.faktura|| false}
                      onChange={handleCheckboxChange}
                    />
                  </div>
                  {/* Pokladní doklad */}
                  <div css={[flexItem, css`.narrow`]}>
                    <label htmlFor="pokladni_dok">Pokl.doklad</label>
                    <input
                      type="checkbox"
                      id="pokladni_dok"
                      name="pokladni_dok"
                      checked={formData.pokladni_dok|| false}
                      onChange={handleCheckboxChange}
                    />
                  </div>
                  {/* Garant */}
                  <div css={[flexItem, css`.narrow`]}>
                    <label htmlFor="garant">Garant</label>
                    <select
                      id="garant"
                      name="garant"
                      value={formData.garant || ''}
                      onChange={handleGarantChange}
                      css={modernInput}
                      className="select-with-arrow"
                      style={{ width: '250px', paddingRight: '1.75rem' }}
                    >
                      <option value="">Vyberte garanta</option>
                      {garants.map((garant) => (
                        <option key={garant.id} value={garant.garant}>
                          {garant.garant}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div css={formBlock}>
                <h4 css={blockTitle}>Informace o partnerovi</h4>
                <label css={modernLabel}>Obchodní jméno:
                  <input
                    type="text"
                    name="partner_nazev"
                    value={formData.partner_nazev || ''}
                    onChange={handleInputChange}
                    css={modernInput}
                  />
                </label>
                <label css={modernLabel}>Adresa:
                  <input
                    type="text"
                    name="partner_adresa"
                    value={formData.partner_adresa || ''}
                    onChange={handleInputChange}
                    css={modernInput}
                  />
                </label>
                <label css={modernLabel}>IČ:
                  <input
                    type="text"
                    name="partner_ic"
                    value={formData.partner_ic || ''}
                    onChange={handleInputChange}
                    css={modernInput}
                  />
                </label>
              </div>
              <div css={formBlock}>
                <h4 css={blockTitle}>Registr smluv</h4>
                <div css={css`display: flex; flex-wrap: wrap; gap: 20px;`}>
                  <label css={css`display: flex; align-items: center; gap: 10px; font-size: 16px;`}>Zveřejnit:
                    <input
                      type="checkbox"
                      name="zverejnit"
                      checked={formData.zverejnit || false}
                      onChange={handleCheckboxChange}
                      css={modernInput}
                    />
                  </label>
                  <label>Datum zveřejnění:
                    <input
                      type="date"
                      name="dt_zverejneni"
                      value={formData.dt_zverejneni || ''}
                      onChange={handleInputChange}
                      css={modernInput}
                    />
                  </label>
                  <label>Identifikátor:
                    <input
                      type="text"
                      name="idds"
                      value={formData.idds || ''}
                      onChange={handleInputChange}
                      css={modernInput}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'technical' && (
            <div css={tabContent}>
              <h3>Ostatní informace</h3>
              <div css={formBlock}>
                <label css={modernLabel}>Druh:
                  <select
                    name="druh_sml"
                    value={formData.druh_sml || ''}
                    onChange={handleSelectChange}
                    css={modernInput}
                    className="select-with-arrow"
                    style={{ paddingRight: '1.75rem' }}
                  >
                    <option value="">Vyberte druh</option>
                    {orderTypes.map((type) => (
                      <option key={type.id} value={type.druh}>
                        {type.druh}
                      </option>
                    ))}
                  </select>
                </label>
                <label css={modernLabel}>Obsah:
                  <textarea
                    name="obsah"
                    value={formData.obsah || ''}
                    onChange={handleInputChange}
                    rows="2"
                    css={css`
                      font-size: 14px;
                      line-height: 1.5;
                      resize: vertical;
                      background-color: #fff;
                      height: auto;
                      width: 100%;
                      padding: 8px;
                      border: 1px solid #ddd;
                      border-radius: 5px;
                    `}
                  />
                </label>
                <label css={modernLabel}>Poznámka:
                  <textarea
                    name="poznamka"
                    value={formData.poznamka || ''}
                    onChange={handleInputChange}
                    rows="2"
                    css={css`
                      font-size: 14px;
                      line-height: 1.5;
                      resize: vertical;
                      background-color: #fff;
                      height: auto;
                      width: 100%;
                      padding: 8px;
                      border: 1px solid #ddd;
                      border-radius: 5px;
                    `}
                  />
                </label>
              </div>
              <div css={formBlock}>
                <h4 css={blockTitle}>Transportní technika</h4>
                <div css={flexRow}>
                  <label css={[flexItem, css`.narrow`, modernLabel]}>Výrobní číslo:
                    <input
                      type="text"
                      name="tt_vyrc"
                      value={formData.tt_vyrc || ''}
                      onChange={handleInputChange}
                      css={modernInput}
                    />
                  </label>
                  <label css={[flexItem, css`.narrow`, modernLabel]}>Dodatečné informace:
                    <input
                      type="text"
                      name="tt_dinfo"
                      value={formData.tt_dinfo || ''}
                      onChange={handleInputChange}
                      css={modernInput}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'attachments' && (
            <div css={tabContent}>
              <h3>Přílohy</h3>
              <div css={formBlock}>
                <div
                  css={dragDropArea}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  Přetáhněte soubory sem
                </div>
                <div css={fileUploadWrapper}>
                  <button css={fileUploadButton}>
                    <FontAwesomeIcon icon={faUpload} className="upload-icon" />
                    Vyberte soubor
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="file-input"
                    />
                  </button>
                </div>
                {uploadedFiles.length > 0 && (
                  <div css={uploadedFilesStyle}>
                    <h4>Seznam nově připojených příloh</h4>
                    {uploadedFiles.map((fileObj, index) => (
                      <div key={index} css={fileItem}>
                        <span
                          css={[fileName, css`.clickable`]}
                          onClick={() => handleFileClick(fileObj.file)}
                          title="Klikněte pro otevření"
                        >
                          {fileObj.file.name}
                        </span>
                        <span css={fileSize}>({formatFileSize(fileObj.file.size)})</span>
                        <input
                          type="text"
                          placeholder="Popis souboru"
                          value={fileObj.description}
                          onChange={(e) => handleDescriptionChange(index, e.target.value)}
                          css={fileDescriptionInput}
                        />
                        <button
                          type="button"
                          css={removeFileButton}
                          onClick={() => handleRemoveFile(index)}
                        >
                          Odebrat
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {attachmentsLoading ? (
                  <div style={{display:'none'}}></div>
                ) : attachmentsError ? (
                  <p css={css`color: #f44336; font-weight: bold;`}>{attachmentsError}</p>
                ) : attachments.length > 0 && (
                  <div css={uploadedFilesStyle}>
                    <h4>Seznam již připojených příloh</h4>
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        css={[fileItem, attachment.markedForDeletion && css`.marked-for-deletion`]}
                        style={{
                          opacity: attachment.markedForDeletion ? 0.6 : 1,
                          transition: 'opacity 0.2s ease-in-out',
                        }}
                      >
                        <span
                          css={fileStatusIcon}
                          style={{
                            color: attachment.markedForDeletion ? 'red' : 'green',
                            marginRight: '10px',
                          }}
                          title={attachment.markedForDeletion ? 'Označeno k odstranění' : 'Aktivní'}
                        >
                          {attachment.markedForDeletion ? '✖' : '✔'}
                        </span>
                        <a
                          href={getAttachmentUrl(attachment.soubor)}
                          target="_blank"
                          rel="noopener noreferrer"
                          css={[fileName, css`.clickable`]}
                          title="Klikněte pro otevření"
                          style={{
                            textDecoration: attachment.markedForDeletion
                              ? 'line-through'
                              : 'none',
                            color: attachment.markedForDeletion ? 'gray' : '#3f3d9e',
                          }}
                        >
                          {attachment.soubor}
                        </a>
                        <span css={fileSize}>
                          ({attachment.size ? formatFileSize(attachment.size) : ''})
                        </span>
                        <input
                          type="text"
                          placeholder="Popis souboru"
                          value={attachment.popis || ''}
                          onChange={(e) => handleFetchedDescriptionChange(attachment.id, e.target.value)}
                          css={fileDescriptionInput}
                          disabled={attachment.markedForDeletion}
                        />
                        <button
                          type="button"
                          css={removeFileButton}
                          style={{
                            backgroundColor: attachment.markedForDeletion ? 'green' : 'red',
                            color: 'white',
                          }}
                          onClick={() => handleRemoveFetchedAttachment(attachment.id)}
                        >
                          {attachment.markedForDeletion ? 'Obnovit' : 'Odebrat'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div css={formActions}>
            <div css={creatorInfo}>
              {formData.userCreator && (
                <p>
                  Vytvořil: <strong>{formData.userCreator}</strong>
                </p>
              )}
            </div>
            <div css={actionButtons}>
              <button type="submit">
                {orderId ? 'Aktualizuj' : 'Přidat'}
              </button>
              <button type="button" onClick={onClose}>
                Zruš
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
export default OrderFormTabs;
