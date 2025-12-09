import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const PanelBase = styled.div`
	position:fixed; width:340px; height:400px; max-width:94vw; max-height:75vh;
	background: rgba(0,0,0,0.85); /* fallback */
	background: linear-gradient(180deg, rgba(15,23,42,0.92), rgba(9,12,20,0.92));
	backdrop-filter: blur(2px);
	border: 1px solid var(--app-dark-border, #374151);
	border-radius: 10px; padding:0.6rem 0.6rem 0.75rem; display:flex; flex-direction:column; gap:0.5rem;
	color: var(--panel-foreground, #f8fafc); font-size:12px; box-shadow:0 8px 24px rgba(0,0,0,0.55); z-index:100001; user-select:none;
`;
export const PanelHeader = styled.div`display:flex; align-items:center; justify-content:space-between; gap:.5rem; font-size:.7rem; font-weight:600; letter-spacing:.75px; text-transform:uppercase;`;
export const TinyBtn = styled.button`
	background: var(--panel-btn-bg, #1f2937);
	border: 1px solid var(--panel-btn-border, #334155);
	color: var(--panel-btn-color, #e2e8f0);
	padding:0.25rem 0.55rem; border-radius:4px; cursor:pointer; font-size:.55rem; letter-spacing:.5px; display:inline-flex; align-items:center; gap:.35rem;
	&:hover{ background: var(--panel-btn-bg-hover, #334155); }
`;

export const edgeHandles = (beginDrag, key) => (
	<>
		<div onMouseDown={(e)=>beginDrag(e,key,'top')} style={{position:'absolute', top:0, left:10, right:10, height:6, cursor:'ns-resize'}} />
		<div onMouseDown={(e)=>beginDrag(e,key,'right')} style={{position:'absolute', top:10, right:0, bottom:10, width:6, cursor:'ew-resize'}} />
		<div onMouseDown={(e)=>beginDrag(e,key,'bottom')} style={{position:'absolute', left:10, right:10, bottom:0, height:6, cursor:'ns-resize'}} />
		<div onMouseDown={(e)=>beginDrag(e,key,'left')} style={{position:'absolute', top:10, left:0, bottom:10, width:6, cursor:'ew-resize'}} />
		<div onMouseDown={(e)=>beginDrag(e,key,'top-left')} style={{position:'absolute', top:0, left:0, width:12, height:12, cursor:'nwse-resize'}} />
		<div onMouseDown={(e)=>beginDrag(e,key,'top-right')} style={{position:'absolute', top:0, right:0, width:12, height:12, cursor:'nesw-resize'}} />
		<div onMouseDown={(e)=>beginDrag(e,key,'bottom-right')} style={{position:'absolute', bottom:0, right:0, width:12, height:12, cursor:'nwse-resize'}} />
		<div onMouseDown={(e)=>beginDrag(e,key,'bottom-left')} style={{position:'absolute', bottom:0, left:0, width:12, height:12, cursor:'nesw-resize'}} />
	</>
);
