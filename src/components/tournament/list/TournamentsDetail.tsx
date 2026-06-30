import React from 'react';

interface DetailRow {
  label: string;
  value: React.ReactNode;
}

interface Props {
  rows: DetailRow[];
}

export const TournamentsDetail: React.FC<Props> = ({ rows }) => (
  <div className="tn-detail-grid">
    {rows.map((row) => (
      <div key={`${row.label}`} className="tn-detail-item">
        <span>{row.label}</span>
        <strong>{row.value}</strong>
      </div>
    ))}
  </div>
);
