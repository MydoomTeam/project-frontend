import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');
  const userRaw = localStorage.getItem('user_profile');
  const user = userRaw ? JSON.parse(userRaw) : null;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_profile');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">ArenaSync</div>
      {token ? (
        <div className="navbar-items">
          <span className="navbar-user">
            Hola, {user?.username} ({user?.global_elo} ELO)
          </span>
          <Link to="/dashboard" className="navbar-link">Torneos</Link>
          <Link to="/alerts" className="navbar-link">Alertas</Link>
          <button onClick={handleLogout} className="navbar-button">Salir</button>
        </div>
      ) : (
        <div className="navbar-items">
          <Link to="/login" className="navbar-link">Iniciar Sesión</Link>
          <Link to="/register" className="navbar-link">Registrarse</Link>
        </div>
      )}
    </nav>
  );
};