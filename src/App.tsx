import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Tournaments } from './pages/Tournaments';
import { TournamentsLive } from './pages/TournamentsLive';
import { TournamentDetail } from './pages/TournamentDetail';
import { CreateTournament } from './pages/CreateTournament';
import { Alerts } from './pages/Alerts';
import { Profile } from './pages/Profile';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SessionTimeoutManager } from './components/SessionTimeoutManager';
import './assets/styles.css';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const PrivateAppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <>
      <SessionTimeoutManager />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={<PrivateRoute><PrivateAppShell><Dashboard /></PrivateAppShell></PrivateRoute>}
        />
        <Route
          path="/tournaments"
          element={<PrivateRoute><PrivateAppShell><Tournaments /></PrivateAppShell></PrivateRoute>}
        />
        <Route
          path="/tournaments/live"
          element={<PrivateRoute><PrivateAppShell><TournamentsLive /></PrivateAppShell></PrivateRoute>}
        />
        <Route
          path="/tournaments/:id"
          element={<PrivateRoute><PrivateAppShell><TournamentDetail /></PrivateAppShell></PrivateRoute>}
        />
        <Route
          path="/tournaments/new"
          element={<PrivateRoute><PrivateAppShell><CreateTournament /></PrivateAppShell></PrivateRoute>}
        />
        <Route
          path="/alerts"
          element={<PrivateRoute><PrivateAppShell><Alerts /></PrivateAppShell></PrivateRoute>}
        />
        <Route
          path="/profile"
          element={<PrivateRoute><PrivateAppShell><Profile /></PrivateAppShell></PrivateRoute>}
        />
        <Route
          path="/profile/:playerId"
          element={<PrivateRoute><PrivateAppShell><Profile /></PrivateAppShell></PrivateRoute>}
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
};