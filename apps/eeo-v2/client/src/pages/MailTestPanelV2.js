import React, { useState, useContext, useEffect } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faPaperPlane,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faList
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';

const Container = styled.div`
  padding: 30px;
  max-width: 100%;
  margin: 0 auto;
`;

const Panel = styled.div`
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const Title = styled.h2`
  color: #1f2937;
  font-size: 24px;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: #dc2626;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  color: #374151;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #dc2626;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #dc2626;
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #dc2626;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #b91c1c, #991b1b);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    font-size: 18px;
  }
`;

const Alert = styled.div`
  padding: 16px;
  border-radius: 6px;
  margin-top: 20px;
  font-size: 14px;

  ${props => props.$type === 'success' && `
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  `}

  ${props => props.$type === 'error' && `
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  `}

  ${props => props.$type === 'info' && `
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #93c5fd;
  `}
`;

const InfoBox = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  margin-top: 20px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
`;

const PreviewPanel = styled.div`
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
`;

const PreviewTitle = styled.div`
  font-weight: 700;
  color: #374151;
  margin-bottom: 12px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PreviewContent = styled.div`
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-word;
`;

const HtmlPreviewFrame = styled.iframe`
  width: 100%;
  min-height: 500px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
`;

const RawContent = styled.pre`
  background: #064e3b;
  color: #fde047;
  border-radius: 6px;
  padding: 16px;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  overflow-x: auto;
  margin: 0;
  line-height: 1.7;
  font-weight: 500;
`;

const PreviewSubject = styled.div`
  font-weight: 700;
  font-size: 16px;
  color: #dc2626;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
`;

const PlaceholderBadge = styled.span`
  background: #fef3c7;
  color: #92400e;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
`;

// HTML ŠABLONA 1: EMAIL PRO SCHVALOVATELE
const TEST_HTML_TEMPLATE_APPROVER = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                                Nová objednávka ke schválení
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Dobrý den <strong>{approver_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 25px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                v systému eRDMS čeká na Vaše schválení nová objednávka od uživatele <strong>{user_name}</strong>.
                            </p>
                            
                            <!-- Order Info Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; margin-bottom: 25px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px; width: 160px;"><strong>Číslo objednávky:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px; font-weight: 600;">{order_number}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Předmět:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{predmet}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Dodavatel:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{dodavatel_nazev}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Zdroj financování:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{financovani}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Cena s DPH:</strong></td>
                                                <td style="color: #dc2626; font-size: 18px; font-weight: bold;">{amount}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Datum vytvoření:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{date}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Action Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 10px 0 25px 0;">
                                        <a href="https://erdms.zachranka.cz/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                                            Schválit / Zamítnout objednávku
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px; line-height: 1.6; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                <strong>Poznámka:</strong> Objednávku prosím schvalte nebo zamítněte v co nejkratší době.
                            </p>
                            
                            <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                                Děkuji,<br>
                                <strong>{user_name}</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                                <strong>Zdravotnická záchranná služba Středočeského kraje, p.o.</strong><br>
                                EEO 2025 - Systém správy a workflow objednávek
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                                Tento email byl odeslán automaticky, prosím neodpovídejte na něj.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

// HTML ŠABLONA 2: EMAIL PRO ZADAVATELE (potvrzení)
const TEST_HTML_TEMPLATE_SUBMITTER = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669, #047857); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                                Objednávka odeslána ke schválení
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Dobrý den <strong>{user_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 25px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Vaše objednávka byla úspěšně odeslána ke schválení uživateli <strong>{approver_name}</strong>.
                            </p>
                            
                            <!-- Order Info Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; margin-bottom: 25px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px; width: 160px;"><strong>Číslo objednávky:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px; font-weight: 600;">{order_number}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Předmět:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{predmet}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Dodavatel:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{dodavatel_nazev}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Zdroj financování:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{financovani}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Cena s DPH:</strong></td>
                                                <td style="color: #059669; font-size: 18px; font-weight: bold;">{amount}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Schvalovatel:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{approver_name}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Action Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 10px 0 25px 0;">
                                        <a href="https://erdms.zachranka.cz/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);">
                                            Zobrazit objednávku
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                <strong>Poznámka:</strong> O dalším průběhu schvalování budete informováni.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                                <strong>Zdravotnická záchranná služba Středočeského kraje, p.o.</strong><br>
                                EEO 2025 - Systém správy a workflow objednávek
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                                Tento email byl odeslán automaticky, prosím neodpovídejte na něj.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

const MailTestPanel = () => {
  const { token, username } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    from: 'webmaster@zachranka.cz',
    to: 'robert.holovsky@zachranka.cz',
    subject: 'test eRdms notifikace',
    body: 'Pozdrav ze systému',
    isHtml: false
  });
  
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [rawTemplate, setRawTemplate] = useState(null);

  // Načtení šablon z DB při mount
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!token || !username) return;
      
      setLoadingTemplates(true);
      try {
        const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
        const response = await fetch(`${API_BASE_URL}notifications/templates/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            username,
            active_only: true
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ok' && data.data) {
            setTemplates(data.data);
            console.log('📧 Načteno šablon:', data.data.length);
          }
        }
      } catch (error) {
        console.error('📧 Chyba při načítání šablon:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    fetchTemplates();
  }, [token, username]);

  const handleTemplateChange = (e) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === parseInt(templateId));
      if (template) {
        // Uložíme raw template pro zobrazení
        setRawTemplate(template);
        
        // Nahradíme placeholdery demo daty pro náhled (podle reálné struktury OF25)
        const demoData = {
          '{order_id}': '12345',
          '{order_number}': 'O-0001/75030926/2025/PTN',
          '{predmet}': 'SENESI - Mapei MAPESIL AC 150 ŽLUTÁ 310 ml Silikonová těsnicí hmota 4815042IT 1ks',
          '{user_name}': username || 'Jan Novák',
          '{dodavatel_nazev}': 'SENESI, SE',
          '{financovani}': 'LPIT1 - Spotřeba materiálu',
          '{amount}': '150 000 Kč',
          '{status}': 'Ke schválení',
          '{deadline}': '31.12.2025',
          '{approver_name}': 'Petra Svobodová',
          '{url}': 'https://erdms.zachranka.cz/eeo-v2/orders/12345',
          '{comment}': 'Vše v pořádku, schvaluji.',
          '{invoice_number}': 'FA-2025-0123',
          '{date}': new Date().toLocaleDateString('cs-CZ'),
          // Kompatibilita se starými názvy
          '{order_subject}': 'SENESI - Mapei MAPESIL AC 150 ŽLUTÁ 310 ml Silikonová těsnicí hmota 4815042IT 1ks',
          '{supplier_name}': 'SENESI, SE',
          '{funding_source}': 'Limitovaný příslib (LP 26)'
        };
        
        let subject = template.email_subject || '';
        let body = template.email_body || '';
        
        // Nahradíme všechny placeholdery
        Object.entries(demoData).forEach(([placeholder, value]) => {
          subject = subject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
          body = body.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
        });
        
        // Detekce HTML v šabloně
        const isHtmlTemplate = body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html');
        
        setFormData(prev => ({
          ...prev,
          subject: subject,
          body: body,
          isHtml: isHtmlTemplate
        }));
      } else {
        setRawTemplate(null);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Funkce pro zvýraznění placeholderů v textu
  const highlightPlaceholders = (text) => {
    if (!text) return null;
    
    const parts = text.split(/(\{[^}]+\})/g);
    return parts.map((part, index) => {
      if (part.match(/^\{[^}]+\}$/)) {
        return (
          <PlaceholderBadge key={index} style={{ margin: '0 2px' }}>
            {part}
          </PlaceholderBadge>
        );
      }
      return part;
    });
  };

  const handleSend = async () => {
    // Validace
    if (!formData.to || !formData.subject || !formData.body) {
      setStatus('error');
      setMessage('Vyplňte všechna pole');
      return;
    }

    if (!token || !username) {
      setStatus('error');
      setMessage('Nejste přihlášeni');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
      const endpoint = `${API_BASE_URL}notify/email`;
      
      console.log('📧 Odesílám email na:', endpoint);
      console.log('📧 Data:', { to: formData.to, subject: formData.subject, from: formData.from, html: formData.isHtml });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          username: username,
          to: formData.to,
          subject: formData.subject,
          body: formData.body,
          from_email: formData.from,
          html: formData.isHtml
        })
      });

      console.log('📧 Response status:', response.status);

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Server nevrátil JSON odpověď');
      }

      console.log('📧 Response data:', data);

      if (data.status === 'ok' || data.sent === true) {
        setStatus('success');
        setMessage(`✅ Email odeslán na ${formData.to}`);
      } else if (data.err) {
        throw new Error(data.err);
      } else {
        throw new Error('Neznámá chyba');
      }

    } catch (error) {
      console.error('📧 Error:', error);
      setStatus('error');
      setMessage(error.message || 'Chyba při odesílání');
    }
  };

  const handleReset = () => {
    setFormData({
      from: 'webmaster@zachranka.cz',
      to: 'robert.holovsky@zachranka.cz',
      subject: 'test eRdms notifikace',
      body: 'Pozdrav ze systému'
    });
    setStatus(null);
    setMessage('');
  };

  return (
    <Container>
      <Panel>
        <Title>
          <FontAwesomeIcon icon={faEnvelope} />
          Mail Test Panel
        </Title>

        <FormGroup>
          <Label>
            <FontAwesomeIcon icon={faList} style={{ marginRight: '8px', color: '#dc2626' }} />
            Šablona z DB (25_notification_templates)
          </Label>
          <Select
            value={selectedTemplate}
            onChange={handleTemplateChange}
            disabled={status === 'loading' || loadingTemplates}
          >
            <option value="">-- Vyberte šablonu nebo vyplňte ručně --</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.type})
              </option>
            ))}
          </Select>
          {loadingTemplates && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
              <FontAwesomeIcon icon={faSpinner} spin /> Načítám šablony...
            </div>
          )}
          <div style={{ marginTop: '12px' }}>
            <Button 
              onClick={() => {
                const demoData = {
                  '{order_id}': '12345',
                  '{order_number}': 'O-0001/75030926/2025/PTN',
                  '{predmet}': 'SENESI - Mapei MAPESIL AC 150 ŽLUTÁ 310 ml Silikonová těsnicí hmota 4815042IT 1ks',
                  '{user_name}': username || 'Jan Novák',
                  '{dodavatel_nazev}': 'SENESI, SE',
                  '{financovani}': 'LPIT1 - Spotřeba materiálu',
                  '{amount}': '150 000 Kč',
                  '{approver_name}': 'Petra Svobodová',
                  '{order_id}': '12345',
                  '{date}': new Date().toLocaleDateString('cs-CZ')
                };
                
                let body = TEST_HTML_TEMPLATE_APPROVER;
                Object.entries(demoData).forEach(([placeholder, value]) => {
                  body = body.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
                });
                
                setFormData({
                  ...formData,
                  subject: 'EEO: Nová objednávka ke schválení #O-0001/75030926/2025/PTN',
                  body: body,
                  isHtml: true
                });
                setRawTemplate({
                  id: 'TEST',
                  type: 'order_status_ke_schvaleni',
                  name: 'TEST HTML Šablona',
                  email_subject: 'EEO: Nová objednávka ke schválení #{order_number}',
                  email_body: TEST_HTML_TEMPLATE_APPROVER,
                  send_email_default: true
                });
                setSelectedTemplate('TEST');
              }}
              style={{ background: '#059669', fontSize: '14px', padding: '10px 20px' }}
            >
              📝 Načíst testovací HTML šablonu
            </Button>
          </div>
        </FormGroup>

        {/* NÁHLEDY - 2 VARIANTY PRO PŘÍJEMCE */}
        {rawTemplate && formData.isHtml && (
          <>
            <div style={{ marginTop: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '30px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>
                📧 Náhledy emailu - ke schválení
              </h2>
              
              {/* Grid 2 sloupce vedle sebe */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: '30px'
              }}>
                {/* Varianta 1 - PRO PŘÍKAZCE (schvalovatel) */}
                <PreviewPanel>
                  <PreviewTitle style={{ 
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)', 
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px 8px 0 0',
                    margin: '-16px -16px 16px -16px',
                    fontWeight: '700',
                    fontSize: '15px'
                  }}>
                    📋 Email pro PŘÍKAZCE (schvalovatel)
                  </PreviewTitle>
                  <PreviewSubject style={{ marginBottom: '15px', fontSize: '14px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>
                    {formData.subject}
                  </PreviewSubject>
                  <HtmlPreviewFrame
                    srcDoc={formData.body}
                    title="Email pro příkazce"
                    sandbox="allow-same-origin"
                    style={{ height: '600px' }}
                  />
                </PreviewPanel>

                {/* Varianta 2 - PRO AUTORA/GARANTA */}
                <PreviewPanel>
                  <PreviewTitle style={{ 
                    background: 'linear-gradient(135deg, #059669, #047857)', 
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px 8px 0 0',
                    margin: '-16px -16px 16px -16px',
                    fontWeight: '700',
                    fontSize: '15px'
                  }}>
                    ✅ Email pro AUTORA objednávky (garant)
                  </PreviewTitle>
                  <PreviewSubject style={{ marginBottom: '15px', fontSize: '14px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                    EEO: Vaše objednávka byla odeslána ke schválení #{formData.body.match(/O-\d+-\d+/)?.[0] || 'XXXX'}
                  </PreviewSubject>
                  <HtmlPreviewFrame
                    srcDoc={TEST_HTML_TEMPLATE_SUBMITTER
                      .replace('{user_name}', 'Jan Novák')
                      .replace('{order_number}', 'O-0001/75030926/2025/PTN')
                      .replace('{predmet}', 'Nákup kancelářského materiálu')
                      .replace('{dodavatel_nazev}', 'Office Supplies s.r.o.')
                      .replace('{financovani}', 'LPIT1 - Spotřeba materiálu')
                      .replace('{amount}', '150 000 Kč')
                      .replace('{approver_name}', 'Petra Svobodová')
                      .replace('{order_id}', '12345')
                      .replace('{date}', new Date().toLocaleDateString('cs-CZ'))
                    }
                    title="Email pro autora"
                    sandbox="allow-same-origin"
                    style={{ height: '600px' }}
                  />
                </PreviewPanel>
              </div>
            </div>
          </>
        )}

        {/* ODESLÁNÍ EMAILU */}
        <div style={{ marginTop: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '30px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>
            ✉️ Odeslat testovací email
          </h2>

          <FormGroup>
            <Label>Komu (To)</Label>
            <Input
              type="email"
              name="to"
              value={formData.to}
              onChange={handleChange}
              disabled={status === 'loading'}
              placeholder="vas@email.cz"
            />
          </FormGroup>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <Button onClick={handleSend} disabled={status === 'loading' || !rawTemplate}>
              {status === 'loading' ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Odesílám...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} />
                  Odeslat testovací email
                </>
              )}
            </Button>
          </div>

          {status === 'success' && (
            <Alert $type="success" style={{ marginTop: '20px' }}>
              <FontAwesomeIcon icon={faCheckCircle} /> {message}
            </Alert>
          )}

          {status === 'error' && (
            <Alert $type="error" style={{ marginTop: '20px' }}>
              <FontAwesomeIcon icon={faExclamationTriangle} /> {message}
            </Alert>
          )}
        </div>
      </Panel>

      <Panel>
        <InfoBox>
          <strong>ℹ️ Info:</strong> SMTP: <code>akp-it-smtp01.zzssk.zachranka.cz:25</code> | 
          Šablony: <code>25_notification_templates</code> ({templates.length} aktivních)
        </InfoBox>
      </Panel>
    </Container>
  );
};

export default MailTestPanel;
