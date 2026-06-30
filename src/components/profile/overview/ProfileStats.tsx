import React from 'react';
import { FiShield, FiTarget, FiTrendingUp, FiUserCheck } from 'react-icons/fi';

interface Props {
  createdCount: number;
  participantCount: number;
  eloCurrentValue: number;
  eloEntriesCount: number;
}

export const ProfileStats: React.FC<Props> = ({
  createdCount,
  participantCount,
  eloCurrentValue,
  eloEntriesCount,
}) => (
  <section className="pr-kpi-grid">
    <article className="pr-kpi-card">
      <div className="pr-kpi-icon"><FiTarget aria-hidden="true" /></div>
      <p className="pr-kpi-label">Torneos creados</p>
      <p className="pr-kpi-value">{createdCount}</p>
      <p className="pr-kpi-subtext">Como administrador</p>
    </article>

    <article className="pr-kpi-card">
      <div className="pr-kpi-icon"><FiUserCheck aria-hidden="true" /></div>
      <p className="pr-kpi-label">Participaciones</p>
      <p className="pr-kpi-value">{participantCount}</p>
      <p className="pr-kpi-subtext">Como jugador</p>
    </article>

    <article className="pr-kpi-card">
      <div className="pr-kpi-icon"><FiTrendingUp aria-hidden="true" /></div>
      <p className="pr-kpi-label">ELO actual</p>
      <p className={`pr-kpi-value ${eloCurrentValue < 0 ? 'is-negative' : ''}`}>{eloCurrentValue}</p>
      <p className="pr-kpi-subtext">Rendimiento global</p>
    </article>

    <article className="pr-kpi-card">
      <div className="pr-kpi-icon"><FiShield aria-hidden="true" /></div>
      <p className="pr-kpi-label">Cambios ELO</p>
      <p className="pr-kpi-value">{eloEntriesCount}</p>
      <p className="pr-kpi-subtext">Historial acumulado</p>
    </article>
  </section>
);
