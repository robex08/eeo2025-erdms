import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const PanelBase = styled.div`
	position:fixed; width:340px; height:400px; max-width:94vw; max-height:75vh;
	background: white;
	backdrop-filter: blur(8px);
	border: 2px solid #e5e7eb;
	border-radius: 12px; padding:0.8rem; display:flex; flex-direction:column; gap:0.5rem;
	color: #1f2937; font-size:12px; box-shadow:0 12px 40px rgba(0,0,0,0.15); z-index:100001; user-select:none;
`;
export const PanelHeader = styled.div`display:flex; align-items:center; justify-content:space-between; gap:.5rem; font-size:.7rem; font-weight:600; letter-spacing:.75px; text-transform:uppercase;`;
export const TinyBtn = styled.button`
	background: white;
	border: 2px solid #e5e7eb;
	color: #6b7280;
	padding:0.35rem 0.7rem; border-radius:6px; cursor:pointer; font-size:.65rem; font-weight:600; letter-spacing:.3px; display:inline-flex; align-items:center; gap:.4rem; transition: all 0.2s ease;
	&:hover{ background: #f0fdf4; border-color: #10b981; color: #10b981; }
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
