import React from 'react';
import AppIcon from '../../../ui/AppIcon';

export default function WdBadge({ label = 'WD' }) {
  return (
    <span className="wd-source-badge" title="Hodnota se synchronizuje z Webdispečinku a zde není editovatelná.">
      <AppIcon name="sync" size={12} weight="bold" />
      {label}
    </span>
  );
}
