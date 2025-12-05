import React, { useEffect, useState, useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckDouble, faTrash, faPlus, faFont } from '@fortawesome/free-solid-svg-icons';
import { PanelHeader, TinyBtn } from './PanelPrimitives';
import styled from '@emotion/styled';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import draftManager from '../../services/DraftManager';
import { isValidConcept, hasDraftChanges } from '../../utils/draftUtils';

const Bubble = styled.div`
	position:fixed; width:360px; max-width:94vw; max-height:75vh;
	/* slightly reduce the opaque gradient so the tint shows through */
	background:linear-gradient(180deg, rgba(15,23,42,0.94), rgba(9,12,20,0.94));
	/* combine inset blue tint and outer shadow so inset isn't overwritten */
	box-shadow: inset 0 0 0 2000px rgba(32,45,101,0.10), 0 12px 40px rgba(2,6,23,0.6);
	border:1px solid rgba(32,45,101,0.22);
	border-radius:14px; padding:0.5rem; display:flex; flex-direction:column; gap:0.5rem; color:#e6eefc; z-index:1000000; transform-origin: right top; transition: opacity .18s ease, transform .18s ease; opacity:0; transform: scale(.92);
	pointer-events:none;
	&.open{ opacity:1; transform: scale(1); pointer-events:auto; }
`;

const NotificationsScroll = styled.div`
	overflow:auto; display:flex; flex-direction:column; gap:.45rem; padding:.2rem; scrollbar-width: thin; scrollbar-color:#475569 transparent; max-height:calc(75vh - 160px); /* taller */
	&::-webkit-scrollbar { width:8px; }
	&::-webkit-scrollbar-thumb { background:#334155; border-radius:6px; }
`;

export const NotificationsPanel = ({font, notifications, clearNotifications, onClose, adjustFont, markAllRead, anchorRef, isVisible}) => {

	const navigate = useNavigate();
	const { userDetail } = useContext(AuthContext);
	const [pos, setPos] = useState({ left: undefined, top: undefined });
	const [ready, setReady] = useState(false);
	const bubbleRef = React.useRef(null);

	// 🔥 NOVÁ FUNKCE: Kontrola neuložených změn před otevřením objednávky
	const handleOrderClick = async (orderId) => {
		console.log('\n════════════════════════════════════════════════════════════════');
		console.log('🔔 [KROK 1/7] NotificationsPanel - handleOrderClick ZAVOLÁNA!');
		console.log('📋 Parametry:', { orderId, 'typeof': typeof orderId });
		console.log('════════════════════════════════════════════════════════════════\n');

		const targetOrderId = parseInt(orderId);
		const user_id = userDetail?.user_id;

		console.log('🔔 [KROK 2/7] Extrakce user_id a konverze ID');
		console.log('📊 Data:', { targetOrderId, user_id, 'userDetail exists': !!userDetail });

		if (!user_id) {
			console.log('⚠️ [KROK 2/7] Bez user_id - přímá navigace bez kontroly draftu');
			console.log('🔗 Navigate URL:', `/order-form-25?edit=${targetOrderId}`);
			navigate(`/order-form-25?edit=${targetOrderId}`);
			return;
		}

		try {
			console.log('\n🔔 [KROK 3/7] Začínám kontrolu draftu přes DraftManager');
			console.log('📦 DraftManager.setCurrentUser:', user_id);
			draftManager.setCurrentUser(user_id);
			
			console.log('📦 DraftManager.hasDraft() - volám...');
			const hasDraft = await draftManager.hasDraft();
			console.log('✅ [KROK 3/7] DraftManager.hasDraft() vrátil:', hasDraft);

			let shouldShowConfirmDialog = false;
			let draftDataToStore = null;
			let isDraftForThisOrder = false;

			if (hasDraft) {
				console.log('\n🔔 [KROK 4/7] Draft existuje - načítám data');
				try {
					console.log('📦 DraftManager.loadDraft() - volám...');
					const draftData = await draftManager.loadDraft();
					console.log('✅ [KROK 4/7] Draft načten:', {
						'má formData': !!draftData?.formData,
						'má savedOrderId': !!draftData?.savedOrderId,
						'savedOrderId': draftData?.savedOrderId,
						'formData.id': draftData?.formData?.id
					});

					// 🎯 KONTROLA OWNERSHIP: Patří draft k TÉTO objednávce?
					const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
					const currentOrderId = targetOrderId;

					console.log('\n🔔 [KROK 5/7] Porovnání ownership draftu');
					console.log('📊 POROVNÁNÍ ID:', {
						draftOrderId,
						currentOrderId,
						'String(draftOrderId)': String(draftOrderId),
						'String(currentOrderId)': String(currentOrderId),
						'jsou stejné?': String(draftOrderId) === String(currentOrderId)
					});

					// ✅ Pokud draft patří k TÉTO objednávce, NEPTAT SE!
					if (draftOrderId && currentOrderId && String(draftOrderId) === String(currentOrderId)) {
						console.log('✅ [KROK 5/7] Draft patří k TÉTO objednávce - naviguju bez ptaní');
						console.log('🎯 Rozhodnutí: Přímá navigace (draft pro tuto objednávku)');
						shouldShowConfirmDialog = false;
						isDraftForThisOrder = true;
					} else {
						// ❌ Draft patří k JINÉ objednávce - zeptej se
						console.log('❌ [KROK 5/7] Draft patří k JINÉ objednávce - kontroluji změny');
						const hasNewConcept = isValidConcept(draftData);
						const hasDbChanges = hasDraftChanges(draftData);
						console.log('📊 Analýza změn v draftu:', { hasNewConcept, hasDbChanges });
						shouldShowConfirmDialog = hasNewConcept || hasDbChanges;

					if (shouldShowConfirmDialog) {
						console.log('⚠️ [KROK 5/7] Mám neuložené změny - budu zobrazovat dialog');
						draftDataToStore = draftData;
					} else {
						console.log('✅ [KROK 5/7] Žádné změny v draftu - naviguju bez ptaní');
					}
					}
				} catch (error) {
					console.error('❌ [KROK 5/7] Chyba při načítání draftu:', error);
					shouldShowConfirmDialog = false;
				}
			} else {
				console.log('✅ [KROK 4/7] Draft NEexistuje - přímá navigace');
			}			// 🎯 OPTIMALIZACE: Pokud draft patří k TÉTO objednávce, rovnou naviguj
			if (isDraftForThisOrder) {
				console.log('\n🔔 [KROK 6/7] Draft pro TUTO objednávku - navigace BEZ dialogu');
				console.log('🔗 Navigate URL:', `/order-form-25?edit=${targetOrderId}`);
				navigate(`/order-form-25?edit=${targetOrderId}`);
				console.log('════════════════════════════════════════════════════════════════\n');
				return;
			}

			// 🎯 Pokud existuje draft pro JINOU objednávku, zobraz confirm dialog
			console.log('\n🔔 [KROK 6/7] Kontrola, zda zobrazit confirm dialog');
			console.log('📊 Před zobrazením dialogu:', { shouldShowConfirmDialog, 'má draftDataToStore?': !!draftDataToStore });
			
			if (shouldShowConfirmDialog && draftDataToStore) {
				const formData = draftDataToStore.formData || draftDataToStore;
				const draftTitle = formData.ev_cislo || formData.cislo_objednavky || formData.predmet || '★ KONCEPT ★';
				const hasNewConcept = isValidConcept(draftDataToStore);

				console.log('🚨 [KROK 6/7] ZOBRAZUJI CONFIRM DIALOG');
				console.log('📋 Dialog data:', { draftTitle, hasNewConcept });
				console.log('⏸️  Čekám na rozhodnutí uživatele...');

				const confirmResult = window.confirm(
					`⚠️ POZOR - Máte rozpracovanou ${hasNewConcept ? 'novou objednávku' : 'editaci objednávky'} "${draftTitle}" s neuloženými změnami.\n\n` +
					`Přepnutím na jinou objednávku přijdete o neuložené změny!\n\n` +
					`Chcete pokračovat a zahodit neuložené změny?`
				);

				console.log('\n🔔 [KROK 7/7] Rozhodnutí uživatele:', confirmResult ? '✅ ANO (pokračovat)' : '❌ NE (zrušit)');

				if (!confirmResult) {
					// Uživatel zrušil - zůstaneme na stránce
					console.log('🚫 Uživatel zrušil - KONEC (zůstávám na stránce)');
					console.log('════════════════════════════════════════════════════════════════\n');
					return;
				}

				// Uživatel potvrdil - vyčisti koncept a pokračuj
				console.log('✅ [KROK 7/7] Uživatel potvrdil - mažu draft');
				await draftManager.deleteAllDraftKeys();
				console.log('✅ Draft smazán');
			}

			// ✅ Naviguj na objednávku v EDIT módu
			console.log('\n🔔 [KROK 7/7] FINÁLNÍ NAVIGACE');
			console.log('🔗 Navigate URL:', `/order-form-25?edit=${targetOrderId}`);
			navigate(`/order-form-25?edit=${targetOrderId}`);
			console.log('✅ Navigate zavoláno - předávám kontrolu React Routeru');
			console.log('════════════════════════════════════════════════════════════════\n');

		} catch (error) {
			console.error('\n❌❌❌ KRITICKÁ CHYBA v handleOrderClick ❌❌❌');
			console.error('📛 Error:', error);
			console.error('📛 Stack:', error.stack);
			console.log('🔄 FALLBACK: Navigace bez kontroly draftu');
			// V případě chyby naviguj bez kontroly (fallback)
			navigate(`/order-form-25?edit=${targetOrderId}`);
			console.log('════════════════════════════════════════════════════════════════\n');
		}
	};

	useEffect(() => {
		// compute anchor rect and set fixed position so bubble is above all stacking contexts
		const compute = () => {
			try {
				const anchor = anchorRef && anchorRef.current;
				if (!anchor) return setPos({ left: undefined, top: undefined });
				const rect = anchor.getBoundingClientRect();
				const width = Math.min(320, window.innerWidth * 0.9);
				const left = Math.min(window.innerWidth - width - 12, Math.max(8, rect.right - width + 8));
				const top = rect.bottom + 8;
				setPos({ left, top });
			} catch (err) { setPos({ left: undefined, top: undefined }); }
		};
		compute();
		setReady(true);
		window.addEventListener('resize', compute);
		window.addEventListener('scroll', compute, true);
		return () => { window.removeEventListener('resize', compute); window.removeEventListener('scroll', compute, true); };
	}, [anchorRef]);

	// For entry animation, add 'open' class when isVisible true
	const classes = isVisible ? 'open' : '';

	// Close on outside click
	React.useEffect(() => {
		if (!isVisible) return;
		const onDown = (e) => {
			try {
				const b = bubbleRef.current;
				if (b && b.contains(e.target)) return;
				const a = anchorRef && anchorRef.current;
				if (a && a.contains(e.target)) return;
				onClose && onClose();
			} catch(_) {}
		};
		document.addEventListener('mousedown', onDown, true);
		return () => document.removeEventListener('mousedown', onDown, true);
	}, [isVisible, anchorRef, onClose]);

	const bubble = (
		<Bubble ref={bubbleRef} className={classes} style={{ left: pos.left, top: pos.top }} data-notif-bubble>
			<PanelHeader style={{cursor:'default', userSelect:'none'}}>
				<span>Notifikace</span>
				<div style={{display:'flex', gap:'.25rem', alignItems:'center'}}>
					<TinyBtn aria-label="Zvětšit písmo" title="Zvětšit" type="button" onClick={()=>adjustFont(0.05)} disabled={font>=1.20} style={{padding:'.25rem .35rem'}}>
						<FontAwesomeIcon icon={faPlus} />
					</TinyBtn>
					<TinyBtn aria-label="Zmenšit písmo" title="Zmenšit" type="button" onClick={()=>adjustFont(-0.05)} disabled={font<=0.55} style={{padding:'.25rem .35rem'}}>
						<FontAwesomeIcon icon={faFont} />
					</TinyBtn>
					<TinyBtn aria-label="Označit všechny jako přečtené" title="Přečteno" type="button" onClick={markAllRead} style={{padding:'.25rem .35rem'}}>
						<FontAwesomeIcon icon={faCheckDouble} />
					</TinyBtn>
					<TinyBtn aria-label="Vymazat všechny" title="Vymazat" type="button" onClick={clearNotifications} style={{padding:'.25rem .35rem'}}>
						<FontAwesomeIcon icon={faTrash} />
					</TinyBtn>
					<TinyBtn aria-label="Zavřít" title="Zavřít" type="button" onClick={onClose} style={{padding:'.25rem .35rem'}}>
						×
					</TinyBtn>
				</div>
			</PanelHeader>
			<NotificationsScroll style={{ fontSize:`${font}rem` }}>
				{notifications.length === 0 && <div style={{opacity:.65, fontSize:'.75rem', padding:'.6rem'}}>Žádné notifikace</div>}
				{notifications.slice().sort((a,b)=>b.ts-a.ts).map((n, idx) => {
					const colorMap = n.type === 'new' ? '#60a5fa'
						: n.type === 'approved' ? '#34d399'
						: n.type === 'tip' ? '#facc15'
						: '#facc15';
					const content = n.message || '(prázdné)';
					// simple appear animation stagger
					const appearStyle = { animation: `notif-pop .18s ease ${idx * 30}ms both` };
					// Nepřečtené tučně, přečtené normálně a černou barvou
					const textColor = n.read ? '#1a1a1a' : colorMap;
					const fontWeight = n.read ? 400 : 700;
					return (
						<div key={n.id} style={{display:'flex', flexDirection:'column', gap:'.15rem', background:'rgba(255,255,255,0.02)', padding:'.55rem .7rem', borderRadius:'8px', border:'1px solid rgba(30,41,59,0.6)', position:'relative', ...appearStyle}}>
							{!n.read && <span style={{position:'absolute', top:'8px', right:'10px', width:'8px', height:'8px', borderRadius:'50%', background:'#dc2626'}} />}
							<span style={{fontSize:'0.95em', letterSpacing:'.5px', fontWeight:fontWeight, color:textColor}}>{content}</span>
							{ (n.orderId || n.orderNumber) && (
								<div style={{marginTop:6}}>
									<button type="button" onClick={async () => {
											try {
												const id = n.orderId || n.orderNumber;
												if (!id) return;
												
												// ✅ NOVÉ: Zavolej handleOrderClick pro kontrolu neuložených změn
												await handleOrderClick(id);
												
												// ✅ Zavři panel po navigaci
												onClose?.();
											} catch (err) {
												console.error('❌ Chyba v onClick notifikace:', err);
											}
										}}
										style={{background:'transparent', border:'none', padding:0, margin:0, color:colorMap, textDecoration:'underline', cursor:'pointer', fontWeight:700}}>
										Ev.č.: {n.orderNumber || n.orderId}
									</button>
								</div>
							)}
							<div style={{display:'flex', gap:'.5rem', alignItems:'center', justifyContent:'space-between'}}>
								<span style={{fontSize:'.55em', opacity:.45, letterSpacing:'.5px'}}>{n.type}</span>
								<span style={{fontSize:'.70em', opacity:.55}}>{new Date(n.ts).toLocaleString('cs-CZ')}</span>
							</div>
						</div>
					);
				})}
			</NotificationsScroll>
			<div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'.6rem'}}>
				<div style={{fontSize:'.65rem', opacity:.6}}>localStorage: notif_data</div>
				<div style={{fontSize:'.65rem', opacity:.55}}>font {font.toFixed(2)}rem</div>
			</div>
			{/* notch removed as requested */}
		</Bubble>
	);

	// Create portal target (body by default)
	if (typeof document === 'undefined') return null;
	return createPortal(bubble, document.body);
};

// small keyframes in JS-in-CSS using global style injection would be ideal, but to keep changes local,
// ensure the app has these style rules available (we can inject a tiny style tag here):
const styleElId = 'notif-panel-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(styleElId)) {
	const s = document.createElement('style');
	s.id = styleElId;
	s.textContent = `
	@keyframes notif-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity:1; transform: translateY(0) scale(1); } }
	`;
	document.head.appendChild(s);
}
