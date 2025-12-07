import React, { useState, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faPaperPlane,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faUser,
  faAt,
  faFileAlt
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';

const Container = styled.div`
  padding: 26px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Panel = styled.div`
  background: white;
  border-radius: 12px;
  padding: 26px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 26px;
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
    font-size: 28px;
  }
`;

const Description = styled.p`
  color: #64748b;
  margin: 0 0 26px 0;
  font-size: 16px;
  line-height: 1.6;
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

  svg {
    margin-right: 8px;
    color: #64748b;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }

  &:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }

  &:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #b91c1c, #991b1b);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
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
  padding: 16px 20px;
  border-radius: 8px;
  margin-top: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  line-height: 1.5;

  svg {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  ${props => props.$type === 'success' && `
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
    
    svg {
      color: #16a34a;
    }
  `}

  ${props => props.$type === 'error' && `
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
    
    svg {
      color: #dc2626;
    }
  `}

  ${props => props.$type === 'info' && `
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #93c5fd;
    
    svg {
      color: #3b82f6;
    }
  `}
`;

const EmailPreview = styled.div`
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
`;

const PreviewTitle = styled.div`
  color: #374151;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
`;

const PreviewItem = styled.div`
  margin-bottom: 12px;
  font-size: 14px;

  strong {
    color: #374151;
    display: inline-block;
    min-width: 80px;
  }

  span {
    color: #64748b;
  }
`;

const PreviewBody = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  white-space: pre-wrap;
`;

const MailTestPanel = () => {
  const { token, username } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    to: 'robert.holovsky@zachranka.cz',
    subject: 'test eRdms notifikace',
    body: 'Pozdrav ze systému',
    from: 'webmaster@zachranka.cz'
  });
  
  const [status, setStatus] = useState(null); // null, 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSend = async () => {
    // Validace
    if (!formData.to || !formData.subject || !formData.body) {
      setStatus('error');
      setMessage('Prosím vyplňte všechna povinná pole');
      return;
    }

    // Validace emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.to)) {
      setStatus('error');
      setMessage('Neplatná emailová adresa');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      if (!token || !username) {
        throw new Error('Nejste přihlášeni');
      }

      console.log('🔵 Odesílám email přes API...', {
        to: formData.to,
        subject: formData.subject,
        from: formData.from
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch('/api.eeo/api.php?action=notify/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          username,
          to: formData.to,
          subject: formData.subject,
          body: formData.body,
          from_email: formData.from,
          html: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('🔵 API odpověď status:', response.status);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Neplatná odpověď (ne JSON):', text.substring(0, 500));
        throw new Error('Server vrátil neplatnou odpověď (očekáván JSON)');
      }

      const data = await response.json();
      console.log('🔵 API odpověď data:', data);

      if (response.ok && data.sent) {
        setStatus('success');
        setMessage(`Email úspěšně odeslán na ${formData.to}`);
        
        // Reset formuláře po úspěšném odeslání
        setTimeout(() => {
          setFormData({
            to: 'robert.holovsky@zachranka.cz',
            subject: 'test eRdms notifikace',
            body: 'Pozdrav ze systému',
            from: 'webmaster@zachranka.cz'
          });
          setStatus(null);
          setMessage('');
        }, 3000);

      } else {
        throw new Error(data.err || data.message || 'Neznámá chyba');
      }

    } catch (error) {
      setStatus('error');
      setMessage(`Chyba při odesílání: ${error.message}`);
    }
  };

  const handleReset = () => {
    setFormData({
      to: '',
      subject: '',
      body: '',
      from: 'noreply@erdms.sk'
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
        <Description>
          Testovací prostředí pro odesílání a formátování emailů. 
          Zadejte údaje příjemce a obsah zprávy.
        </Description>

        <FormGroup>
          <Label>
            <FontAwesomeIcon icon={faAt} />
            Odesílatel (From)
          </Label>
          <Input
            type="email"
            name="from"
            value={formData.from}
            onChange={handleChange}
            placeholder="noreply@erdms.sk"
            disabled={status === 'loading'}
          />
        </FormGroup>

        <FormGroup>
          <Label>
            <FontAwesomeIcon icon={faUser} />
            Příjemce (To) *
          </Label>
          <Input
            type="email"
            name="to"
            value={formData.to}
            onChange={handleChange}
            placeholder="prijemce@example.com"
            disabled={status === 'loading'}
          />
        </FormGroup>

        <FormGroup>
          <Label>
            <FontAwesomeIcon icon={faFileAlt} />
            Předmět (Subject) *
          </Label>
          <Input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Zadejte předmět emailu"
            disabled={status === 'loading'}
          />
        </FormGroup>

        <FormGroup>
          <Label>
            <FontAwesomeIcon icon={faFileAlt} />
            Zpráva (Body) *
          </Label>
          <TextArea
            name="body"
            value={formData.body}
            onChange={handleChange}
            placeholder="Zadejte text emailu..."
            disabled={status === 'loading'}
          />
        </FormGroup>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={handleSend} disabled={status === 'loading'}>
            {status === 'loading' ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Odesílám...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faPaperPlane} />
                Odeslat email
              </>
            )}
          </Button>

          <Button 
            onClick={handleReset} 
            disabled={status === 'loading'}
            style={{ background: '#64748b' }}
          >
            Reset
          </Button>
        </div>

        {status === 'success' && (
          <Alert $type="success">
            <FontAwesomeIcon icon={faCheckCircle} />
            <div>{message}</div>
          </Alert>
        )}

        {status === 'error' && (
          <Alert $type="error">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <div>{message}</div>
          </Alert>
        )}
      </Panel>

      {/* Preview emailu */}
      {(formData.to || formData.subject || formData.body) && (
        <Panel>
          <Title>
            <FontAwesomeIcon icon={faEnvelope} />
            Náhled emailu
          </Title>
          <EmailPreview>
            <PreviewTitle>Formát emailu:</PreviewTitle>
            <PreviewItem>
              <strong>Od:</strong> <span>{formData.from || '(nevyplněno)'}</span>
            </PreviewItem>
            <PreviewItem>
              <strong>Komu:</strong> <span>{formData.to || '(nevyplněno)'}</span>
            </PreviewItem>
            <PreviewItem>
              <strong>Předmět:</strong> <span>{formData.subject || '(nevyplněno)'}</span>
            </PreviewItem>
            <PreviewItem>
              <strong>Zpráva:</strong>
            </PreviewItem>
            <PreviewBody>
              {formData.body || '(nevyplněno)'}
            </PreviewBody>
          </EmailPreview>
        </Panel>
      )}

      {/* Info panel */}
      <Panel>
        <Alert $type="info">
          <FontAwesomeIcon icon={faEnvelope} />
          <div>
            <strong>ℹ️ Jak to funguje:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.8' }}>
              <li><strong>Backend endpoint:</strong> <code>/api/notify-email</code></li>
              <li><strong>Autentizace:</strong> Vyžaduje platný token (automaticky)</li>
              <li><strong>Email systém:</strong> PHP mail() funkce přes sendmail/postfix</li>
              <li><strong>Konfigurace:</strong> <code>/api.eeo/v2025.03_25/lib/mailconfig.php</code></li>
              <li><strong>Dokumentace:</strong> Viz <code>docs/MAIL-TEST-PANEL-SETUP.md</code></li>
            </ul>
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '4px' }}>
              <strong>⚙️ Produkční konfigurace:</strong> Nastavte environment proměnné:<br/>
              <code style={{ fontSize: '12px' }}>MAIL_FROM, MAIL_FROM_NAME, MAIL_REPLY_TO</code>
            </div>
          </div>
        </Alert>
      </Panel>
    </Container>
  );
};

export default MailTestPanel;
