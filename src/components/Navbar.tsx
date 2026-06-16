import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineBellAlert,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineTrophy,
} from 'react-icons/hi2';
import { ackAlert, getAlerts } from '../services/alerts';
import { getPlayerById, searchPlayers } from '../services/players';
import { getAllTournaments } from '../services/tournaments';
import { AlertItem, PlayerLookupItem, Tournament } from '../types/models';
import { PlayerAvatar } from './PlayerAvatar';

const ALERTS_REFRESH_MS = 15000;
const SEARCH_TOURNAMENTS_REFRESH_MS = 45000;
const SEARCH_DEBOUNCE_MS = 220;
const MAX_PLAYER_SUGGESTIONS = 4;
const MAX_TOURNAMENT_SUGGESTIONS = 4;

type SearchSuggestion =
  | { kind: 'player'; id: number; label: string; detail: string }
  | { kind: 'tournament'; id: number; label: string; detail: string };

const renderHighlightedLabel = (label: string, query: string): React.ReactNode => {
  const normalized = query.trim();
  if (!normalized) return label;

  const source = label.toLowerCase();
  const needle = normalized.toLowerCase();
  const start = source.indexOf(needle);
  if (start < 0) return label;

  const end = start + normalized.length;
  return (
    <>
      {label.slice(0, start)}
      <strong className="app-topbar-search-hit">{label.slice(start, end)}</strong>
      {label.slice(end)}
    </>
  );
};

interface NavbarUser {
  id?: number;
  username?: string;
  role?: string;
  global_elo?: number;
  avatar_url?: string | null;
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

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [newAlertsCount, setNewAlertsCount] = useState(0);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [playerSuggestions, setPlayerSuggestions] = useState<PlayerLookupItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [user, setUser] = useState<NavbarUser | null>(() => parseStoredUser(localStorage.getItem('user_profile')));
  const alertsPopoverRef = useRef<HTMLDivElement | null>(null);
  const alertsButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const userLabel = user?.username ?? 'Perfil';
  const userEloLabel = typeof user?.global_elo === 'number' ? `${user.global_elo} ELO` : 'Sin ELO';
  const userId = useMemo(() => (typeof user?.id === 'number' ? user.id : null), [user]);

  const syncLocalUser = (next: NavbarUser) => {
    const raw = localStorage.getItem('user_profile');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as NavbarUser;
      const merged = { ...parsed, ...next };
      localStorage.setItem('user_profile', JSON.stringify(merged));
    } catch {
      // ignore localStorage sync errors
    }
  };

  useEffect(() => {
    const handleStorage = () => {
      setUser(parseStoredUser(localStorage.getItem('user_profile')));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const data = await getAllTournaments();
        setAllTournaments(data);
      } catch {
        setAllTournaments([]);
      }
    };

    loadTournaments();
    const intervalId = window.setInterval(loadTournaments, SEARCH_TOURNAMENTS_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const normalized = searchQuery.trim();
    if (!normalized) {
      setPlayerSuggestions([]);
      return;
    }

    const query = normalized.startsWith('@') ? normalized.slice(1).trim() : normalized;
    if (!query) {
      setPlayerSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await searchPlayers(query, MAX_PLAYER_SUGGESTIONS);
        setPlayerSuggestions(data);
      } catch {
        setPlayerSuggestions([]);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!searchWrapRef.current?.contains(target)) {
        setIsSearchOpen(false);
        setActiveSuggestionIndex(-1);
      }
    };

    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [isSearchOpen]);

  useEffect(() => {
    if (userId == null) return;

    const loadCurrentUser = async () => {
      try {
        const latest = await getPlayerById(userId);
        const nextUser: NavbarUser = {
          id: latest.id,
          username: latest.username,
          role: latest.role,
          global_elo: latest.global_elo,
          avatar_url: latest.avatar_url,
        };
        setUser((prev) => ({ ...(prev ?? {}), ...nextUser }));
        syncLocalUser(nextUser);
      } catch {
        // keep last known user data
      }
    };

    loadCurrentUser();
    const intervalId = window.setInterval(loadCurrentUser, ALERTS_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [userId]);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await getAlerts();
        const items = data.items ?? [];
        const count = items.filter((item) => item.status === 'nueva').length;
        setAlerts(items);
        setNewAlertsCount(count);
      } catch {
        setAlerts([]);
        setNewAlertsCount(0);
      }
    };

    loadAlerts();
    const intervalId = window.setInterval(loadAlerts, ALERTS_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isAlertsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsidePopover = alertsPopoverRef.current?.contains(target);
      const clickedButton = alertsButtonRef.current?.contains(target);
      if (!clickedInsidePopover && !clickedButton) {
        setIsAlertsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAlertsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isAlertsOpen]);

  const handleAckAlert = async (id: number) => {
    try {
      await ackAlert(id);
      const updated = alerts.map((item) => (
        item.id === id ? { ...item, status: 'reconocida' as const } : item
      ));
      setAlerts(updated);
      setNewAlertsCount(updated.filter((item) => item.status === 'nueva').length);
    } catch {
      // ignore optimistic update errors
    }
  };

  const formatAlertDate = (value: string): string => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('es-CO', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) {
      navigate('/tournaments');
      return;
    }

    const prefersPlayer = rawQuery.startsWith('@');
    const normalizedPlayerQuery = prefersPlayer ? rawQuery.slice(1).trim() : rawQuery;

    if (normalizedPlayerQuery) {
      try {
        const players = await searchPlayers(normalizedPlayerQuery, 5);
        const exact = players.find(
          (player) => player.username.toLowerCase() === normalizedPlayerQuery.toLowerCase(),
        );
        if (prefersPlayer || players.length === 1 || exact) {
          const selected = exact ?? players[0];
          if (selected) {
            navigate(`/profile/${selected.id}`);
            return;
          }
        }
      } catch {
        // fallback to tournaments search if player search fails
      }
    }

    navigate(`/tournaments?q=${encodeURIComponent(rawQuery)}`);
  };

  const rawSearch = searchQuery.trim();
  const normalizedSearch = rawSearch.toLowerCase();
  const highlightQuery = useMemo(() => {
    if (!rawSearch) return '';
    return rawSearch.startsWith('@') ? rawSearch.slice(1).trim() : rawSearch;
  }, [rawSearch]);

  const tournamentSuggestions = useMemo(() => {
    if (!normalizedSearch) return [];
    return allTournaments
      .filter((item) => {
        const byName = item.name.toLowerCase().includes(normalizedSearch);
        const byCreator = (item.creator_name ?? '').toLowerCase().includes(normalizedSearch);
        return byName || byCreator;
      })
      .slice(0, MAX_TOURNAMENT_SUGGESTIONS);
  }, [allTournaments, normalizedSearch]);

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const players: SearchSuggestion[] = playerSuggestions.map((player) => ({
      kind: 'player',
      id: player.id,
      label: player.username,
      detail: `${player.global_elo} ELO`,
    }));

    const tournaments: SearchSuggestion[] = tournamentSuggestions.map((item) => ({
      kind: 'tournament',
      id: item.id,
      label: item.name,
      detail: item.creator_name ? `Creador: ${item.creator_name}` : 'Torneo',
    }));

    return [...players, ...tournaments];
  }, [playerSuggestions, tournamentSuggestions]);

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.kind === 'player') {
      navigate(`/profile/${suggestion.id}`);
      setSearchQuery(suggestion.label);
    } else {
      navigate(`/tournaments/${suggestion.id}`);
      setSearchQuery(suggestion.label);
    }
    setIsSearchOpen(false);
    setActiveSuggestionIndex(-1);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || suggestions.length === 0) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        setIsSearchOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      return;
    }

    if (event.key === 'Escape') {
      setIsSearchOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (event.key === 'Enter' && activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
      event.preventDefault();
      handleSuggestionSelect(suggestions[activeSuggestionIndex]);
    }
  };

  useEffect(() => {
    if (activeSuggestionIndex < suggestions.length) return;
    setActiveSuggestionIndex(-1);
  }, [activeSuggestionIndex, suggestions.length]);

  return (
    <nav className="app-topbar">

      {/* Zone 1: brand */}
      <div className="app-topbar-zone app-topbar-zone--brand">
        <img src="/Logo.png" alt="ArenaSync" className="app-brand-logo" />
        <span className="app-topbar-brand-name">ArenaSync</span>
      </div>

      {/* Zone 2: search — grows to fill available space */}
      <div className="app-topbar-zone app-topbar-zone--search">
        <div className="app-topbar-search-wrap" ref={searchWrapRef}>
          <form className="app-topbar-search" onSubmit={handleSearchSubmit} role="search" aria-label="Buscar torneos, jugadores o estado">
            <span className="app-topbar-icon-box">
              <HiOutlineMagnifyingGlass aria-hidden="true" />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              className="app-topbar-search-input"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setIsSearchOpen(true);
                setActiveSuggestionIndex(-1);
              }}
              placeholder="Buscar torneos, jugadores o estado..."
              aria-label="Buscar torneos, jugadores o estado"
            />
          </form>

          {isSearchOpen && searchQuery.trim() && (
            <div className="app-topbar-search-suggestions" role="listbox" aria-label="Sugerencias de búsqueda">
              {suggestions.length === 0 ? (
                <p className="app-topbar-search-empty">Sin coincidencias rápidas. Presiona Enter para búsqueda completa.</p>
              ) : (
                suggestions.map((suggestion, index) => (
                  <button
                    type="button"
                    key={`${suggestion.kind}-${suggestion.id}`}
                    className={`app-topbar-search-item ${activeSuggestionIndex === index ? 'is-active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <span className={`app-topbar-search-kind kind-${suggestion.kind}`}>
                      {suggestion.kind === 'player' ? 'Jugador' : 'Torneo'}
                    </span>
                    <span className="app-topbar-search-main">{renderHighlightedLabel(suggestion.label, highlightQuery)}</span>
                    <span className="app-topbar-search-meta">{suggestion.detail}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: actions */}
      <div className="app-topbar-zone app-topbar-zone--actions">

        {/* Primary CTA */}
        <Link to="/tournaments/new" className="app-topbar-btn app-topbar-btn--primary">
          <span className="app-topbar-icon-box">
            <HiOutlinePlus aria-hidden="true" />
          </span>
          Nuevo torneo
        </Link>

        {/* Ghost action: Alerts */}
        <div className="app-topbar-alerts-wrap">
          <button
            type="button"
            ref={alertsButtonRef}
            className="app-topbar-btn app-topbar-btn--ghost"
            aria-label="Abrir alertas"
            aria-expanded={isAlertsOpen}
            onClick={() => setIsAlertsOpen((prev) => !prev)}
          >
            <span className={`app-topbar-icon-box app-topbar-bell ${newAlertsCount > 0 ? 'has-alerts' : ''}`}>
              <HiOutlineBellAlert aria-hidden="true" />
            </span>
            Alertas
            {newAlertsCount > 0 && (
              <span className="app-alert-badge" aria-live="polite">
                {newAlertsCount > 99 ? '99+' : newAlertsCount}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <div className="app-alerts-popover" ref={alertsPopoverRef} role="dialog" aria-label="Alertas recientes">
              <div className="app-alerts-popover-head">
                <strong>Alertas recientes</strong>
                <span>{newAlertsCount} nuevas</span>
              </div>

              <div className="app-alerts-popover-list">
                {alerts.length === 0 ? (
                  <p className="app-alerts-popover-empty">No hay alertas por ahora.</p>
                ) : (
                  alerts.slice(0, 6).map((item) => (
                    <article key={item.id} className={`app-alert-mini ${item.status === 'nueva' ? 'is-new' : ''}`}>
                      <div>
                        <p>{item.message}</p>
                        <small>{formatAlertDate(item.created_at)}</small>
                      </div>
                      {item.status === 'nueva' && (
                        <button type="button" className="app-alert-mini-ack" onClick={() => handleAckAlert(item.id)}>
                          Reconocer
                        </button>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User chip */}
        <Link to="/profile" className="app-user-chip" aria-label="Ir a perfil">
          <div className="app-user-text">
            <span className="app-user-name">{userLabel}</span>
            <span className="app-user-elo">
              <HiOutlineTrophy aria-hidden="true" />
              {userEloLabel}
            </span>
          </div>
          <PlayerAvatar username={user?.username} avatarUrl={user?.avatar_url} size="sm" />
        </Link>

        {/* Destructive ghost: logout — moved to sidebar footer */}

      </div>
    </nav>
  );
};