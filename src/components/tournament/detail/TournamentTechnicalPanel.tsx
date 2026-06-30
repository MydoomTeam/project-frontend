import React from 'react';

interface TechnicalRow {
  label: string;
  value: React.ReactNode;
}

interface Props {
  rows: TechnicalRow[];
}

export const TournamentTechnicalPanel: React.FC<Props> = ({ rows }) => (
  <>
    <div className="dashboard-panel-head dashboard-panel-head-tight">
      <div>
        <h2>Ficha del torneo</h2>
      </div>
    </div>
    <div className="td-info-grid">
      {rows.map((row) => (
        <div className="td-info-item" key={row.label}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  </>
);
