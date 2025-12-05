import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';

const PopupContainer = styled.div`
	position: fixed;
	background: linear-gradient(145deg, #ffffff, #fef2f2);
	border-radius: 16px;
	padding: 1.5rem;
	min-width: 320px;
	max-width: 400px;
	box-shadow: 0 20px 60px rgba(220, 38, 38, 0.4), 0 0 0 2px rgba(220, 38, 38, 0.3);
	border: 2px solid #dc2626;
	animation: slideIn 0.4s ease-out forwards;
	cursor: ${props => props.isDragging ? 'grabbing' : 'grab'};
	user-select: none;
	z-index: 99999;
	transition: box-shadow 0.2s;

	&:hover {
		box-shadow: 0 24px 70px rgba(220, 38, 38, 0.5), 0 0 0 2px rgba(220, 38, 38, 0.4);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px) scale(0.9);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes pulse {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}
`;

const Header = styled.div`
	display: flex;
	align-items: center;
	gap: 1rem;
	margin-bottom: 1rem;
	padding-bottom: 1rem;
	border-bottom: 2px solid #fecaca;
`;

const IconWrapper = styled.div`
	width: 48px;
	height: 48px;
	background: linear-gradient(135deg, #dc2626, #ef4444);
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.5rem;
	animation: pulse 2s infinite;
`;

const HeaderText = styled.div`
	flex: 1;
`;

const Title = styled.h3`
	margin: 0;
	color: #0f172a;
	font-size: 1.25rem;
	font-weight: 700;
`;

const Timestamp = styled.p`
	margin: 0.25rem 0 0 0;
	color: #64748b;
	font-size: 0.875rem;
`;

const Content = styled.div`
	background: #fef3c7;
	border: 1px solid #fbbf24;
	border-radius: 8px;
	padding: 1rem;
	margin-bottom: 1rem;
`;

const TaskText = styled.p`
	margin: 0;
	color: #0f172a;
	font-size: 1rem;
	font-weight: 600;
	line-height: 1.5;
`;

const Actions = styled.div`
	display: flex;
	gap: 0.75rem;
	justify-content: flex-end;
`;

const Button = styled.button`
	background: ${props => props.variant === 'primary' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#e2e8f0'};
	color: ${props => props.variant === 'primary' ? 'white' : '#334155'};
	border: none;
	padding: 0.75rem 1.5rem;
	border-radius: 8px;
	font-size: 0.875rem;
	cursor: pointer;
	font-weight: 600;
	box-shadow: ${props => props.variant === 'primary' ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none'};
	transition: all 0.2s;

	&:hover {
		transform: translateY(-2px);
		box-shadow: ${props => props.variant === 'primary' ? '0 6px 16px rgba(34, 197, 94, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)'};
	}

	&:active {
		transform: translateY(0);
	}
`;

const CloseButton = styled.button`
	position: absolute;
	top: 0.75rem;
	right: 0.75rem;
	background: linear-gradient(135deg, #fef3c7, #fde68a);
	border: 1.5px solid #f59e0b;
	color: #92400e;
	cursor: pointer;
	font-size: 1.25rem;
	width: 36px;
	height: 36px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;
	box-shadow: 0 2px 6px rgba(245, 158, 11, 0.2);
	font-weight: 600;

	&:hover {
		background: linear-gradient(135deg, #fde68a, #fcd34d);
		color: #78350f;
		transform: scale(1.05);
		box-shadow: 0 3px 10px rgba(245, 158, 11, 0.3);
	}

	&:active {
		transform: scale(0.98);
	}
`;

/**
 * Floating popup okénko pro HIGH priority alarmy
 * Přesouvatelné, více oken může být zobrazeno najednou
 */
export const FloatingAlarmPopup = ({ alarm, position, onDismiss, onComplete, onPositionChange }) => {
	const [pos, setPos] = useState(position);
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const popupRef = useRef(null);

	// Format času alarmu
	const alarmDate = alarm?.alarm?.time ? new Date(alarm.alarm.time) :
		(alarm?.alarm ? new Date(alarm.alarm) : new Date());

	// Drag handlers
	const handleMouseDown = (e) => {
		// Ignoruj kliknutí na tlačítka
		if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
			return;
		}

		setIsDragging(true);
		const rect = popupRef.current.getBoundingClientRect();
		setDragOffset({
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		});
	};

	const handleMouseMove = (e) => {
		if (!isDragging) return;

		const newPos = {
			x: e.clientX - dragOffset.x,
			y: e.clientY - dragOffset.y
		};

		setPos(newPos);

		// Notify parent o změně pozice
		if (onPositionChange) {
			onPositionChange(alarm.id, newPos);
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);

			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	}, [isDragging, dragOffset]);

	// Animace při zavření
	const handleDismiss = () => {
		if (popupRef.current) {
			popupRef.current.style.animation = 'slideOut 0.3s ease-in';
			setTimeout(() => {
				onDismiss(alarm.id);
			}, 300);
		} else {
			onDismiss(alarm.id);
		}
	};

	// Odložit alarm o 10 minut
	const handleSnooze = () => {

		// Vypočítat nový čas (+ 10 minut)
		const newAlarmTime = Date.now() + (10 * 60 * 1000); // 10 minut v ms

		// Aktualizovat alarm s novým časem a reset fired flag
		if (alarm.alarm && typeof alarm.alarm === 'object') {
			const updatedAlarm = {
				...alarm.alarm,
				time: newAlarmTime,
				fired: false, // Reset aby se mohl znovu spustit
				acknowledged: false
			};

			// Callback pro update alarmu (předáno z Layout)
			if (window.updateTaskAlarmFromPopup) {
				window.updateTaskAlarmFromPopup(alarm.id, updatedAlarm);
			}
		}

		// Zavřít popup
		handleDismiss();
	};

	const handleComplete = () => {
		if (onComplete) {
			onComplete(alarm.id);
		}
		handleDismiss();
	};

	return ReactDOM.createPortal(
		<PopupContainer
			ref={popupRef}
			isDragging={isDragging}
			style={{
				left: `${pos.x}px`,
				top: `${pos.y}px`
			}}
			onMouseDown={handleMouseDown}
		>
			{/* Tlačítko Odložit o 10 min vpravo nahoře */}
			<CloseButton onClick={handleSnooze} title="Odložit alarm o 10 minut">
				⏰
			</CloseButton>

			<Header>
				<IconWrapper>
					🚨
				</IconWrapper>
				<HeaderText>
					<Title>HIGH Alarm TODO</Title>
					<Timestamp>
						{alarmDate.toLocaleString('cs-CZ', {
							day: '2-digit',
							month: '2-digit',
							year: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						})}
					</Timestamp>
				</HeaderText>
			</Header>

			<Content>
				<TaskText>{alarm.text}</TaskText>
				{alarm.alarm?.note && (
					<div style={{
						marginTop: '0.75rem',
						paddingTop: '0.75rem',
						borderTop: '1px solid #fbbf24',
						fontSize: '0.875rem',
						color: '#475569',
						fontStyle: 'italic'
					}}>
						<span style={{fontWeight: 600, color: '#92400e'}}>📝 Poznámka:</span> {alarm.alarm.note}
					</div>
				)}
			</Content>

			<Actions>
				<Button onClick={handleSnooze} title="Odložit alarm o 10 minut">
					⏰ Odložit o 10 min
				</Button>
				{onComplete && (
					<Button variant="primary" onClick={handleComplete}>
						<FontAwesomeIcon icon={faCheck} style={{ marginRight: '0.5rem' }} />
						Označit hotové
					</Button>
				)}
			</Actions>
		</PopupContainer>,
		document.body
	);
};

/**
 * Manager pro správu více floating popup oken
 * Automaticky rozmístí okna tak, aby se nepřekrývala
 */
export const FloatingAlarmManager = ({ alarms, onDismiss, onComplete }) => {
	const [positions, setPositions] = useState({});

	// Vypočítá pozici pro nové okno tak, aby se nepřekrývalo
	const calculatePosition = (index, total) => {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const popupWidth = 400;
		const popupHeight = 250;
		const margin = 20;

		// Cascade efekt - každé okno trochu níž a doprava
		const offsetX = (index * 30) % (vw - popupWidth - margin);
		const offsetY = (index * 40) % (vh - popupHeight - margin);

		return {
			x: Math.max(margin, Math.min(vw - popupWidth - margin, vw / 2 - popupWidth / 2 + offsetX)),
			y: Math.max(margin, Math.min(vh - popupHeight - margin, vh / 3 + offsetY))
		};
	};

	// Inicializuj pozice pro nové alarmy
	useEffect(() => {
		const newPositions = { ...positions };
		let hasChanges = false;

		alarms.forEach((alarm, index) => {
			if (!newPositions[alarm.id]) {
				newPositions[alarm.id] = calculatePosition(index, alarms.length);
				hasChanges = true;
			}
		});

		if (hasChanges) {
			setPositions(newPositions);
		}
	}, [alarms]);

	const handlePositionChange = (alarmId, newPos) => {
		setPositions(prev => ({
			...prev,
			[alarmId]: newPos
		}));
	};

	const handleDismiss = (alarmId) => {
		// Odstraň pozici
		setPositions(prev => {
			const newPos = { ...prev };
			delete newPos[alarmId];
			return newPos;
		});

		if (onDismiss) {
			onDismiss(alarmId);
		}
	};

	return (
		<>
			{alarms.map((alarm, index) => (
				<FloatingAlarmPopup
					key={alarm.id}
					alarm={alarm}
					position={positions[alarm.id] || calculatePosition(index, alarms.length)}
					onDismiss={handleDismiss}
					onComplete={onComplete}
					onPositionChange={handlePositionChange}
				/>
			))}
		</>
	);
};

export default FloatingAlarmManager;
