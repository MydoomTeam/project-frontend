import React from 'react';
import { FiTrendingUp } from 'react-icons/fi';
import { EloHistoryItem } from '../../../types/models';

interface Props {
  sortedEntries: EloHistoryItem[];
  entriesCount: number;
  minValue: number | null;
  maxValue: number | null;
  latestDelta: number;
  currentElo: number;
  formatDate: (value?: string) => string;
}

const getEloDeltaColor = (delta: number): string => (delta >= 0 ? 'var(--success)' : 'var(--danger)');

export const ProfileEloHistory: React.FC<Props> = ({
  sortedEntries,
  entriesCount,
  minValue,
  maxValue,
  latestDelta,
  currentElo,
  formatDate,
}) => {
  const points = sortedEntries.length === 0 ? '' : sortedEntries
    .map((entry, index) => {
      const width = 640;
      const height = 220;
      const xStep = sortedEntries.length === 1 ? 0 : width / (sortedEntries.length - 1);
      const values = sortedEntries.map((item) => item.current_elo);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const spread = Math.max(max - min, 1);
      const x = sortedEntries.length === 1 ? width / 2 : xStep * index;
      const normalized = (entry.current_elo - min) / spread;
      const y = height - normalized * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="dashboard-panel pr-panel">
      <div className="dashboard-panel-head dashboard-panel-head-tight">
        <div>
          <h2>Historial ELO</h2>
          <p>{entriesCount === 0 ? 'Evolución de ranking a lo largo de tus partidas.' : `${entriesCount} cambios registrados`}</p>
        </div>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="pr-empty-state">
          <FiTrendingUp aria-hidden="true" className="pr-empty-icon" />
          <p className="pr-empty-title">Sin cambios de ELO todavía.</p>
          <p className="pr-empty-text">Participa en torneos para empezar a construir tu historial competitivo.</p>
        </div>
      ) : (
        <>
          <div className="pr-elo-summary-row">
            <span>Min: <strong>{minValue}</strong></span>
            <span>Max: <strong>{maxValue}</strong></span>
            <span>
              Último cambio:
              <strong style={{ color: getEloDeltaColor(latestDelta) }}>
                {latestDelta >= 0 ? ' +' : ' '}{latestDelta}
              </strong>
            </span>
          </div>

          <div className="pr-elo-chart-wrap">
            <svg viewBox="0 0 640 220" className="pr-elo-chart" role="img" aria-label="Gráfica de evolución de ELO">
              <defs>
                <linearGradient id="prEloStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4cc9f0" />
                  <stop offset="100%" stopColor="#1fd8e5" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="640" height="220" rx="10" fill="rgba(5, 17, 34, 0.72)" />
              <path d="M0 190 H640" stroke="rgba(130, 160, 192, 0.24)" />
              <path d="M0 120 H640" stroke="rgba(130, 160, 192, 0.15)" />
              <path d="M0 50 H640" stroke="rgba(130, 160, 192, 0.24)" />
              <polyline
                fill="none"
                stroke="url(#prEloStroke)"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
            </svg>
          </div>

          <div className="dashboard-table-wrap pr-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Match</th>
                  <th>ELO anterior</th>
                  <th>ELO nuevo</th>
                  <th>Cambio</th>
                </tr>
              </thead>
              <tbody>
                {[...sortedEntries].reverse().slice(0, 8).map((entry) => {
                  const delta = entry.current_elo - entry.previous_elo;
                  return (
                    <tr key={entry.id}>
                      <td data-label="Fecha">{formatDate(entry.change_date)}</td>
                      <td data-label="Match">#{entry.match_id}</td>
                      <td data-label="ELO anterior">{entry.previous_elo}</td>
                      <td data-label="ELO nuevo">{entry.current_elo}</td>
                      <td data-label="Cambio" style={{ color: getEloDeltaColor(delta) }}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
