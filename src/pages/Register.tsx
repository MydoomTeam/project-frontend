import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiLock, FiMail, FiUser, FiUserPlus } from 'react-icons/fi';
import { registerUser } from '../services/auth';
import { getBackendErrorMessage } from '../services/errorHandler';
import { RegisterFormValues, registerSchema } from '../validation/schemas';

interface PasswordSecurityInfo {
  levelLabel: string;
  levelClassName: string;
  hint: string;
  filledSegments: number;
}

const getPasswordSecurityInfo = (password: string, score: number | null): PasswordSecurityInfo => {
  if (!password) {
    return {
      levelLabel: 'SIN EVALUAR',
      levelClassName: 'auth-password-level-empty',
      hint: 'Ingrese una contraseña para analizar seguridad',
      filledSegments: 0,
    };
  }

  if (score === null) {
    return {
      levelLabel: 'ANALIZANDO',
      levelClassName: 'auth-password-level-empty',
      hint: 'Validando robustez de la contraseña',
      filledSegments: 0,
    };
  }

  if (score <= 1) {
    return {
      levelLabel: 'MUY BAJA',
      levelClassName: 'auth-password-level-low',
      hint: 'Use mayúsculas, símbolos y más longitud',
      filledSegments: 1,
    };
  }

  if (score === 2) {
    return {
      levelLabel: 'MEDIA',
      levelClassName: 'auth-password-level-medium',
      hint: 'Agregue símbolos y evite patrones comunes',
      filledSegments: 2,
    };
  }

  if (score === 3) {
    return {
      levelLabel: 'ALTA',
      levelClassName: 'auth-password-level-high',
      hint: 'Buena combinación de caracteres',
      filledSegments: 3,
    };
  }

  return {
    levelLabel: 'MUY ALTA',
    levelClassName: 'auth-password-level-very-high',
    hint: 'Contraseña robusta para uso recomendado',
    filledSegments: 4,
  };
};

const calculatePasswordScore = (password: string): number | null => {
  if (!password) {
    return null;
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const hasLength8 = password.length >= 8;
  const hasLength12 = password.length >= 12;

  let points = 0;
  if (hasLength8) points += 1;
  if (hasLowercase && hasUppercase) points += 1;
  if (hasNumber) points += 1;
  if (hasSymbol) points += 1;
  if (hasLength12 && points < 4) points += 1;

  return Math.min(4, points);
};

export const Register: React.FC = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const redirectTimeoutRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const passwordValue = watch('password') ?? '';
  const passwordScore = useMemo(() => calculatePasswordScore(passwordValue), [passwordValue]);

  const passwordSecurityInfo = useMemo(
    () => getPasswordSecurityInfo(passwordValue, passwordScore),
    [passwordValue, passwordScore],
  );

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const onSubmit = async (values: RegisterFormValues) => {
    setError('');
    setSuccess('');

    try {
      await registerUser(values.username, values.email, values.password);
      setError('');
      setSuccess('¡Registro exitoso! Redirigiendo al login...');
      redirectTimeoutRef.current = window.setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('Registration error response:', err.response?.data ?? err);
      }
      setSuccess('');
      setError(getBackendErrorMessage(err, 'Error en el registro. Verifique los requisitos de contraseña.'));
    }
  };

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <div className="auth-brand">
          <img src="/Logo.png" alt="ArenaSync" className="auth-app-logo" />
          <span className="auth-brand-name">ArenaSync</span>
        </div>
        <nav className="auth-topnav" aria-label="Registro">
          <span className="auth-topnav-active">Registro</span>
        </nav>
        <div className="auth-top-actions">
          <Link to="/login" className="auth-signin-button">INICIAR SESIÓN</Link>
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-card auth-card-glow" aria-labelledby="register-title">
          <span className="auth-register-hero-icon" aria-hidden="true">
            <FiUserPlus />
          </span>
          <h1 id="register-title" className="auth-title">Registrar Nuevo Usuario</h1>

          {error && <div className="auth-error-banner">{error}</div>}
          {success && <div className="auth-success-banner">{success}</div>}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group">
              <label className="auth-field-label" htmlFor="register-username">Nombre de usuario</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><FiUser /></span>
                <input
                  id="register-username"
                  type="text"
                  className="form-control auth-form-control"
                  placeholder="cyberops01"
                  autoComplete="username"
                  aria-invalid={Boolean(errors.username)}
                  {...register('username')}
                />
              </div>
              {errors.username && <small className="auth-field-error">{errors.username.message}</small>}
            </div>

            <div className="form-group">
              <label className="auth-field-label" htmlFor="register-email">Correo electrónico</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><FiMail /></span>
                <input
                  id="register-email"
                  type="email"
                  className="form-control auth-form-control"
                  placeholder="operador@arenasync.com"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
              </div>
              {errors.email && <small className="auth-field-error">{errors.email.message}</small>}
            </div>

            <div className="form-group">
              <label className="auth-field-label" htmlFor="register-password">Contraseña</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><FiLock /></span>
                <input
                  id="register-password"
                  type="password"
                  className="form-control auth-form-control"
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
              </div>
              <div className="auth-password-meter" aria-hidden="true">
                <span
                  className={`auth-password-meter-segment ${passwordSecurityInfo.filledSegments >= 1 ? passwordSecurityInfo.levelClassName : ''}`}
                />
                <span
                  className={`auth-password-meter-segment ${passwordSecurityInfo.filledSegments >= 2 ? passwordSecurityInfo.levelClassName : ''}`}
                />
                <span
                  className={`auth-password-meter-segment ${passwordSecurityInfo.filledSegments >= 3 ? passwordSecurityInfo.levelClassName : ''}`}
                />
                <span
                  className={`auth-password-meter-segment ${passwordSecurityInfo.filledSegments >= 4 ? passwordSecurityInfo.levelClassName : ''}`}
                />
              </div>
              <div className="auth-password-strip">
                <span className={`auth-password-level ${passwordSecurityInfo.levelClassName}`}>
                  SEGURIDAD: {passwordSecurityInfo.levelLabel}
                </span>
                <span className="auth-password-meta">{passwordSecurityInfo.hint}</span>
              </div>
              {errors.password && <small className="auth-field-error">{errors.password.message}</small>}
            </div>

            <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'REGISTRANDO…' : 'REGISTRARSE'}
            </button>
          </form>

          <p className="auth-switch-text">
            ¿Ya tienes una cuenta? <Link to="/login" className="auth-switch-link">Iniciar Sesión</Link>
          </p>
        </section>
      </main>

      <footer className="auth-footer">
        <span>© {currentYear} ARENASYNC · PLATAFORMA DE TORNEOS</span>
      </footer>
    </div>
  );
};