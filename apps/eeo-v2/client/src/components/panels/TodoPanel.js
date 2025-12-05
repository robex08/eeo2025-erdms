import React from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faPlus, faTrash, faEdit, faSync, faSave, faClock, faMinus, faSquare, faWindowRestore, faBell, faGripVertical, faEye, faEyeSlash, faCheck, faFileExport, faFileImport } from '@fortawesome/free-solid-svg-icons';
import { PanelBase, PanelHeader, TinyBtn, edgeHandles } from './PanelPrimitives';
import styled from '@emotion/styled';
import DatePicker from '../DatePicker';
import TimePicker from '../TimePicker';

const TodoListBox = styled.div`
	flex:1; overflow:auto; border:1px solid #93c5fd; border-radius:6px; padding:0.4rem 0.45rem; background:#eff6ff; display:flex; flex-direction:column; gap:.45rem;
	scrollbar-width: thin; scrollbar-color:#60a5fa #eff6ff; /* thumb, track */
	&::-webkit-scrollbar { width:10px; }
	&::-webkit-scrollbar-track { background:#eff6ff; border-radius:6px; }
	&::-webkit-scrollbar-thumb { background:#93c5fd; border-radius:6px; border:2px solid #eff6ff; }
	&::-webkit-scrollbar-thumb:hover { background:#60a5fa; }
`;
const TodoItemRow = styled.div(({done, dragging, alarmPriority, priority}) => `
	display:flex; gap:.75rem; position:relative; width:100%;
	background:linear-gradient(145deg,
		${done ? 'rgba(226,232,240,0.65)' :
		  alarmPriority === 'HIGH' ? 'rgba(254,226,226,0.90)' :
		  alarmPriority === 'NORMAL' ? 'rgba(254,243,199,0.75)' :
		  'rgba(255,255,255,0.85)'},
		${done ? 'rgba(226,232,240,0.55)' :
		  alarmPriority === 'HIGH' ? 'rgba(254,226,226,0.80)' :
		  alarmPriority === 'NORMAL' ? 'rgba(254,243,199,0.65)' :
		  'rgba(240,248,255,0.9)'});
	border:1px solid ${done ? '#cbd5e1' :
		alarmPriority === 'HIGH' ? '#fca5a5' :
		alarmPriority === 'NORMAL' ? '#fbbf24' :
		'#bfdbfe'};
	padding:.55rem .75rem .55rem .85rem; border-radius:10px; line-height:1.25;
	/* inherit font-size from container so A+/A- škáluje */
	align-items:flex-start; box-shadow:0 2px 5px rgba(30,58,138,0.08), 0 1px 2px rgba(0,0,0,0.06);
	transition: background .22s, border-color .22s, box-shadow .22s, transform .2s;
	${done ? 'opacity:.70;' : ''}
	${dragging ? 'opacity:.50; transform:scale(0.98);' : ''}
	&:before { content:""; position:absolute; left:0; top:0; bottom:0; width:5px; border-radius:10px 0 0 10px;
		background:${done ? '#94a3b8' :
			priority === 'high' ? '#dc2626' :
			priority === 'low' ? '#eab308' :
			'#3b82f6'};
		opacity:${done ? .55 : .95};
		box-shadow: inset -2px 0 4px rgba(0,0,0,0.15), 2px 0 3px rgba(0,0,0,0.1); }
	&:hover { box-shadow:0 4px 12px rgba(30,58,138,0.15), 0 2px 4px rgba(0,0,0,0.08); transform:translateY(-1px); }
	&:active { transform:translateY(0); }
`);
const AddTaskForm = styled.form`display:flex; gap:.4rem; margin-top:.15rem;`;
const TaskInput = styled.input`
	flex:1; border:1px solid #93c5fd; background:#f0f8ff; color:#0f172a; padding:.5rem .65rem; border-radius:6px; font-size:.725rem; outline:none; transition:border-color .18s, box-shadow .18s, background .18s; font-weight:500;
	&::placeholder { color:#1e3a8a; opacity:.55; }
	&:focus{border-color:#60a5fa; box-shadow:0 0 0 2px rgba(96,165,250,0.35); background:#ffffff;}
`;

const StatusBar = styled.div`
	display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.6rem;
	background: rgba(219, 234, 254, 0.8); border-top: 1px solid #93c5fd; font-size: 0.65rem;
	color: #1e3a8a; border-radius: 0 0 6px 6px; gap: 0.5rem;
`;

const StatusItem = styled.div`
	display: flex; align-items: center; gap: 0.3rem; opacity: 0.9;
`;

const StatusButton = styled.button`
	background: none; border: none; color: #1e3a8a; cursor: pointer; padding: 0.2rem;
	border-radius: 3px; display: flex; align-items: center; transition: background 0.2s;
	&:hover { background: rgba(96, 165, 250, 0.2); }
	&:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// Confirm Dialog styled components
const ConfirmOverlay = styled.div`
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
	display: flex; justify-content: center; align-items: center; z-index: 10000;
	animation: fadeIn 0.2s ease-out;
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const ConfirmDialog = styled.div`
	background: white; border-radius: 12px; padding: 2rem; max-width: 450px; width: 90%;
	box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	animation: slideIn 0.3s ease-out;
	@keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

const ConfirmHeader = styled.div`
	display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;
`;

const ConfirmIcon = styled.div`
	width: 48px; height: 48px; border-radius: 50%;
	background: ${props => props.$danger ? '#fecaca' : '#fef3c7'};
	display: flex; align-items: center; justify-content: center;
	color: ${props => props.$danger ? '#dc2626' : '#d97706'};
	font-size: 1.5rem;
`;

const ConfirmTitle = styled.h3`
	font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0;
`;

const ConfirmContent = styled.div`
	margin-bottom: 2rem; line-height: 1.6; color: #475569;
`;

const ConfirmActions = styled.div`
	display: flex; gap: 0.75rem; justify-content: flex-end;
`;

const ConfirmButton = styled.button`
	padding: 0.75rem 1.5rem; border: 2px solid; border-radius: 8px;
	font-weight: 600; cursor: pointer; transition: all 0.2s ease;
	${props => props.$variant === 'primary' ? `
		background: #dc2626; color: white; border-color: #dc2626;
		&:hover { background: #b91c1c; border-color: #b91c1c; transform: translateY(-1px);
			box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25); }
	` : `
		background: white; color: #6b7280; border-color: #d1d5db;
		&:hover { background: #f9fafb; border-color: #9ca3af; color: #374151; }
	`}
`;

export const TodoPanel = ({state, font, tasks, newTask, setNewTask, addTask, toggleTask, removeTask, reorderTasks, updateTaskAlarm, updateTaskPriority, clearDone, clearAllTasks, importTasks, onClose, adjustFont, onEngage, bringFront, beginDrag, panelZ, isActive, hovered, opacityConfig, onHoverEnter, onHoverLeave, autoSaveStatus, serverSyncStatus, manualSaveTodo, refreshFromServer, formatTime, minimizePanel, maximizePanel, storageId}) => {
	const { base=0.35, hover=0.65, engaged=0.95 } = opacityConfig || {};
	const computedOpacity = isActive ? engaged : (hovered ? hover : base);
	// jednotná interní velikost písma (vždy používáme localFont, prop font jen synchronizuje počáteční hodnotu)
	const [localFont, setLocalFont] = React.useState(() => (typeof font === 'number' ? font : 0.85));
	React.useEffect(()=> { if (typeof font === 'number') setLocalFont(font); }, [font]);
	// persist font immediately (allow also anonymous) – layout/useFloatingPanels already persists, this is quick safety when panel lives standalone
	React.useEffect(()=>{ try { if(storageId) localStorage.setItem(`layout_tasks_font_${storageId}`, String(localFont)); } catch{} }, [localFont, storageId]);

	// Stav pro zobrazení/skrytí hotových úkolů (defaultně zobrazovat)
	const [showCompleted, setShowCompleted] = React.useState(() => {
		try {
			const stored = localStorage.getItem(`layout_tasks_showCompleted_${storageId}`);
			return stored !== null ? JSON.parse(stored) : true; // defaultně true (zobrazovat)
		} catch {
			return true;
		}
	});

	// Persist showCompleted do localStorage
	React.useEffect(() => {
		try {
			if(storageId) localStorage.setItem(`layout_tasks_showCompleted_${storageId}`, JSON.stringify(showCompleted));
		} catch {}
	}, [showCompleted, storageId]);

	// Filtrování úkolů podle stavu showCompleted
	const visibleTasks = React.useMemo(() => {
		return showCompleted ? tasks : tasks.filter(t => !t.done);
	}, [tasks, showCompleted]);

	// State pro confirm dialogy
	const [confirmDialog, setConfirmDialog] = React.useState(null); // { type: 'clearDone' | 'clearAll', data: {...} }

	const effFont = localFont;
	const handleAdjustFont = (delta) => {
		setLocalFont(f => {
			const next = Math.min(1.30, Math.max(0.55, +(f + delta).toFixed(2)));
			return next;
		});
		// informuj parenta pro konzistentní sdílení mezi panely (adjustFont dělá clamp + persist)
		adjustFont && adjustFont(delta);
	};

	// Handler pro smazání hotových - otevře confirm dialog
	const handleClearDone = () => {
		const doneCount = tasks.filter(t => t.done).length;
		if (doneCount === 0) {
			return; // Nic nedělej, žádné hotové úkoly
		}
		setConfirmDialog({
			type: 'clearDone',
			data: { count: doneCount }
		});
	};

	// Handler pro smazání všech - otevře confirm dialog
	const handleClearAll = () => {
		if (tasks.length === 0) {
			return; // Nic nedělej, žádné úkoly
		}
		setConfirmDialog({
			type: 'clearAll',
			data: { count: tasks.length }
		});
	};

	// Handler pro potvrzení z confirm dialogu
	const handleConfirmAction = () => {
		if (!confirmDialog) return;

		if (confirmDialog.type === 'clearDone') {
			clearDone();
		} else if (confirmDialog.type === 'clearAll') {
			clearAllTasks();
		} else if (confirmDialog.type === 'import') {
			// Import úkolů
			if (importTasks && confirmDialog.data.tasks) {
				importTasks(confirmDialog.data.tasks);
				console.log('📥 Importované úkoly:', confirmDialog.data.tasks);
			}
		}

		setConfirmDialog(null);
	};

	// Export TODO do Markdown
	const handleExportToMarkdown = () => {
		try {
			let markdown = `# TODO List\n\n`;
			markdown += `*Exportováno: ${new Date().toLocaleString('cs-CZ')}*\n\n`;
			markdown += `**Celkem úkolů:** ${tasks.length} | **Nedokončených:** ${tasks.filter(t => !t.done).length}\n\n`;
			markdown += `---\n\n`;

			// Nedokončené úkoly
			const unfinishedTasks = tasks.filter(t => !t.done);
			if (unfinishedTasks.length > 0) {
				markdown += `## 📋 Nedokončené úkoly (${unfinishedTasks.length})\n\n`;
				unfinishedTasks.forEach((task, idx) => {
					const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'low' ? '🟡' : '🔵';
					const alarmInfo = task.alarm ? ` ⏰ ${new Date(typeof task.alarm === 'object' ? task.alarm.time : task.alarm).toLocaleString('cs-CZ')}` : '';
					markdown += `${idx + 1}. ${priorityEmoji} **${task.text}**${alarmInfo}\n`;
					if (task.createdAt) {
						markdown += `   - *Vytvořeno: ${new Date(task.createdAt).toLocaleString('cs-CZ')}*\n`;
					}
					markdown += `\n`;
				});
			}

			// Hotové úkoly
			const doneTasks = tasks.filter(t => t.done);
			if (doneTasks.length > 0) {
				markdown += `## ✅ Hotové úkoly (${doneTasks.length})\n\n`;
				doneTasks.forEach((task, idx) => {
					const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'low' ? '🟡' : '🔵';
					markdown += `${idx + 1}. ${priorityEmoji} ~~${task.text}~~\n`;
					if (task.createdAt) {
						markdown += `   - *Vytvořeno: ${new Date(task.createdAt).toLocaleString('cs-CZ')}*\n`;
					}
					markdown += `\n`;
				});
			}

			// Vytvoření a stažení souboru
			const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `TODO_${new Date().toISOString().split('T')[0]}.md`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('❌ Chyba při exportu TODO:', error);
			alert('Chyba při exportu TODO do Markdown!');
		}
	};

	// Import TODO z Markdown
	const handleImportFromMarkdown = () => {
		try {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.md,.markdown,.txt';

			input.onchange = (e) => {
				const file = e.target.files[0];
				if (!file) return;

				const reader = new FileReader();
				reader.onload = (event) => {
					try {
						const content = event.target.result;
						const lines = content.split('\n');
						const importedTasks = [];

						lines.forEach(line => {
							// Parsování TODO položek (číslované řádky s textem)
							// Formát: "1. 🔵 **Text úkolu** ⏰ datum"
							const taskMatch = line.match(/^\d+\.\s+(🔴|🟡|🔵)\s+(?:\*\*)?(.+?)(?:\*\*)?(?:\s+⏰\s+(.+))?$/);
							if (taskMatch) {
								const [, priorityEmoji, text, alarmTime] = taskMatch;

								// Zjistit prioritu z emoji
								let priority = 'normal';
								if (priorityEmoji === '🔴') priority = 'high';
								else if (priorityEmoji === '🟡') priority = 'low';

								// Zjistit stav (hotové mají ~~text~~)
								const isDone = text.includes('~~');
								const cleanText = text.replace(/~~/g, '').trim();

								const task = {
									id: Date.now() + Math.random(),
									text: cleanText,
									done: isDone,
									priority: priority,
									createdAt: new Date().toISOString()
								};

								// Pokud má alarm
								if (alarmTime) {
									try {
										const parsedDate = new Date(alarmTime);
										if (!isNaN(parsedDate.getTime())) {
											task.alarm = {
												time: parsedDate.getTime(),
												priority: 'NORMAL'
											};
										}
									} catch (err) {
										console.warn('Nepodařilo se parsovat datum alarmu:', alarmTime);
									}
								}

								importedTasks.push(task);
							}
						});

						if (importedTasks.length > 0) {
							// Otevři confirm dialog pro import
							setConfirmDialog({
								type: 'import',
								data: {
									count: importedTasks.length,
									tasks: importedTasks
								}
							});
						} else {
							// Žádné úkoly nenalezeny
							console.warn('⚠️ V souboru nebyly nalezeny žádné TODO položky.');
						}
					} catch (error) {
						console.error('❌ Chyba při parsování Markdown:', error);
					}
				};

				reader.readAsText(file);
			};

			input.click();
		} catch (error) {
			console.error('❌ Chyba při importu TODO:', error);
			alert('Chyba při importu TODO z Markdown!');
		}
	};

	return (
		<PanelBase
			data-floating-panel="true"
			style={{ left: state.x, top: state.y, width: state.w, height: state.h, maxWidth: state.maximized ? 'none' : '94vw', maxHeight: state.maximized ? 'none' : '75vh', background:'linear-gradient(145deg, rgba(224,242,255,0.96), rgba(191,219,254,0.94))', border:'1px solid #60a5fa', color:'#0f172a', cursor:'default', zIndex: panelZ, boxShadow:'0 8px 24px rgba(30,58,138,0.25)', opacity: computedOpacity, transition:'opacity .22s ease' }}
			onMouseEnter={()=>onHoverEnter && onHoverEnter()}
			onMouseLeave={()=>onHoverLeave && onHoverLeave()}
			onMouseDown={(e)=> { if(!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('textarea')) { if (!isActive) { onEngage && onEngage(); } else { bringFront(); } } }}
		>
			{edgeHandles(beginDrag,'todo')}
			<PanelHeader onMouseDown={(e)=> { if(e.target.closest('button')) return; beginDrag(e,'todo','move'); }} style={{cursor:'move', userSelect:'none', color:'#1e3a8a'}}>
				<span style={{display:'inline-flex', alignItems:'center', gap:'.5rem', fontWeight:600}}>
					<FontAwesomeIcon icon={faClipboardList} style={{color:'#2563eb'}} />
					<span style={{fontSize:'.75rem', letterSpacing:'1px', textTransform:'uppercase', color:'#1e3a8a'}}>ToDo</span>
					<span style={{fontSize:'.65rem', opacity:.7, letterSpacing:'1px'}}>({tasks.filter(t=>!t.done).length}/{tasks.length})</span>
				</span>
				<div style={{display:'flex',gap:'.35rem'}}>
					<TinyBtn
						type="button"
						onClick={() => setShowCompleted(prev => !prev)}
						title={showCompleted ? "Skrýt hotové úkoly" : "Zobrazit hotové úkoly"}
						style={{
							background: showCompleted ? '#dcfce7' : '#fef3c7',
							color: showCompleted ? '#166534' : '#92400e',
							borderColor: showCompleted ? '#22c55e' : '#f59e0b',
							fontWeight:700,
							fontSize:'.65rem'
						}}
					>
						<FontAwesomeIcon icon={showCompleted ? faEye : faEyeSlash} />
					</TinyBtn>
					<TinyBtn type="button" onClick={()=>handleAdjustFont(0.05)} disabled={effFont>=1.30} title="Zvětšit písmo" style={{background:'#dbeafe', color:'#1e3a8a', borderColor:'#93c5fd', fontWeight:700, fontSize:'.55rem'}}>A+</TinyBtn>
					<TinyBtn type="button" onClick={()=>handleAdjustFont(-0.05)} disabled={effFont<=0.55} title="Zmenšit písmo" style={{background:'#dbeafe', color:'#1e3a8a', borderColor:'#93c5fd', fontWeight:700, fontSize:'.55rem'}}>A-</TinyBtn>
					<TinyBtn type="button" onClick={handleClearDone} title="Odstranit hotové úkoly" style={{background:'#fef3c7', color:'#92400e', borderColor:'#f59e0b', fontWeight:700}}>
						<FontAwesomeIcon icon={faCheck} style={{marginRight:'.15rem', fontSize:'.65rem'}} />
						<FontAwesomeIcon icon={faTrash} style={{fontSize:'.65rem'}} />
					</TinyBtn>
					<TinyBtn type="button" onClick={handleClearAll} title="Smazat všechny úkoly" style={{background:'#fee2e2', color:'#b91c1c', borderColor:'#ef4444', fontWeight:700}}>
						<FontAwesomeIcon icon={faTrash} />
					</TinyBtn>
					{/* Window Controls */}
					<TinyBtn type="button" onClick={()=>minimizePanel('todo')} title="Minimalizovat" style={{background:'#fef3c7', color:'#92400e', borderColor:'#f59e0b'}}><FontAwesomeIcon icon={faMinus} /></TinyBtn>
					<TinyBtn type="button" onClick={()=>maximizePanel('todo')} title={state.maximized ? "Obnovit" : "Maximalizovat"} style={{background:'#dcfce7', color:'#166534', borderColor:'#22c55e'}}><FontAwesomeIcon icon={state.maximized ? faWindowRestore : faSquare} /></TinyBtn>
					<TinyBtn type="button" onClick={onClose} title="Zavřít" style={{background:'#dbeafe', color:'#1e3a8a', borderColor:'#93c5fd', fontSize:'.9rem', fontWeight:700, lineHeight:'1', padding:'0 .45rem'}}>×</TinyBtn>
				</div>
			</PanelHeader>
			<AddTaskForm onSubmit={addTask}>
				<TaskInput value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Nový úkol..." />
				<TinyBtn type="submit" title="Přidat úkol" style={{background:'#2563eb', color:'#ffffff', borderColor:'#1d4ed8'}}><FontAwesomeIcon icon={faPlus} /></TinyBtn>
			</AddTaskForm>
			<TodoListBox style={{ background:'#eff6ff', borderColor:'#93c5fd', fontSize:`${effFont}rem`, color:'#0b1730' }}>
				{visibleTasks.length===0 && <div style={{opacity:.55, fontSize:'.65rem'}}>
					{tasks.length === 0 ? 'Žádné úkoly' : 'Žádné ' + (showCompleted ? 'úkoly' : 'nedokončené úkoly')}
				</div>}
				{visibleTasks.map((t) => {
					// Najdi skutečný index v celkovém poli tasks (pro drag&drop)
					const realIndex = tasks.findIndex(task => task.id === t.id);
					return <TodoItemEditable key={t.id} task={t} index={realIndex} font={effFont} toggleTask={toggleTask} removeTask={removeTask} updateTaskAlarm={updateTaskAlarm} updateTaskPriority={updateTaskPriority} reorderTasks={reorderTasks} tasksLength={tasks.length} allTasks={tasks} />;
				})}
			</TodoListBox>
			<StatusBar>
				<StatusItem>
					<FontAwesomeIcon icon={faClock} />
					<span>Auto save: 15s</span>
				</StatusItem>
				<StatusItem>
					<span>Uloženo: {formatTime(autoSaveStatus?.todo?.lastSaved)}</span>
				</StatusItem>
				<div style={{display: 'flex', gap: '0.3rem'}}>
					<StatusButton
						onClick={handleExportToMarkdown}
						title="Exportovat do Markdown (.md)"
						style={{color: '#059669'}}
					>
						<FontAwesomeIcon icon={faFileExport} />
					</StatusButton>
					<StatusButton
						onClick={handleImportFromMarkdown}
						title="Importovat z Markdown (.md)"
						style={{color: '#7c3aed'}}
					>
						<FontAwesomeIcon icon={faFileImport} />
					</StatusButton>
					<StatusButton
						onClick={refreshFromServer}
						disabled={serverSyncStatus?.todo?.syncing}
						title="Aktualizovat z databáze"
					>
						<FontAwesomeIcon icon={faSync} spin={serverSyncStatus?.todo?.syncing} />
					</StatusButton>
					<StatusButton
						onClick={manualSaveTodo}
						title="Uložit do databáze"
					>
						<FontAwesomeIcon icon={faSave} />
					</StatusButton>
				</div>
			</StatusBar>

			{/* Confirm Dialog */}
			{confirmDialog && ReactDOM.createPortal(
				<ConfirmOverlay onClick={() => setConfirmDialog(null)}>
					<ConfirmDialog onClick={e => e.stopPropagation()}>
						<ConfirmHeader>
							<ConfirmIcon $danger={confirmDialog.type === 'clearAll'}>
								<FontAwesomeIcon icon={confirmDialog.type === 'import' ? faFileImport : faTrash} />
							</ConfirmIcon>
							<ConfirmTitle>
								{confirmDialog.type === 'clearDone' ? 'Smazat hotové úkoly' :
								 confirmDialog.type === 'clearAll' ? 'Smazat všechny úkoly' :
								 'Importovat úkoly z Markdown'}
							</ConfirmTitle>
						</ConfirmHeader>

						<ConfirmContent>
							{confirmDialog.type === 'clearDone' ? (
								<p>
									Opravdu chcete odstranit <strong>{confirmDialog.data.count} hotov{
										confirmDialog.data.count === 1 ? 'ý úkol' :
										confirmDialog.data.count < 5 ? 'é úkoly' : 'ých úkolů'
									}</strong>?
								</p>
							) : confirmDialog.type === 'clearAll' ? (
								<>
									<p style={{ marginBottom: '1rem' }}>
										<strong style={{ color: '#dc2626' }}>⚠️ POZOR!</strong>
									</p>
									<p>
										Opravdu chcete smazat <strong>VŠECHNY úkoly ({confirmDialog.data.count})</strong>?
									</p>
									<p style={{ marginTop: '1rem', fontWeight: 600, color: '#dc2626' }}>
										Tato akce je nevratná!
									</p>
								</>
							) : (
								<p>
									Chcete importovat <strong>{confirmDialog.data.count} úkol{
										confirmDialog.data.count === 1 ? '' :
										confirmDialog.data.count < 5 ? 'y' : 'ů'
									}</strong> z Markdown souboru?
									<br /><br />
									Stávající úkoly budou zachovány.
								</p>
							)}
						</ConfirmContent>

						<ConfirmActions>
							<ConfirmButton onClick={() => setConfirmDialog(null)}>
								Zrušit
							</ConfirmButton>
							<ConfirmButton $variant="primary" onClick={handleConfirmAction}>
								{confirmDialog.type === 'clearDone' ? 'Ano, smazat hotové' :
								 confirmDialog.type === 'clearAll' ? 'Ano, smazat vše' :
								 'Ano, importovat'}
							</ConfirmButton>
						</ConfirmActions>
					</ConfirmDialog>
				</ConfirmOverlay>,
				document.body
			)}
		</PanelBase>
	);
};

const TodoItemEditable = ({ task: t, index, font, toggleTask, removeTask, updateTaskAlarm, updateTaskPriority, reorderTasks, tasksLength }) => {
	const dt = t.createdAt ? new Date(t.createdAt) : null;
	const dateStr = dt ? dt.toLocaleDateString('cs-CZ', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
	const timeStr = dt ? dt.toLocaleTimeString('cs-CZ', { hour:'2-digit', minute:'2-digit' }) : '';
	const [editing, setEditing] = React.useState(false);
	const [draft, setDraft] = React.useState(t.text);
	const [dragging, setDragging] = React.useState(false);
	const [showAlarmModal, setShowAlarmModal] = React.useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

	// Zpracování alarmu - kompatibilita se starým formátem (číslo) i novým (objekt)
	const getAlarmPriority = () => {
		if (!t.alarm) return null;
		if (typeof t.alarm === 'object' && t.alarm.priority) return t.alarm.priority;
		return 'NORMAL'; // Starý formát bez priority -> výchozí NORMAL
	};

	const getAlarmTime = () => {
		if (!t.alarm) return null;
		if (typeof t.alarm === 'object' && t.alarm.time) return t.alarm.time;
		if (typeof t.alarm === 'number') return t.alarm; // Starý formát
		return null;
	};

	const alarmPriority = getAlarmPriority();
	const alarmTime = getAlarmTime();

	const commit = () => {
		const trimmed = draft.trim();
		if (editing && trimmed && trimmed !== t.text) {
			// mutace objektu (stačí k rerenderu díky změně lokálního stavu)
			t.text = trimmed;
		}
		setEditing(false);
	};

	// Drag and drop handlers
	const handleDragStart = (e) => {
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', index);
		setDragging(true);
	};

	const handleDragEnd = () => {
		setDragging(false);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
	};

	const handleDrop = (e) => {
		e.preventDefault();
		const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
		if (draggedIndex !== index) {
			reorderTasks(draggedIndex, index);
		}
	};

	return (
		<TodoItemRow
			done={t.done}
			dragging={dragging}
			alarmPriority={alarmPriority}
			priority={t.priority || 'normal'}
			draggable={!editing}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			<div style={{display:'flex', flex:1, gap:'.65rem', alignItems:'flex-start'}}>
				{/* Drag handle */}
				<div
					style={{
						cursor: editing ? 'default' : 'grab',
						color: '#94a3b8',
						display: 'flex',
						alignItems: 'center',
						opacity: 0.5,
						paddingTop: '.1rem'
					}}
					title="Přetáhněte pro změnu pořadí"
				>
					<FontAwesomeIcon icon={faGripVertical} style={{fontSize: '.85em'}} />
				</div>

				<div style={{display:'flex', flexDirection:'column', gap:'.35rem', alignItems:'center'}}>
					<input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)} style={{cursor:'pointer', width:'1.05em', height:'1.05em'}} />
					<button
						onClick={(e) => {
							e.stopPropagation();
							const priorities = ['low', 'normal', 'high'];
							const currentIndex = priorities.indexOf(t.priority || 'normal');
							const nextIndex = (currentIndex + 1) % 3;
							updateTaskPriority?.(t.id, priorities[nextIndex]);
						}}
						style={{
							cursor: 'pointer',
							background: 'none',
							border: 'none',
							padding: 0,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '1.2em',
							height: '1.2em',
							fontSize: '1em',
							color: t.priority === 'high' ? '#dc2626' : t.priority === 'low' ? '#eab308' : '#94a3b8',
fontWeight: 'bold',
							opacity: 0.9,
							transition: 'all 0.2s', lineHeight: 1
						}}
onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.15)'; }}
onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1)'; }}
						title={
							t.priority === 'high' ? 'Vysoká priorita - červená (klikněte pro změnu)' :
							t.priority === 'low' ? 'Nízká priorita - žlutá (klikněte pro změnu)' :
							'Normální priorita - šedá (klikněte pro změnu)'
						}
					>
						!!
					</button>
				</div>
				<div style={{flex:1, display:'flex', flexDirection:'column', gap:'.25rem'}}>
					{editing ? (
						<form onSubmit={e=>{e.preventDefault();commit();}} style={{display:'flex', gap:'.35rem', alignItems:'center'}}>
							<input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Escape'){ setDraft(t.text); setEditing(false);} }} style={{flex:1, fontSize:'0.7em', padding:'.25rem .4rem', border:'1px solid #60a5fa', borderRadius:4}} />
							<button type="submit" title="Uložit" style={{background:'#2563eb', color:'#fff', border:'none', padding:'.25rem .5rem', borderRadius:4, fontSize:'.6em', cursor:'pointer'}}>OK</button>
							<button type="button" title="Zrušit" onClick={()=>{ setDraft(t.text); setEditing(false); }} style={{background:'#e2e8f0', color:'#334155', border:'none', padding:'.25rem .5rem', borderRadius:4, fontSize:'.6em', cursor:'pointer'}}>✕</button>
						</form>
					) : (
						<span style={{textDecoration: t.done ? 'line-through' : 'none', fontWeight:500, color:'#0b1730'}}>{t.text}</span>
					)}
					{dt && <span style={{fontSize:'.58em', letterSpacing:'.5px', opacity:.65}}>vytvořeno {dateStr} {timeStr}</span>}
					{alarmTime && (
						<>
							<span style={{
								fontSize:'.58em',
								color: alarmPriority === 'HIGH' ? '#dc2626' : '#ea580c',
								display:'flex',
								alignItems:'center',
								gap:'.3rem',
								fontWeight: alarmPriority === 'HIGH' ? 600 : 500
							}}>
								<FontAwesomeIcon icon={faBell} />
								{new Date(alarmTime).toLocaleString('cs-CZ', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}
								{alarmPriority === 'HIGH' && <span style={{fontSize:'1em'}}>🚨</span>}
							</span>
							{t.alarm?.note && (
								<span style={{
									fontSize:'.58em',
									color: '#475569',
									fontStyle: 'italic',
									paddingLeft: '1.3rem',
									opacity: 0.9
								}}>
									📝 {t.alarm.note}
								</span>
							)}
						</>
					)}
				</div>
				<div style={{display:'flex', gap:'.25rem'}}>
					<button
						onClick={()=>setShowAlarmModal(true)}
						title={
							t.alarm
								? `${alarmPriority === 'HIGH' ? '🚨 HIGH' : '🔔 NORMAL'} Alarm: ${alarmTime ? new Date(alarmTime).toLocaleString('cs-CZ', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : ''}\nKlikněte pro úpravu`
								: 'Nastavit alarm'
						}
						style={{
							background: t.alarm ? (alarmPriority === 'HIGH' ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : 'linear-gradient(135deg, #fed7aa, #fdba74)') : 'transparent',
							border: t.alarm ? (alarmPriority === 'HIGH' ? '1.5px solid #dc2626' : '1.5px solid #ea580c') : 'none',
							cursor:'pointer',
							color: t.alarm ? (alarmPriority === 'HIGH' ? '#991b1b' : '#9a3412') : '#94a3b8',
							fontSize: t.alarm ? '1rem' : '.85rem',
							display:'flex',
							alignItems:'center',
							padding: t.alarm ? '.25rem .5rem' : '.15rem .3rem',
							borderRadius:'6px',
							fontWeight: t.alarm ? 700 : 400,
							boxShadow: t.alarm ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
							transition: 'all 0.2s',
							transform: t.alarm ? 'scale(1.05)' : 'scale(1)'
						}}
						onMouseDown={e=>e.stopPropagation()}
						onMouseEnter={e => {
							if (t.alarm) {
								e.currentTarget.style.transform = 'scale(1.1)';
								e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
							}
						}}
						onMouseLeave={e => {
							if (t.alarm) {
								e.currentTarget.style.transform = 'scale(1.05)';
								e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
							}
						}}
					>
						<FontAwesomeIcon icon={faBell} style={{filter: t.alarm ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none'}} />
						{t.alarm && alarmPriority === 'HIGH' && <span style={{fontSize: '.9em', marginLeft: '.2rem'}}>🚨</span>}
					</button>
					<button onClick={()=>setEditing(e=>!e)} title={editing? 'Zrušit úpravu' : 'Upravit'} style={{background:'transparent',border:'none',cursor:'pointer',color:'#1d4ed8', fontSize:'.85rem', display:'flex', alignItems:'center', padding:'.15rem .3rem', borderRadius:'6px'}} onMouseDown={e=>e.stopPropagation()}>
						<FontAwesomeIcon icon={faEdit} />
					</button>
					<button onClick={()=>setShowDeleteConfirm(true)} title="Smazat" style={{background:'transparent',border:'none',cursor:'pointer',color:'#dc2626', fontSize:'.85rem', display:'flex', alignItems:'center', padding:'.15rem .25rem', borderRadius:'6px'}} onMouseDown={e=>e.stopPropagation()}>
						<FontAwesomeIcon icon={faTrash} />
					</button>
				</div>
			</div>

			{/* Delete Confirm Modal */}
			{showDeleteConfirm && ReactDOM.createPortal(
				<ConfirmOverlay onClick={() => setShowDeleteConfirm(false)}>
					<ConfirmDialog onClick={e => e.stopPropagation()}>
						<ConfirmHeader>
							<ConfirmIcon $danger={true}>
								<FontAwesomeIcon icon={faTrash} />
							</ConfirmIcon>
							<ConfirmTitle>Smazat úkol</ConfirmTitle>
						</ConfirmHeader>

						<ConfirmContent>
							<p>
								Opravdu chcete smazat úkol <strong>"{t.text}"</strong>?
							</p>
							{t.alarm && (
								<p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#ea580c' }}>
									⚠️ Úkol má nastavený alarm, který bude také smazán.
								</p>
							)}
						</ConfirmContent>

						<ConfirmActions>
							<ConfirmButton onClick={() => setShowDeleteConfirm(false)}>
								Zrušit
							</ConfirmButton>
							<ConfirmButton $variant="primary" onClick={() => {
								removeTask(t.id);
								setShowDeleteConfirm(false);
							}}>
								Ano, smazat
							</ConfirmButton>
						</ConfirmActions>
					</ConfirmDialog>
				</ConfirmOverlay>,
				document.body
			)}

			{/* Alarm Modal */}
			{showAlarmModal && (
				<AlarmModal
					task={t}
					onClose={() => setShowAlarmModal(false)}
					onSave={(alarm) => {
						updateTaskAlarm(t.id, alarm);
						setShowAlarmModal(false);
					}}
				/>
			)}
		</TodoItemRow>
	);
};

// Alarm Modal Component
const AlarmModal = ({ task, onClose, onSave }) => {
	// Extrahuj existující alarm (pokud existuje)
	const existingAlarm = task.alarm && task.alarm !== null && typeof task.alarm === 'object' && task.alarm.time
		? task.alarm
		: (task.alarm && typeof task.alarm === 'number'
			? { time: task.alarm, priority: 'NORMAL' }
			: null);

	// Pokud je alarm null nebo neaktivní, ale historicky tam něco bylo,
	// můžeme použít lastAlarm z localStorage jako fallback
	const getLastAlarmSettings = () => {
		try {
			const stored = localStorage.getItem(`last_alarm_settings_${task.id}`);
			if (stored) {
				const parsed = JSON.parse(stored);
				return {
					dateStr: parsed.dateStr,
					timeStr: parsed.timeStr,
					priority: parsed.priority || 'NORMAL'
				};
			}
		} catch (e) {
		}
		return null;
	};

	// Předvyplň datum na aktuální + čas na nyní + 30 minut
	const getDefaultDateTime = () => {
		const now = new Date();
		now.setMinutes(now.getMinutes() + 30);
		const dateStr = now.toISOString().split('T')[0];
		const timeStr = now.toTimeString().slice(0, 5);
		return { dateStr, timeStr };
	};

	// Pořadí priorit: existingAlarm > lastAlarmSettings > defaultDateTime
	let defaults;
	if (existingAlarm && existingAlarm.time) {
		// Máme aktivní alarm
		defaults = {
			dateStr: new Date(existingAlarm.time).toISOString().split('T')[0],
			timeStr: new Date(existingAlarm.time).toTimeString().slice(0, 5),
			priority: existingAlarm.priority || 'NORMAL'
		};
	} else {
		// Alarm je null nebo neexistuje, zkusíme načíst poslední nastavení
		const lastSettings = getLastAlarmSettings();
		if (lastSettings) {
			defaults = lastSettings;
		} else {
			defaults = { ...getDefaultDateTime(), priority: 'NORMAL' };
		}
	}

	const [date, setDate] = React.useState(defaults.dateStr);
	const [time, setTime] = React.useState(defaults.timeStr);
	const [priority, setPriority] = React.useState(defaults.priority);
	const [note, setNote] = React.useState(existingAlarm?.note || '');
	const [showPreview, setShowPreview] = React.useState(false);
	const [alarmActive, setAlarmActive] = React.useState(!!existingAlarm);

	// Uložit nastavení do localStorage při změně (pro budoucí použití)
	React.useEffect(() => {
		if (date && time) {
			try {
				localStorage.setItem(`last_alarm_settings_${task.id}`, JSON.stringify({
					dateStr: date,
					timeStr: time,
					priority: priority
				}));
			} catch (e) {
			}
		}
	}, [date, time, priority, task.id]);

	const adjustTime = (minutes) => {
		const [hours, mins] = time.split(':').map(Number);
		const dt = new Date();
		dt.setHours(hours, mins + minutes);
		setTime(dt.toTimeString().slice(0, 5));
	};

	const handleSave = () => {
		// Pokud jsou vyplněné datum a čas a není v minulosti, uložíme alarm
		if (date && time && !isInPast) {
			const alarmDateTime = new Date(`${date}T${time}`);

			onSave({
				time: alarmDateTime.getTime(),
				priority: priority,
				note: note.trim(),
				fired: false,
				acknowledged: false
			});
			onClose();
		}
	};

	const handleDeactivate = () => {
		setAlarmActive(false);
		onSave(null);
		onClose();
	};

	// Kontrola, zda je vybraný čas v minulosti
	const isInPast = React.useMemo(() => {
		if (!date || !time) return false;
		const alarmDateTime = new Date(`${date}T${time}`);
		return alarmDateTime.getTime() < Date.now();
	}, [date, time]);

	// Zavření dialogu při stisku Escape
	React.useEffect(() => {
		const handleEscape = (e) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};
		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [onClose]);

	// Prevent flickering with React.memo or portal
	return ReactDOM.createPortal(
		<div style={{
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			background: 'rgba(0,0,0,0.5)',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			zIndex: 10000,
			backdropFilter: 'blur(2px)'
		}}>
			<div style={{
				background: 'white',
				borderRadius: '12px',
				padding: '1.5rem',
				minWidth: '500px',
				maxWidth: '650px',
				maxHeight: '90vh',
				overflowY: 'auto',
				boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
				border: '1px solid #e2e8f0'
			}} onClick={e => e.stopPropagation()}>
				<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
					<h3 style={{margin: 0, color: '#0f172a', fontSize: '1.1rem', fontWeight: 600}}>
						<FontAwesomeIcon icon={faBell} style={{color: '#ea580c', marginRight: '.5rem'}} />
						Nastavit alarm
					</h3>
					<button
						onClick={onClose}
						style={{
							background: '#f1f5f9',
							border: '1px solid #cbd5e1',
							borderRadius: '6px',
							width: '32px',
							height: '32px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							fontSize: '1.2rem',
							color: '#64748b',
							transition: 'all 0.2s',
							fontWeight: 'bold'
						}}
						onMouseOver={(e) => {
							e.currentTarget.style.background = '#fee2e2';
							e.currentTarget.style.borderColor = '#ef4444';
							e.currentTarget.style.color = '#ef4444';
						}}
						onMouseOut={(e) => {
							e.currentTarget.style.background = '#f1f5f9';
							e.currentTarget.style.borderColor = '#cbd5e1';
							e.currentTarget.style.color = '#64748b';
						}}
						title="Zavřít (Esc)"
					>
						×
					</button>
				</div>
				<div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
					{isInPast && (
						<div style={{
							background: '#fee2e2',
							border: '1px solid #ef4444',
							borderRadius: '6px',
							padding: '0.5rem 0.75rem',
							fontSize: '0.75rem',
							color: '#991b1b',
							fontWeight: 600,
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem'
						}}>
							⚠️ Vybraný čas je v minulosti!
						</div>
					)}
					<div>
						<label style={{display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 500}}>Datum</label>
						<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'center'}}>
							<DatePicker
								value={date}
								onChange={(newDate) => setDate(newDate)}
								placeholder="Vyberte datum"
								hasError={isInPast}
							/>
							<div style={{display: 'flex', gap: '0.25rem', justifyContent: 'flex-end'}}>
								<button
									type="button"
									onClick={() => {
										const currentDate = date ? new Date(date) : new Date();
										currentDate.setDate(currentDate.getDate() + 1);
										setDate(currentDate.toISOString().split('T')[0]);
									}}
									style={{
										background: '#3b82f6',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										padding: '0.65rem 0.75rem',
										fontSize: '0.7rem',
										fontWeight: 'bold',
										cursor: 'pointer',
										transition: 'all 0.2s',
										minWidth: '32px'
									}}
									onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
									onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
									title="Přidat 1 den"
								>
									+1D
								</button>
								<button
									type="button"
									onClick={() => {
										const currentDate = date ? new Date(date) : new Date();
										currentDate.setDate(currentDate.getDate() + 7);
										setDate(currentDate.toISOString().split('T')[0]);
									}}
									style={{
										background: '#3b82f6',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										padding: '0.65rem 0.75rem',
										fontSize: '0.7rem',
										fontWeight: 'bold',
										cursor: 'pointer',
										transition: 'all 0.2s',
										minWidth: '32px'
									}}
									onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
									onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
									title="Přidat 1 týden (7 dní)"
								>
									+1T
								</button>
								<button
									type="button"
									onClick={() => {
										const currentDate = date ? new Date(date) : new Date();
										currentDate.setDate(currentDate.getDate() + 14);
										setDate(currentDate.toISOString().split('T')[0]);
									}}
									style={{
										background: '#3b82f6',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										padding: '0.65rem 0.75rem',
										fontSize: '0.7rem',
										fontWeight: 'bold',
										cursor: 'pointer',
										transition: 'all 0.2s',
										minWidth: '36px'
									}}
									onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
									onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
									title="Přidat 14 dní"
								>
									+14D
								</button>
							</div>
						</div>
					</div>
					<div>
						<label style={{display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 500}}>Čas</label>
						<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'center'}}>
							<TimePicker
								value={time}
								onChange={(newTime) => setTime(newTime)}
								placeholder="Vyberte čas"
								hasError={isInPast}
							/>
							<div style={{display: 'flex', gap: '0.25rem', justifyContent: 'flex-end'}}>
								<button
									type="button"
									onClick={() => {
										if (!time) return;
										const [hours, mins] = time.split(':').map(Number);
										const dt = new Date();
										dt.setHours(hours, mins - 15);
										setTime(dt.toTimeString().slice(0, 5));
									}}
									disabled={!time}
									style={{
										background: time ? '#3b82f6' : '#cbd5e1',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										padding: '0.65rem 0.75rem',
										fontSize: '0.7rem',
										fontWeight: 'bold',
										cursor: time ? 'pointer' : 'not-allowed',
										transition: 'all 0.2s',
										minWidth: '32px',
										opacity: time ? 1 : 0.6
									}}
									onMouseOver={(e) => time && (e.currentTarget.style.background = '#2563eb')}
									onMouseOut={(e) => time && (e.currentTarget.style.background = '#3b82f6')}
									title="Odečíst 15 minut"
								>
									-15m
								</button>
								<button
									type="button"
									onClick={() => {
										if (!time) return;
										const [hours, mins] = time.split(':').map(Number);
										const dt = new Date();
										dt.setHours(hours, mins + 15);
										setTime(dt.toTimeString().slice(0, 5));
									}}
									disabled={!time}
									style={{
										background: time ? '#3b82f6' : '#cbd5e1',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										padding: '0.65rem 0.75rem',
										fontSize: '0.7rem',
										fontWeight: 'bold',
										cursor: time ? 'pointer' : 'not-allowed',
										transition: 'all 0.2s',
										minWidth: '44px',
										opacity: time ? 1 : 0.6
									}}
									onMouseOver={(e) => time && (e.currentTarget.style.background = '#2563eb')}
									onMouseOut={(e) => time && (e.currentTarget.style.background = '#3b82f6')}
									title="Přidat 15 minut"
								>
									+15m
								</button>
							</div>
						</div>
					</div>
					<div>
						<label style={{display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 500}}>
							Poznámka k alarmu (volitelné)
						</label>
						<textarea
							value={note}
							onChange={e => setNote(e.target.value)}
							placeholder="Doplňující informace k alarmu..."
							maxLength={200}
							style={{
								width: '100%',
								padding: '0.5rem',
								border: '1px solid #cbd5e1',
								borderRadius: '6px',
								fontSize: '0.875rem',
								fontFamily: 'inherit',
								resize: 'vertical',
								minHeight: '60px',
								maxHeight: '120px'
							}}
						/>
						<div style={{fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem', textAlign: 'right'}}>
							{note.length}/200 znaků
						</div>
					</div>
					<div>
						<label style={{display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 500}}>Priorita</label>
						<div style={{display: 'flex', gap: '0.5rem'}}>
							<button
								type="button"
								onClick={() => setPriority('NORMAL')}
								style={{
									flex: 1,
									padding: '0.65rem 1rem',
									border: priority === 'NORMAL' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
									background: priority === 'NORMAL' ? '#fef3c7' : '#ffffff',
									color: priority === 'NORMAL' ? '#92400e' : '#94a3b8',
									borderRadius: '8px',
									fontSize: '0.875rem',
									cursor: 'pointer',
									fontWeight: priority === 'NORMAL' ? 600 : 500,
									transition: 'all 0.2s',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: '0.5rem'
								}}
							>
								<span style={{fontSize: '1.1rem'}}>🔔</span>
								<span>NORMAL</span>
							</button>
							<button
								type="button"
								onClick={() => setPriority('HIGH')}
								style={{
									flex: 1,
									padding: '0.65rem 1rem',
									border: priority === 'HIGH' ? '2px solid #dc2626' : '1px solid #cbd5e1',
									background: priority === 'HIGH' ? '#fee2e2' : '#ffffff',
									color: priority === 'HIGH' ? '#991b1b' : '#94a3b8',
									borderRadius: '8px',
									fontSize: '0.875rem',
									cursor: 'pointer',
									fontWeight: priority === 'HIGH' ? 600 : 500,
									transition: 'all 0.2s',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: '0.5rem'
								}}
							>
								<span style={{fontSize: '1.1rem'}}>🚨</span>
								<span>HIGH</span>
							</button>
						</div>
						<div style={{marginTop: '0.5rem', fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.4}}>
							{priority === 'NORMAL' && '• Upozornění se zobrazí v notifikacích'}
							{priority === 'HIGH' && '• Zobrazí se vyskakovací okno'}
						</div>
						<button
							type="button"
							onClick={() => setShowPreview(!showPreview)}
							style={{
								marginTop: '0.5rem',
								padding: '0.4rem 0.75rem',
								background: showPreview ? '#dbeafe' : '#f1f5f9',
								border: '1px solid #cbd5e1',
								borderRadius: '6px',
								fontSize: '0.7rem',
								cursor: 'pointer',
								color: '#475569',
								width: '100%',
								fontWeight: 500,
								transition: 'all 0.2s'
							}}
						>
							{showPreview ? '🙈 Skrýt náhled' : (priority === 'HIGH' ? '👁️ Zobrazit náhled popup okénka' : '👁️ Zobrazit náhled notifikace')}
						</button>
					</div>

					{/* Preview Floating Popup pro HIGH */}
					{showPreview && priority === 'HIGH' && (
						<div style={{
							border: '2px dashed #cbd5e1',
							borderRadius: '8px',
							padding: '0.75rem',
							background: '#f8fafc',
							fontSize: '0.75rem'
						}}>
							<div style={{
								fontSize: '0.65rem',
								color: '#94a3b8',
								marginBottom: '0.5rem',
								fontWeight: 600,
								textTransform: 'uppercase',
								letterSpacing: '0.5px'
							}}>
								⚡ Náhled HIGH Priority Alarmu
							</div>
							<div style={{
								background: 'linear-gradient(145deg, #ffffff, #fef2f2)',
								borderRadius: '8px',
								padding: '0.75rem',
								boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
								border: '1px solid #dc2626',
								transform: 'scale(0.85)',
								transformOrigin: 'top left'
							}}>
								<div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #fecaca'}}>
									<div style={{
										width: '28px',
										height: '28px',
										background: 'linear-gradient(135deg, #dc2626, #ef4444)',
										borderRadius: '6px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: '0.9rem'
									}}>
										🚨
									</div>
									<div style={{flex: 1}}>
										<div style={{fontWeight: 700, fontSize: '0.75rem', color: '#0f172a'}}>HIGH Alarm TODO</div>
										<div style={{fontSize: '0.6rem', color: '#94a3b8'}}>
											{date && time && new Date(`${date}T${time}`).toLocaleString('cs-CZ', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}
										</div>
									</div>
								</div>
								<div style={{background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '4px', padding: '0.5rem', marginBottom: '0.5rem'}}>
									<div style={{fontSize: '0.7rem', fontWeight: 600, color: '#0f172a'}}>{task.text}</div>
									{note && (
										<div style={{
											marginTop: '0.5rem',
											paddingTop: '0.5rem',
											borderTop: '1px solid #fbbf24',
											fontSize: '0.65rem',
											color: '#475569',
											fontStyle: 'italic'
										}}>
											<span style={{fontWeight: 600, color: '#92400e'}}>📝 Poznámka:</span> {note}
										</div>
									)}
								</div>
								<div style={{display: 'flex', gap: '0.4rem', justifyContent: 'flex-end'}}>
									<div style={{background: '#e2e8f0', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 600, color: '#334155'}}>Zavřít</div>
									<div style={{background: 'linear-gradient(135deg, #22c55e, #16a34a)', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 600, color: 'white'}}>✓ Hotové</div>
								</div>
							</div>
							<div style={{fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.5rem', fontStyle: 'italic'}}>
								💡 Okénko lze přesouvat myší po obrazovce
							</div>
						</div>
					)}

					{/* Preview Notification pro NORMAL */}
					{showPreview && priority === 'NORMAL' && (
						<div style={{
							border: '2px dashed #cbd5e1',
							borderRadius: '8px',
							padding: '0.75rem',
							background: '#f8fafc',
							fontSize: '0.75rem'
						}}>
							<div style={{
								fontSize: '0.65rem',
								color: '#94a3b8',
								marginBottom: '0.5rem',
								fontWeight: 600,
								textTransform: 'uppercase',
								letterSpacing: '0.5px'
							}}>
								🔔 Náhled NORMAL Priority Alarmu
							</div>
							<div style={{
								background: '#ffffff',
								borderRadius: '6px',
								padding: '0.65rem',
								boxShadow: '0 2px 8px rgba(234, 88, 12, 0.2)',
								border: '1px solid #fed7aa',
								transform: 'scale(0.9)',
								transformOrigin: 'top left'
							}}>
								<div style={{display: 'flex', alignItems: 'flex-start', gap: '0.5rem'}}>
									<div style={{
										width: '24px',
										height: '24px',
										background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
										borderRadius: '50%',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: '0.7rem',
										flexShrink: 0
									}}>
										🔔
									</div>
									<div style={{flex: 1, minWidth: 0}}>
										<div style={{
											fontSize: '0.65rem',
											fontWeight: 700,
											color: '#0f172a',
											marginBottom: '0.25rem'
										}}>
											TODO Alarm
										</div>
										<div style={{
											fontSize: '0.6rem',
											color: '#475569',
											marginBottom: '0.3rem',
											wordBreak: 'break-word'
										}}>
											{task.text}
										</div>
										{note && (
											<div style={{
												fontSize: '0.6rem',
												color: '#475569',
												fontStyle: 'italic',
												marginBottom: '0.3rem',
												paddingLeft: '0.5rem',
												borderLeft: '2px solid #cbd5e1'
											}}>
												📝 {note}
											</div>
										)}
										<div style={{
											fontSize: '0.55rem',
											color: '#94a3b8',
											fontStyle: 'italic'
										}}>
											{date && time && new Date(`${date}T${time}`).toLocaleString('cs-CZ', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}
										</div>
									</div>
								</div>
							</div>
							<div style={{fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.5rem', fontStyle: 'italic'}}>
								💡 Notifikace se zobrazí v seznamu upozornění (zvoneček vpravo nahoře)
							</div>
						</div>
					)}
				</div>
				<div style={{display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'space-between', flexWrap: 'wrap'}}>
					<div style={{display: 'flex', gap: '0.5rem'}}>
						{task.alarm && alarmActive && (
							<button
								onClick={handleDeactivate}
								style={{
									background: '#fef3c7',
									color: '#92400e',
									border: '1px solid #fbbf24',
									padding: '0.5rem 1rem',
									borderRadius: '6px',
									fontSize: '0.875rem',
									cursor: 'pointer',
									fontWeight: 600,
									display: 'flex',
									alignItems: 'center',
									gap: '0.4rem',
									transition: 'all 0.2s'
								}}
								onMouseEnter={e => e.target.style.background = '#fde68a'}
								onMouseLeave={e => e.target.style.background = '#fef3c7'}
								title="Deaktivovat alarm (zůstane nastavení, jen se neodpálí)"
							>
								<span>⏸️</span>
								Deaktivovat
							</button>
						)}
					</div>
					<div style={{display: 'flex', gap: '0.5rem'}}>
						<button
							onClick={onClose}
							style={{
								background: '#e2e8f0',
								color: '#334155',
								border: 'none',
								padding: '0.5rem 1rem',
								borderRadius: '6px',
								fontSize: '0.875rem',
								cursor: 'pointer',
								fontWeight: 500
							}}
						>
							Zavřít
						</button>
						<button
							onClick={handleSave}
							disabled={!date || !time || isInPast}
							style={{
								background: (date && time && !isInPast) ? '#2563eb' : '#cbd5e1',
								color: 'white',
								border: 'none',
								padding: '0.5rem 1rem',
								borderRadius: '6px',
								fontSize: '0.875rem',
								cursor: (date && time && !isInPast) ? 'pointer' : 'not-allowed',
								fontWeight: 600,
								opacity: (date && time && !isInPast) ? 1 : 0.6
							}}
						>
							Uložit alarm
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
};
