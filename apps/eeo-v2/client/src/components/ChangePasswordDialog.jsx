import React, { useState, useCallback, useMemo, useEffect } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faLock } from '@fortawesome/free-solid-svg-icons';

const Backdrop = styled.div`
  position: fixed; inset: 0; background: rgba(17, 24, 39, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
`;

const Dialog = styled.div`
  width: min(520px, 92vw);
  background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px;
  box-shadow: 0 12px 32px rgba(0,0,0,.18);
  padding: 18px 18px 16px; color: #0f172a;
`;

const Header = styled.div`
  display:flex; align-items:center; justify-content: space-between; margin-bottom: 12px;
`;

const Title = styled.h3`
  margin: 0; font-size: 18px; font-weight: 700; color: #0f2b5a; display:flex; align-items:center; gap:10px;
`;

const CloseBtn = styled.button`
  border:none; background:transparent; cursor:pointer; padding:6px; border-radius:8px; color:#334155;
  &:hover{ background:#f1f5f9; }
`;

const Form = styled.form`
  display:flex; flex-direction:column; gap: 12px; margin-top: 6px;
`;

const Field = styled.label`
  display:flex; flex-direction:column; gap:6px; text-align:left;
`;

const Label = styled.span`
  font-size: 12px; font-weight: 700; letter-spacing:.5px; color:#1f2937; text-transform: uppercase;
`;

const Input = styled.input`
  padding: 10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; color:#111827; background:#fff;
  &:focus{ outline:none; border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.18); }
`;

const Footer = styled.div`
  display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top: 4px;
`;

const Button = styled.button`
  border:1px solid #e5e7eb; background:#fff; color:#0f172a; padding:8px 12px; border-radius:8px; cursor:pointer;
  display:inline-flex; align-items:center; gap:8px; font-weight:700;
  &:hover{ background:#f8fafc; }
`;

const Primary = styled(Button)`
  background:#0ea5e9; border-color:#0ea5e9; color:#fff;
  &:hover{ background:#0284c7; border-color:#0284c7; }
  &:disabled{ opacity:.6; cursor:not-allowed; }
`;

const ErrorText = styled.div`
  color:#b91c1c; font-size:12px; margin-top:-6px; text-align:left;
`;

const Hint = styled.div`
  font-size:11px; color:#64748b; margin-top:-2px; text-align:left;
`;

export default function ChangePasswordDialog({ open, onClose, onSubmit, loading = false, error = '' }) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) {
      setOldPwd(''); setNewPwd(''); setConfirmPwd(''); setLocalError('');
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    return Boolean(oldPwd) && Boolean(newPwd) && newPwd === confirmPwd && newPwd.length >= 8;
  }, [oldPwd, newPwd, confirmPwd]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!canSubmit) {
      setLocalError('Zkontrolujte prosím pole. Nové heslo musí mít alespoň 8 znaků a shodovat se v obou polích.');
      return;
    }
    setLocalError('');
    onSubmit && onSubmit({ oldPassword: oldPwd, newPassword: newPwd });
  }, [canSubmit, oldPwd, newPwd, onSubmit]);

  if (!open) return null;

  return (
    <Backdrop onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <Dialog role="dialog" aria-modal="true" aria-labelledby="chgPwdTitle">
        <Header>
          <Title id="chgPwdTitle"><FontAwesomeIcon icon={faLock} /> Změna hesla</Title>
          <CloseBtn onClick={onClose} aria-label="Zavřít"><FontAwesomeIcon icon={faTimes} /></CloseBtn>
        </Header>
        <Form onSubmit={handleSubmit}>
          <Field>
            <Label>Staré heslo</Label>
            <Input type="password" autoComplete="current-password" value={oldPwd} onChange={(e)=>setOldPwd(e.target.value)} required />
          </Field>
          <Field>
            <Label>Nové heslo</Label>
            <Input type="password" autoComplete="new-password" value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} required />
            <Hint>Minimálně 8 znaků. Doporučujeme kombinovat písmena, číslice a speciální znaky.</Hint>
          </Field>
          <Field>
            <Label>Potvrzení nového hesla</Label>
            <Input type="password" autoComplete="new-password" value={confirmPwd} onChange={(e)=>setConfirmPwd(e.target.value)} required />
          </Field>
          {(localError || error) && <ErrorText>{localError || error}</ErrorText>}
          <Footer>
            <Button type="button" onClick={onClose}><FontAwesomeIcon icon={faTimes} /> Zrušit</Button>
            <Primary type="submit" disabled={!canSubmit || loading}>
              <FontAwesomeIcon icon={faSave} /> {loading ? 'Ukládám…' : 'Uložit'}
            </Primary>
          </Footer>
        </Form>
      </Dialog>
    </Backdrop>
  );
}
