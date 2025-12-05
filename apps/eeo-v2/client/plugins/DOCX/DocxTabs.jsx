
import React, { useState } from "react";
import DocxEditor from "./DocxEditor";
import DocxEditorDynamic from "./DocxEditorDynamic";
import VersionBadge from "./VersionBadge";

export default function DocxTabs() {
	const [tab, setTab] = useState("vzor");
	const minContentHeight = 900;
	const tabBarHeight = 64;
	return (
		<>
			{/* Fixní tab bar přes celou šířku */}
			<div style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100%",
				height: tabBarHeight,
				background: "#181a20",
				zIndex: 100,
				display: "flex",
				justifyContent: "center",
				alignItems: "flex-end",
				borderBottom: "2px solid #333"
			}}>
				<div style={{ display: "flex", width: "100%", maxWidth: 1200, alignItems: 'center' }}>
					<button
						onClick={() => setTab("vzor")}
						style={{
							padding: "12px 32px",
							border: "none",
							borderBottom: tab === "vzor" ? "4px solid #b2ff59" : "4px solid transparent",
							background: "none",
							color: tab === "vzor" ? "#b2ff59" : "#fff",
							fontWeight: 600,
							fontSize: 18,
							cursor: "pointer",
							outline: "none",
							transition: "color 0.2s, border-bottom 0.2s"
						}}
					>
						DOKUMENT VZOR
					</button>
					<button
						onClick={() => setTab("dynamicky")}
						style={{
							padding: "12px 32px",
							border: "none",
							borderBottom: tab === "dynamicky" ? "4px solid #b2ff59" : "4px solid transparent",
							background: "none",
							color: tab === "dynamicky" ? "#b2ff59" : "#fff",
							fontWeight: 600,
							fontSize: 18,
							cursor: "pointer",
							outline: "none",
							transition: "color 0.2s, border-bottom 0.2s"
						}}
					>
						DOKUMENT DYNAMICKÝ
					</button>
					<div style={{ flex: 1 }} />
					{/* Verze pluginu vpravo v tab baru */}
					<VersionBadge />
				</div>
			</div>
			{/* Obsah pod taby s paddingem shora */}
			<div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", paddingTop: tabBarHeight + 24, minHeight: minContentHeight, transition: "min-height 0.2s" }}>
				   {tab === "vzor" && (
					   <DocxEditor />
				   )}
				   {tab === "dynamicky" && (
					   <DocxEditorDynamic />
				   )}
			</div>
		</>
	);
}
