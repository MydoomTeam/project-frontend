import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineBellAlert,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineTrophy,
} from 'react-icons/hi2';
import { getAlerts } from '../services/alerts';
import { PlayerAvatar } from './PlayerAvatar';

const ALERTS_REFRESH_MS = 15000;

interface NavbarUser {
  username?: string;
  role?: string;
  global_elo?: number;
  avatar_url?: string;
}

const parseStoredUser = (rawUser: string | null): NavbarUser | null => {
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser) as NavbarUser;
    return parsed;
  } catch {
    return null;
  }
};

const getUserInitials = (username?: string): string => {
  if (!username || username.trim().length === 0) return 'AS';

  const clean = username.trim();
  if (clean.length === 1) return clean[0].toUpperCase();

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
};

export const Navbar: React.FC = () => {
  const [newAlertsCount, setNewAlertsCount] = useState(0);
  const userRaw = localStorage.getItem('user_profile');
  const user = parseStoredUser(userRaw);
  const userLabel = user?.username ?? 'Perfil';
  const userEloLabel = typeof user?.global_elo === 'number' ? `${user.global_elo} ELO` : 'Sin ELO';

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await getAlerts();
        const count = (data.items ?? []).filter((item) => item.status === 'nueva').length;
        setNewAlertsCount(count);
      } catch {
        setNewAlertsCount(0);
      }
    };

    loadAlerts();
    const intervalId = window.setInterval(loadAlerts, ALERTS_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <nav className="app-topbar">

      {/* Zone 1: brand */}
      <div className="app-topbar-zone app-topbar-zone--brand">
        <img src="/Logo.png" alt="ArenaSync" className="app-brand-logo" />
        <span className="app-topbar-brand-name">ArenaSync</span>
      </div>

      {/* Zone 2: search — grows to fill available space */}
      <div className="app-topbar-zone app-topbar-zone--search">
        <label className="app-topbar-search" aria-label="Buscar torneos">
          <span className="app-topbar-icon-box">
            <HiOutlineMagnifyingGlass aria-hidden="true" />
          </span>
          <span className="app-topbar-search-placeholder">Buscar torneos, jugadores o estado...</span>
        </label>
      </div>

      {/* Zone 3: actions */}
      <div className="app-topbar-zone app-topbar-zone--actions">

        {/* Primary CTA */}
        <Link to="/dashboard?create=1" className="app-topbar-btn app-topbar-btn--primary">
          <span className="app-topbar-icon-box">
            <HiOutlinePlus aria-hidden="true" />
          </span>
          Nuevo torneo
        </Link>

        {/* Ghost action: Alerts */}
        <Link to="/alerts" className="app-topbar-btn app-topbar-btn--ghost" aria-label="Ir a alertas">
          <span className={`app-topbar-icon-box app-topbar-bell ${newAlertsCount > 0 ? 'has-alerts' : ''}`}>
            <HiOutlineBellAlert aria-hidden="true" />
          </span>
          Alertas
          {newAlertsCount > 0 && (
            <span className="app-alert-badge" aria-live="polite">
              {newAlertsCount > 99 ? '99+' : newAlertsCount}
            </span>
          )}
        </Link>

        {/* User chip */}
        <Link to="/profile" className="app-user-chip" aria-label="Ir a perfil">
          <div className="app-user-text">
            <span className="app-user-name">{userLabel}</span>
            <span className="app-user-elo">
              <HiOutlineTrophy aria-hidden="true" />
              {userEloLabel}
            </span>
          </div>
          <PlayerAvatar username={user?.username} size="sm" />
        </Link>

        {/* Destructive ghost: logout — moved to sidebar footer */}

      </div>
    </nav>
  );
};