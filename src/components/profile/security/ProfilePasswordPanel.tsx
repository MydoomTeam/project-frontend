import React from 'react';
import { FiShield } from 'react-icons/fi';
import { UseFormRegister, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { PasswordUpdateFormValues } from '../../../validation/schemas';

interface Props {
  isOwnProfile: boolean;
  successMessage: string;
  errors: FieldErrors<PasswordUpdateFormValues>;
  isSubmitting: boolean;
  register: UseFormRegister<PasswordUpdateFormValues>;
  handleSubmit: UseFormHandleSubmit<PasswordUpdateFormValues>;
  onSubmitPassword: (values: PasswordUpdateFormValues) => Promise<void>;
}

export const ProfilePasswordPanel: React.FC<Props> = ({
  isOwnProfile,
  successMessage,
  errors,
  isSubmitting,
  register,
  handleSubmit,
  onSubmitPassword,
}) => {
  if (!isOwnProfile) return null;

  return (
    <div className="dashboard-panel pr-panel">
      <div className="dashboard-panel-head dashboard-panel-head-tight">
        <div>
          <h2>Seguridad y credenciales</h2>
          <p>Actualiza tu contraseña de acceso administrativo.</p>
        </div>
      </div>

      {successMessage && <div className="pr-success">{successMessage}</div>}

      <form onSubmit={handleSubmit(onSubmitPassword)} noValidate className="pr-security-form">
        <div className="pr-form-grid">
          <div className="form-group">
            <label>Contraseña actual</label>
            <input type="password" className="form-control" {...register('current_password')} />
            {errors.current_password && <small className="pr-input-error">{errors.current_password.message}</small>}
          </div>

          <div className="form-group">
            <label>Nueva contraseña</label>
            <input type="password" className="form-control" {...register('password')} />
            {errors.password && <small className="pr-input-error">{errors.password.message}</small>}
          </div>

          <div className="form-group">
            <label>Confirmar nueva contraseña</label>
            <input type="password" className="form-control" {...register('password_confirm')} />
            {errors.password_confirm && <small className="pr-input-error">{errors.password_confirm.message}</small>}
          </div>
        </div>

        <div className="pr-security-footer">
          <span className="pr-shield-pill">
            <FiShield aria-hidden="true" /> Reglas activas del backend
          </span>
          <button type="submit" className="tn-cta tn-cta-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Actualizando...' : 'Actualizar credenciales'}
          </button>
        </div>
      </form>
    </div>
  );
};
