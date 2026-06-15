import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiLock, FiLogIn, FiUser } from 'react-icons/fi';
import { loginUser } from '../services/auth';
import { getBackendErrorMessage } from '../services/errorHandler';
import { LoginFormValues, loginSchema } from '../validation/schemas';

const LOGIN_GUARD_KEY = 'login_guard';
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60_000;

interface LoginGuardState {
  failedAttempts: number;
  lockUntil: number | null;
}

const loadLoginGuard = (): LoginGuardState => {
  const rawValue = localStorage.getItem(LOGIN_GUARD_KEY);
  if (!rawValue) {
    return { failedAttempts: 0, lockUntil: null };
  }

  try {
    const parsed = JSON.parse(rawValue) as LoginGuardState;
    return {
      failedAttempts: Number.isFinite(parsed.failedAttempts) ? parsed.failedAttempts : 0,
      lockUntil: typeof parsed.lockUntil === 'number' ? parsed.lockUntil : null,
    };
  } catch {
    return { failedAttempts: 0, lockUntil: null };
  }
};

const saveLoginGuard = (value: LoginGuardState): void => {
  localStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(value));
};

const clearLoginGuard = (): void => {
  localStorage.removeItem(LOGIN_GUARD_KEY);
};

const isUnauthorizedError = (error: unknown): boolean => {
  return (error as any)?.response?.status === 401;
};

export const Login: React.FC = () => {
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const isLocked = useMemo(() => lockUntil !== null && lockUntil > now, [lockUntil, now]);
  const secondsRemaining = useMemo(() => {
    if (!isLocked || lockUntil === null) {
      return 0;
    }
    return Math.max(0, Math.ceil((lockUntil - now) / 1000));
  }, [isLocked, lockUntil, now]);

  useEffect(() => {
    const guard = loadLoginGuard();
    setFailedAttempts(guard.failedAttempts);
    setLockUntil(guard.lockUntil);
  }, []);

  useEffect(() => {
    if (!isLocked) {
      if (lockUntil !== null && lockUntil <= now) {
        setLockUntil(null);
        setFailedAttempts(0);
        clearLoginGuard();
      }
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isLocked, lockUntil, now]);

  const onSubmit = async (values: LoginFormValues) => {
    setError('');

    if (isLocked) {
      setError(`Demasiados intentos fallidos. Intenta de nuevo en ${secondsRemaining}s.`);
      return;
    }

    try {
      const data = await loginUser(values.identifier, values.password);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_profile', JSON.stringify(data.player));
      setFailedAttempts(0);
      setLockUntil(null);
      clearLoginGuard();
      navigate('/dashboard');
    } catch (err: unknown) {
      if (isUnauthorizedError(err)) {
        const nextAttempts = failedAttempts + 1;
        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          const nextLockUntil = Date.now() + LOCKOUT_DURATION_MS;
          setFailedAttempts(0);
          setLockUntil(nextLockUntil);
          saveLoginGuard({ failedAttempts: 0, lockUntil: nextLockUntil });
          setError(`Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(LOCKOUT_DURATION_MS / 1000)}s.`);
          return;
        }
        setFailedAttempts(nextAttempts);
        saveLoginGuard({ failedAttempts: nextAttempts, lockUntil });
      }
      setError(getBackendErrorMessage(err, 'Credenciales inválidas o error de conexión'));
    }
  };

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <div className="auth-brand">
          <img src="/Logo.png" alt="ArenaSync" className="auth-app-logo" />
          <span className="auth-brand-name">ArenaSync</span>
        </div>
        <nav className="auth-topnav" aria-label="Inicio de sesión">
          <span className="auth-topnav-active">Inicio de sesión</span>
        </nav>
        <div className="auth-top-actions">
          <Link to="/register" className="auth-signin-button">REGISTRARSE</Link>
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-card auth-card-glow" aria-labelledby="login-title">
          <span className="auth-register-hero-icon" aria-hidden="true">
            <FiLogIn />
          </span>
          <h1 id="login-title" className="auth-title">Iniciar Sesión</h1>

          {error && <div className="auth-error-banner">{error}</div>}
          {!isLocked && failedAttempts > 0 && (
            <div className="auth-info-banner">Intentos fallidos recientes: {failedAttempts}/{MAX_FAILED_ATTEMPTS}</div>
          )}
          {isLocked && (
            <div className="auth-error-banner">
              Acceso bloqueado temporalmente por intentos fallidos. Reintenta en {secondsRemaining}s.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group">
              <label className="auth-field-label" htmlFor="login-identifier">Usuario o correo electrónico</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><FiUser /></span>
                <input
                  id="login-identifier"
                  type="text"
                  className="form-control auth-form-control"
                  placeholder="nombre@empresa.com"
                  autoComplete="username"
                  aria-invalid={Boolean(errors.identifier)}
                  {...register('identifier')}
                />
              </div>
              {errors.identifier && <small className="auth-field-error">{errors.identifier.message}</small>}
            </div>

            <div className="form-group">
              <label className="auth-field-label" htmlFor="login-password">Contraseña</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><FiLock /></span>
                <input
                  id="login-password"
                  type="password"
                  className="form-control auth-form-control"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
              </div>
              {errors.password && <small className="auth-field-error">{errors.password.message}</small>}
            </div>

            <button type="submit" className="auth-primary-button" disabled={isSubmitting || isLocked}>
              {isSubmitting ? 'INGRESANDO…' : 'INICIAR SESIÓN'}
            </button>
          </form>

          <p className="auth-switch-text">
            ¿No tienes una cuenta? <Link to="/register" className="auth-switch-link">Regístrate</Link>
          </p>
        </section>
      </main>

      <footer className="auth-footer">
        <span>© {currentYear} ARENASYNC · PLATAFORMA DE TORNEOS</span>
      </footer>
    </div>
  );
};