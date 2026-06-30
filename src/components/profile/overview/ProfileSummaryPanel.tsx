import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { Player, PlayerTournamentHistoryItem } from '../../../types/models';
import { getTournamentStatusBadgeClass, toBusinessTournamentStatus } from '../../../utils/tournamentStatus';

interface Props {
  player: Player | null;
  isOwnProfile: boolean;
  activeCount: number;
  recentHistory: PlayerTournamentHistoryItem[];
  formatDate: (value?: string) => string;
}

const renderPolicyItems = () => (
  <ul className="pr-policy-list">
    <li><span className="pr-policy-dot" /> Mínimo 8 caracteres</li>
    <li><span className="pr-policy-dot" /> Al menos una mayúscula</li>
    <li><span className="pr-policy-dot" /> Al menos una minúscula</li>
    <li><span className="pr-policy-dot" /> Al menos un número</li>
  </ul>
);

const renderProfileDetails = (player: Player | null, formatDate: (value?: string) => string) => (
  <ul className="pr-policy-list">
    <li><span className="pr-policy-dot" /> Usuario: {player?.username ?? '—'}</li>
    <li><span className="pr-policy-dot" /> Rol: {player?.role?.toUpperCase().includes('ADMIN') ? 'Administrador' : 'Jugador'}</li>
    <li><span className="pr-policy-dot" /> ELO: {player?.global_elo ?? 0}</li>
    <li><span className="pr-policy-dot" /> Último acceso: {formatDate(player?.last_access_date)}</li>
  </ul>
);

export const ProfileSummaryPanel: React.FC<Props> = ({
  player,
  isOwnProfile,
  activeCount,
  recentHistory,
  formatDate,
}) => (
  <>
    <div className="dashboard-panel pr-panel">
      <div className="dashboard-panel-head dashboard-panel-head-tight">
        <div>
          <h2>{isOwnProfile ? 'Política de contraseña' : 'Perfil del jugador'}</h2>
          <p>{isOwnProfile ? 'Validaciones reales aplicadas en backend.' : 'Información pública del participante en ArenaSync.'}</p>
        </div>
      </div>

      {isOwnProfile ? renderPolicyItems() : renderProfileDetails(player, formatDate)}

      {isOwnProfile && (
        <div className="pr-side-soft">
          Tus datos de perfil y preferencias se usan únicamente para tu experiencia dentro de ArenaSync.
        </div>
      )}

      <div className="pr-side-soft">
        {isOwnProfile
          ? 'Puedes actualizar tu foto, contraseña y acceder a tu actividad sin salir de esta vista.'
          : 'Esta vista es solo de consulta: no permite editar datos del otro usuario.'}
      </div>
    </div>

    <div className="dashboard-panel pr-panel">
      <div className="dashboard-panel-head dashboard-panel-head-tight">
        <div>
          <h2>Actividad en torneos</h2>
          <p>{activeCount} torneos activos o en curso.</p>
        </div>
      </div>

      {recentHistory.length === 0 ? (
        <p className="dashboard-empty">No tienes participaciones registradas todavía.</p>
      ) : (
        <div className="pr-history-list">
          {recentHistory.map((item) => (
            <article key={item.id} className="pr-history-item">
              <div>
                <p className="pr-history-name">{item.name}</p>
                <p className="pr-history-meta">
                  {item.elimination_type} · {toBusinessTournamentStatus(item.status)}
                </p>
              </div>
              <span className={`tn-role-chip ${item.is_creator ? 'is-admin' : 'is-player'}`}>
                {item.is_creator ? 'Admin' : 'Jugador'}
              </span>
            </article>
          ))}
        </div>
      )}

      <Link to="/tournaments" className="tn-cta tn-cta-secondary pr-history-link">
        <span className="pr-history-link-full">Ver todos los torneos</span>
        <span className="pr-history-link-compact">Ver torneos</span>
        <FiArrowRight aria-hidden="true" />
      </Link>
    </div>
  </>
);
