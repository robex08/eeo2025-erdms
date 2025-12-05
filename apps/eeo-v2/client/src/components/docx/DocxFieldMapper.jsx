/**
 * DocxFieldMapper - Komponenta pro mapování polí mezi DOCX a objednávkami
 * @date 2025-10-21
 */

import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileWord, faSave, faUndo, faCheck, faTimes,
  faInfoCircle, faExchangeAlt, faSearch, faFilter
} from '@fortawesome/free-solid-svg-icons';
import { getOrderFieldsForMapping, generateFieldsFromApiData } from '../../utils/docx/docxProcessor';
import { getDocxOrderData, getDocxOrderEnrichedData } from '../../services/apiDocxOrders';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Container = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f3f4f6;
`;

const Title = styled.h3`
  margin: 0;
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
`;

const InfoBadge = styled.div`
  background: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
`;

const MappingGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: start;
`;

const FieldColumn = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SearchBox = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const FieldList = styled.div`
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`;

const FieldItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: white;
  border-radius: 6px;
  border: 1px solid ${props => props.$mapped ? '#10b981' : '#e5e7eb'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const FieldInfo = styled.div`
  flex: 1;
`;

const FieldName = styled.div`
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
`;

const FieldType = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  font-family: 'Courier New', monospace;
`;

const FieldGroup = styled.div`
  margin-bottom: 1rem;
`;

const GroupTitle = styled.div`
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
`;

const MappingConnector = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0.5rem;
`;

const ConnectorIcon = styled.div`
  background: #3b82f6;
  color: white;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.$primary ? `
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;

    &:hover {
      background: #2563eb;
      border-color: #2563eb;
    }
  ` : `
    background: white;
    border-color: #d1d5db;
    color: #374151;

    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MappingStatus = styled.div`
  background: ${props => props.$complete ? '#dcfce7' : '#fef3c7'};
  color: ${props => props.$complete ? '#166534' : '#92400e'};
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
`;

const SelectBox = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

// =============================================================================
// KOMPONENTA
// =============================================================================

const DocxFieldMapper = ({
  docxFields = [],
  initialMapping = {},
  onMappingChange,
  onSave,
  onCancel,
  // Dynamická pole z API
  useDynamicFields = true,
  sampleOrderId = null,
  token = null,
  username = null
}) => {
  const [mapping, setMapping] = useState(initialMapping);
  const [searchDocx, setSearchDocx] = useState('');
  const [searchOrder, setSearchOrder] = useState('');
  const [selectedDocxField, setSelectedDocxField] = useState(null);
  const [orderFields, setOrderFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);

  // Dynamické načítání polí z API
  useEffect(() => {
    const loadFields = async () => {
      if (!useDynamicFields) {
        const fields = getOrderFieldsForMapping();
        setOrderFields(fields);
        return;
      }

      if (sampleOrderId && token && username) {
        setLoadingFields(true);
        try {
          console.log('🔄 DocxFieldMapper: Načítám ENRICHED dynamická pole z API');
          // ✅ POUŽIJ getDocxOrderEnrichedData pro kompletní data včetně položek, faktur a timestamp polí
          const apiData = await getDocxOrderEnrichedData({ token, username, objednavka_id: sampleOrderId });
          const dynamicFields = generateFieldsFromApiData(apiData);
          setOrderFields(dynamicFields);
          console.log('✅ DocxFieldMapper: Enriched dynamická pole načtena', {
            pocet_skupin: dynamicFields.length,
            skupiny: dynamicFields.map(g => g.group)
          });
        } catch (error) {
          console.error('❌ DocxFieldMapper: Chyba při načítání enriched dat:', error);
          const fallbackFields = getOrderFieldsForMapping();
          setOrderFields(fallbackFields);
        } finally {
          setLoadingFields(false);
        }
      } else {
        const fields = getOrderFieldsForMapping();
        setOrderFields(fields);
      }
    };

    loadFields();
  }, [useDynamicFields, sampleOrderId, token, username]);

  // Filtrované DOCX pole
  const filteredDocxFields = docxFields.filter(field =>
    field.name.toLowerCase().includes(searchDocx.toLowerCase())
  );

  // Filtrované pole objednávek
  const filteredOrderFields = orderFields.map(group => ({
    ...group,
    fields: group.fields.filter(field =>
      field.label.toLowerCase().includes(searchOrder.toLowerCase()) ||
      field.key.toLowerCase().includes(searchOrder.toLowerCase())
    )
  })).filter(group => group.fields.length > 0);

  // Statistiky mapování
  const mappingStats = {
    total: docxFields.length,
    mapped: Object.keys(mapping).filter(key => mapping[key]).length
  };

  const handleFieldMapping = (docxFieldName, orderFieldKey) => {
    const newMapping = {
      ...mapping,
      [docxFieldName]: orderFieldKey === '' ? null : orderFieldKey
    };
    setMapping(newMapping);
    onMappingChange?.(newMapping);
  };

  const handleSave = () => {
    onSave?.(mapping);
  };

  const handleReset = () => {
    setMapping(initialMapping);
    onMappingChange?.(initialMapping);
  };

  const isComplete = mappingStats.mapped === mappingStats.total && mappingStats.total > 0;

  return (
    <Container>
      <Header>
        <FontAwesomeIcon icon={faFileWord} style={{ color: '#2563eb', fontSize: '1.5rem' }} />
        <Title>Mapování polí DOCX šablony</Title>
        <InfoBadge>
          {mappingStats.mapped} / {mappingStats.total} namapováno
        </InfoBadge>
      </Header>

      <MappingStatus $complete={isComplete}>
        <FontAwesomeIcon icon={isComplete ? faCheck : faInfoCircle} />
        {isComplete
          ? 'Všechna pole jsou namapována a připravena k použití'
          : `Zbývá namapovat ${mappingStats.total - mappingStats.mapped} polí`
        }
      </MappingStatus>

      <MappingGrid>
        {/* Levý sloupec - DOCX pole */}
        <FieldColumn>
          <ColumnHeader>
            <FontAwesomeIcon icon={faFileWord} />
            Pole v DOCX šabloně
          </ColumnHeader>

          <SearchBox
            type="text"
            placeholder="Hledat pole v DOCX..."
            value={searchDocx}
            onChange={e => setSearchDocx(e.target.value)}
          />

          <FieldList>
            {filteredDocxFields.map(field => (
              <FieldItem
                key={field.name}
                $mapped={!!mapping[field.name]}
                onClick={() => setSelectedDocxField(field)}
              >
                <FieldInfo>
                  <FieldName>{field.name}</FieldName>
                  <FieldType>{field.type}</FieldType>
                </FieldInfo>
                {mapping[field.name] && (
                  <FontAwesomeIcon icon={faCheck} style={{ color: '#10b981' }} />
                )}
              </FieldItem>
            ))}
          </FieldList>
        </FieldColumn>

        {/* Střední sloupec - mapování */}
        <MappingConnector>
          <ConnectorIcon>
            <FontAwesomeIcon icon={faExchangeAlt} />
          </ConnectorIcon>

          {selectedDocxField && (
            <div style={{ textAlign: 'center', minWidth: '200px' }}>
              <div style={{ marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                {selectedDocxField.name}
              </div>
              <SelectBox
                value={mapping[selectedDocxField.name] || ''}
                onChange={e => handleFieldMapping(selectedDocxField.name, e.target.value)}
              >
                <option value="">-- Nevybráno --</option>
                {orderFields.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.fields.map(field => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </SelectBox>
            </div>
          )}
        </MappingConnector>

        {/* Pravý sloupec - pole objednávek */}
        <FieldColumn>
          <ColumnHeader>
            <FontAwesomeIcon icon={faSearch} />
            Dostupná pole objednávek
          </ColumnHeader>

          <SearchBox
            type="text"
            placeholder="Hledat pole objednávek..."
            value={searchOrder}
            onChange={e => setSearchOrder(e.target.value)}
          />

          <FieldList>
            {filteredOrderFields.map(group => (
              <FieldGroup key={group.group}>
                <GroupTitle>{group.group}</GroupTitle>
                {group.fields.map(field => {
                  // Rozděl label na český název a DB pole
                  const labelParts = field.label?.split('\n') || [field.label || field.key];
                  const czechName = labelParts[0]; // Český název nebo celý label
                  const dbFieldName = labelParts[1] || `{${field.key}}`; // {db_pole} nebo fallback

                  return (
                    <FieldItem
                      key={field.key}
                      onClick={() => selectedDocxField && handleFieldMapping(selectedDocxField.name, field.key)}
                    >
                      <FieldInfo>
                        <FieldName>{czechName}</FieldName>
                        <FieldType>{dbFieldName} • {field.type}</FieldType>
                      </FieldInfo>
                    </FieldItem>
                  );
                })}
              </FieldGroup>
            ))}
          </FieldList>
        </FieldColumn>
      </MappingGrid>

      <ActionButtons>
        <ActionButton onClick={handleReset}>
          <FontAwesomeIcon icon={faUndo} />
          Reset
        </ActionButton>
        <ActionButton onClick={onCancel}>
          <FontAwesomeIcon icon={faTimes} />
          Zrušit
        </ActionButton>
        <ActionButton $primary onClick={handleSave}>
          <FontAwesomeIcon icon={faSave} />
          Uložit mapování
        </ActionButton>
      </ActionButtons>
    </Container>
  );
};

export default DocxFieldMapper;