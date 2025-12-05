import { useEffect, useRef, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { notifyTodoAlarm } from '../services/notificationsApi';

// =============================================================================
// HELPER FUNKCE PRO FORMÁTOVÁNÍ
// =============================================================================

/**
 * Formátuje datum a čas do českého formátu
 * @param {Date} date - Date objekt
 * @returns {string} - "25. 10. 2025 14:30"
 */
const formatDateTime = (date) => {
	return date.toLocaleString('cs-CZ', {
		day: 'numeric',
		month: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
};

/**
 * Formátuje datum do českého formátu
 * @param {Date} date - Date objekt
 * @returns {string} - "25. 10. 2025"
 */
const formatDate = (date) => {
	return date.toLocaleDateString('cs-CZ', {
		day: 'numeric',
		month: 'numeric',
		year: 'numeric'
	});
};

/**
 * Formátuje čas do českého formátu
 * @param {Date} date - Date objekt
 * @returns {string} - "14:30"
 */
const formatTime = (date) => {
	return date.toLocaleTimeString('cs-CZ', {
		hour: '2-digit',
		minute: '2-digit'
	});
};

/**
 * Vypočítá zbývající čas do alarmu
 * @param {number} alarmTimestamp - Timestamp alarmu
 * @returns {string} - "5 minut", "2 hodiny", "Prošlý termín"
 */
const getTimeRemaining = (alarmTimestamp) => {
	const now = Date.now();
	const diff = alarmTimestamp - now;

	if (diff < 0) return 'Prošlý termín';

	const minutes = Math.floor(diff / 60000);
	if (minutes === 0) return 'NYNÍ!';
	if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuta' : minutes < 5 ? 'minuty' : 'minut'}`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} ${hours === 1 ? 'hodina' : hours < 5 ? 'hodiny' : 'hodin'}`;

	const days = Math.floor(hours / 24);
	return `${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}`;
};

/**
 * Odešle TODO alarm notifikaci na backend
 * @param {Object} task - Úkol s alarmem
 * @param {number} userId - ID uživatele
 * @param {number} alarmTime - Timestamp alarmu
 * @param {string} alarmPriority - 'NORMAL' nebo 'HIGH'
 * @param {string} userName - Jméno uživatele (volitelné)
 */
const sendTodoAlarmToBackend = async (task, userId, alarmTime, alarmPriority, userName = 'Uživatel') => {
	try {
		const now = Date.now();
		const alarmDate = new Date(alarmTime);
		const isExpired = now > alarmTime;
		const isHighPriority = alarmPriority === 'HIGH';

		// Připrav data pro BE podle dokumentace
		const todoData = {
			todo_title: task.text || task.title || 'TODO úkol',
			todo_note: task.alarm?.note || task.note || '',
			alarm_datetime: formatDateTime(alarmDate),
			alarm_date: formatDate(alarmDate),
			alarm_time: formatTime(alarmDate),
			user_name: userName,
			time_remaining: getTimeRemaining(alarmTime),
		todo_id: String(task.id)
	};

	// Odešli na BE
	const result = await notifyTodoAlarm(
		userId,
		todoData,
		isExpired,
		isHighPriority
	);

	return result;

} catch (error) {
	// Neblokuj - lokální notifikace stále funguje
	return null;
}
};// =============================================================================
// TODO ALARM HOOK
// =============================================================================

// ⚠️ REFAKTOR: localStorage funkce ODSTRANĚNY
// Notifikace se VYTVÁŘEJÍ pouze na backendu přes notifyTodoAlarm()
// Notifikace se NAČÍTAJÍ pouze z API přes getNotificationsList()
// localStorage se NEPOUŽÍVÁ pro vytváření ani ukládání notifikací
// Vše je single source of truth = DB API

/**
 * Hook pro kontrolu TODO alarmů
 * Kontroluje každou minutu, zda nějaký alarm neprošel
 * NORMAL alarmy: odešle na backend → zobrazí se v notification bell
 * HIGH alarmy: odešle na backend → zobrazí se floating popup + notification bell
 */
export const useTodoAlarms = (tasks, updateTaskAlarm, isLoggedIn, userId, onNotification, showToast, userName) => {
	const [activeAlarms, setActiveAlarms] = useState([]); // Array pro HIGH alarmy (floating popups)
	const lastCheckRef = useRef(null);
	const checkedAlarmsRef = useRef(new Set());

	// Kontrola alarmů
	const checkAlarms = useCallback(() => {
		if (!isLoggedIn || !tasks || tasks.length === 0) return;

		const now = Date.now();
		const newHighAlarms = [];

		// Projdi všechny úkoly s alarmem
		tasks.forEach(task => {
			// Zpracuj alarm - kompatibilita se starým formátem (číslo) i novým (objekt)
			let alarmTime = null;
			let alarmPriority = 'NORMAL';
			let alarmFired = false;
			let alarmAcknowledged = false;

			if (task.alarm) {
				if (typeof task.alarm === 'object') {
					alarmTime = task.alarm.time;
					alarmPriority = task.alarm.priority || 'NORMAL';
					alarmFired = task.alarm.fired || false;
					alarmAcknowledged = task.alarm.acknowledged || false;
				} else if (typeof task.alarm === 'number') {
					// Starý formát - jen timestamp
					alarmTime = task.alarm;
					alarmPriority = 'NORMAL';
					alarmFired = false;
					alarmAcknowledged = false;
				}
			}

			// ✅ POUZE pokud alarm NENÍ acknowledged (odložený)
			// Pokud úkol má alarm, není dokončený, ještě neodpálil A není odložený
			if (alarmTime && !task.done && !alarmFired && !alarmAcknowledged) {
				// Pokud čas alarmu už prošel a ještě jsme ho neodpálili v této session
				if (alarmTime <= now && !checkedAlarmsRef.current.has(task.id)) {

					// Označ jako zobrazený v této session
					checkedAlarmsRef.current.add(task.id);

					// Označ alarm jako odpálený v datech
					const updatedAlarm = typeof task.alarm === 'object'
						? { ...task.alarm, fired: true }
						: { time: task.alarm, priority: 'NORMAL', fired: true, acknowledged: false };

					updateTaskAlarm(task.id, updatedAlarm);

					// Podle priority zvolíme typ notifikace
					if (alarmPriority === 'HIGH') {
						// HIGH priority - floating popup + zvonek (BEZ Toast)
						newHighAlarms.push({
							...task,
							alarm: updatedAlarm
						});

						// Přidat do zvonečku (notification bell) - pouze ID pro tracking
						const notificationData = {
							id: `todo-alarm-${task.id}-${alarmTime}`,
							taskId: task.id,
							message: task.text,
							timestamp: alarmTime,
							alarmTime: alarmTime,
							priority: 'HIGH',
							note: task.alarm?.note || ''
						};

						if (onNotification) {
							onNotification(notificationData);
						}

						// ⚠️ NEUKLÁDÁME do localStorage - notifikace přijde z backendu
						// localStorage je jen cache pro notifikace Z backendu, ne pro vytváření nových

						// 🆕 ODESLAT NOTIFIKACI NA BACKEND (backend ji uloží a vrátí zpět)
						sendTodoAlarmToBackend(task, userId, alarmTime, 'HIGH', userName || 'Uživatel');
					} else {
						// NORMAL priority - pouze zvonek (BEZ Toast)

						// Přidat do zvonečku (notification bell) - pouze ID pro tracking
						const notificationData = {
							id: `todo-alarm-${task.id}-${alarmTime}`,
							taskId: task.id,
							message: task.text,
							timestamp: alarmTime,
							alarmTime: alarmTime,
							priority: 'NORMAL',
							note: task.alarm?.note || ''
						};

						if (onNotification) {
							onNotification(notificationData);
						}

						// ⚠️ NEUKLÁDÁME do localStorage - notifikace přijde z backendu
						// localStorage je jen cache pro notifikace Z backendu, ne pro vytváření nových

						// 🆕 ODESLAT NOTIFIKACI NA BACKEND (backend ji uloží a vrátí zpět)
						sendTodoAlarmToBackend(task, userId, alarmTime, 'NORMAL', userName || 'Uživatel');
					}
				}
			}
		});

		// Přidej nové HIGH alarmy k existujícím (s kontrolou duplikátů)
		if (newHighAlarms.length > 0) {
			setActiveAlarms(prev => {
				// Prevence duplikátů - kontroluj podle task.id
				const existingIds = new Set(prev.map(a => a.id));
				const filtered = newHighAlarms.filter(alarm => !existingIds.has(alarm.id));
				return [...prev, ...filtered];
			});
		}

		lastCheckRef.current = now;
	}, [tasks, updateTaskAlarm, isLoggedIn, onNotification]);

	// Background task - kontrola každou minutu
	useEffect(() => {
		if (!isLoggedIn) return;

		// Počáteční kontrola TODO alarmů
		checkAlarms();

		// Interval každou minutu
		const interval = setInterval(() => {
			checkAlarms();
		}, 60000); // 60 sekund

		return () => clearInterval(interval);
	}, [checkAlarms, isLoggedIn]);

	// Při mount načti alarmy do localStorage pro rychlý přístup
	useEffect(() => {
		if (!isLoggedIn || !userId) return;

		try {
			const alarmsToCheck = tasks
				.filter(t => {
					if (!t.alarm || t.done) return false;

					const alarmFired = typeof t.alarm === 'object' ? t.alarm.fired : false;
					return !alarmFired;
				})
				.map(t => {
					const alarmTime = typeof t.alarm === 'object' ? t.alarm.time : t.alarm;
					const alarmPriority = typeof t.alarm === 'object' ? t.alarm.priority : 'NORMAL';

					return {
						id: t.id,
						text: t.text,
						alarmTime: alarmTime,
						alarmPriority: alarmPriority,
						userId: userId
					};
				});

			localStorage.setItem(`todo-alarms-${userId}`, JSON.stringify(alarmsToCheck));
		} catch (error) {
		}
	}, [tasks, isLoggedIn, userId]);

	// Handler pro zavření HIGH alarmu (dismiss)
	const handleDismissAlarm = useCallback((taskId, isSnoozed = false) => {
		// Pokud byl alarm snooznutý, odstraň z checkedAlarmsRef aby se mohl znovu spustit
		if (isSnoozed) {
			checkedAlarmsRef.current.delete(taskId);
		}

		// Odstraň z activeAlarms
		setActiveAlarms(prev => prev.filter(a => a.id !== taskId));
	}, [activeAlarms]);

	// Handler pro označení úkolu jako hotového z alarmu
	const handleCompleteTask = useCallback((taskId) => {
		// Odstraň z activeAlarms
		setActiveAlarms(prev => prev.filter(a => a.id !== taskId));
		return taskId;
	}, [activeAlarms]);

	return {
		activeAlarms, // HIGH priority alarmy pro floating popups
		handleDismissAlarm,
		handleCompleteTask,
		checkAlarms // Export pro manuální kontrolu
	};
};

export default useTodoAlarms;
