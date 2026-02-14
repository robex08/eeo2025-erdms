import { api2, getUserErrorMessage } from './api2auth';

export async function listStickyNotes({ token, username }) {
  try {
    const res = await api2.post('sticky/list', { token, username }, { timeout: 15000 });
    if (res.status !== 200) throw new Error(`Neočekávaný kód odpovědi: ${res.status}`);
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Chyba při načítání sticky poznámek');
    return res.data?.data || [];
  } catch (err) {
    throw new Error(getUserErrorMessage(err));
  }
}

export async function bulkUpsertStickyNotes({ token, username, notes }) {
  try {
    const res = await api2.post(
      'sticky/bulk-upsert',
      { token, username, notes },
      { timeout: 15000 }
    );
    if (res.status !== 200) throw new Error(`Neočekávaný kód odpovědi: ${res.status}`);
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Chyba při ukládání sticky poznámek');
    return res.data?.data || [];
  } catch (err) {
    throw new Error(getUserErrorMessage(err));
  }
}

export async function deleteStickyNote({ token, username, id }) {
  try {
    const res = await api2.post('sticky/delete', { token, username, id }, { timeout: 15000 });
    if (res.status !== 200) throw new Error(`Neočekávaný kód odpovědi: ${res.status}`);
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Chyba při mazání sticky poznámky');
    return res.data?.data || { deleted: true };
  } catch (err) {
    throw new Error(getUserErrorMessage(err));
  }
}

export async function clearAllStickyNotes({ token, username }) {
  try {
    const res = await api2.post('sticky/clear', { token, username }, { timeout: 15000 });
    if (res.status !== 200) throw new Error(`Neočekávaný kód odpovědi: ${res.status}`);
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Chyba při mazání všech sticky poznámek');
    return res.data?.data || { cleared: true };
  } catch (err) {
    throw new Error(getUserErrorMessage(err));
  }
}

export async function grantStickyShare({ token, username, sticky_id, target_type, target_id, prava_mask }) {
  try {
    const res = await api2.post(
      'sticky/share/grant',
      { token, username, sticky_id, target_type, target_id, prava_mask },
      { timeout: 15000 }
    );
    if (res.status !== 200) throw new Error(`Neočekávaný kód odpovědi: ${res.status}`);
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Chyba při sdílení sticky poznámky');
    return res.data?.data;
  } catch (err) {
    throw new Error(getUserErrorMessage(err));
  }
}

export async function revokeStickyShare({ token, username, sticky_id, target_type, target_id }) {
  try {
    const res = await api2.post(
      'sticky/share/revoke',
      { token, username, sticky_id, target_type, target_id },
      { timeout: 15000 }
    );
    if (res.status !== 200) throw new Error(`Neočekávaný kód odpovědi: ${res.status}`);
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Chyba při rušení sdílení sticky poznámky');
    return res.data?.data;
  } catch (err) {
    throw new Error(getUserErrorMessage(err));
  }
}

export async function listStickyShares({ token, username, sticky_id }) {
  try {
    const res = await api2.post(
      'sticky/share/list',
      { token, username, sticky_id },
      { timeout: 15000 }
    );
    if (res.status !== 200) throw new Error(`Neočekávaný kód odpovědi: ${res.status}`);
    if (res.data?.status === 'error') throw new Error(res.data?.message || 'Chyba při načítání sdílení sticky poznámky');
    return res.data?.data || [];
  } catch (err) {
    throw new Error(getUserErrorMessage(err));
  }
}
