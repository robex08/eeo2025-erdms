
import React from 'react';
import '../../styles/components/MobileTabs.css';

export default function MobileTabs({ activeTab, setActiveTab }) {
		return (
					<div className="mobile-tabs">
						   <button
							   onClick={() => setActiveTab('cards')}
							   className={`mobile-tabs-btn${activeTab === 'cards' ? ' selected' : ''}`}
							   aria-selected={activeTab === 'cards'}
						   >
							Karty vozidel
						</button>
						   <button
							   onClick={() => setActiveTab('stats')}
							   className={`mobile-tabs-btn${activeTab === 'stats' ? ' selected' : ''}`}
							   aria-selected={activeTab === 'stats'}
						   >
							Statistiky
						</button>
			</div>
		);
}
