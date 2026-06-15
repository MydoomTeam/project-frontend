import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineSquares2X2, HiOutlineTrophy, HiOutlineBellAlert, HiOutlineUserCircle, HiOutlinePower } from 'react-icons/hi2';

const isRouteActive = (currentPath: string, routePath: string): boolean => {
  if (routePath === '/tournaments') {
    return currentPath === '/tournaments' || currentPath.startsWith('/tournaments/');
  }
  return currentPath === routePath;
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_profile');
    navigate('/login');
  };

  return (
    <aside className="app-sidebar" aria-label="Navegación lateral">
      <div className="app-sidebar-section-title">Navegación</div>

      <Link
        to="/dashboard"
        className={`app-sidebar-link ${isRouteActive(location.pathname, '/dashboard') ? 'active' : ''}`}
      >
        <HiOutlineSquares2X2 aria-hidden="true" className="app-sidebar-icon" />
        Panel de control
      </Link>
      <Link
        to="/tournaments"
        className={`app-sidebar-link ${isRouteActive(location.pathname, '/tournaments') ? 'active' : ''}`}
      >
        <HiOutlineTrophy aria-hidden="true" className="app-sidebar-icon" />
        Torneos
      </Link>
      <Link
        to="/alerts"
        className={`app-sidebar-link ${isRouteActive(location.pathname, '/alerts') ? 'active' : ''}`}
      >
        <HiOutlineBellAlert aria-hidden="true" className="app-sidebar-icon" />
        Alertas
      </Link>
      <Link
        to="/profile"
        className={`app-sidebar-link ${isRouteActive(location.pathname, '/profile') ? 'active' : ''}`}
      >
        <HiOutlineUserCircle aria-hidden="true" className="app-sidebar-icon" />
        Perfil
      </Link>

      {/* Footer: logout pushed to bottom */}
      <div className="app-sidebar-footer">
        <button onClick={handleLogout} className="app-sidebar-logout" aria-label="Cerrar sesión">
          <HiOutlinePower aria-hidden="true" className="app-sidebar-icon" />
          Salir
        </button>
      </div>
    </aside>
  );
};