import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

export default function UserEditModal({ open, onClose, user, onSave, saving, error }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
      password: ''
    }
  });

  useEffect(() => {
    if (!open || !user) return;

    reset({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
      password: ''
    });
  }, [open, user, reset]);

  if (!open || !user) return null;

  function submit(values) {
    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role
    };

    if (values.password?.trim()) {
      payload.password = values.password.trim();
    }

    onSave(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="app-card w-full max-w-md space-y-3">
        <h3 className="panel-title">Editar usuario</h3>

        <form className="space-y-3" onSubmit={handleSubmit(submit)} noValidate>
          <div>
            <label htmlFor="edit-user-name" className="app-label">
              Nombre
            </label>
            <input
              id="edit-user-name"
              className="app-input w-full"
              {...register('name', {
                required: 'El nombre es obligatorio'
              })}
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="edit-user-email" className="app-label">
              Email
            </label>
            <input
              id="edit-user-email"
              className="app-input w-full"
              {...register('email', {
                required: 'El email es obligatorio',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Formato de email inválido'
                }
              })}
            />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="edit-user-role" className="app-label">
              Rol
            </label>
            <select
              id="edit-user-role"
              className="app-input admin-select w-full"
              {...register('role', {
                validate: (value) => ['admin', 'user'].includes(value) || 'Rol inválido'
              })}
            >
              <option value="user">usuario</option>
              <option value="admin">admin</option>
            </select>
            {errors.role && <p className="text-red-600 text-sm mt-1">{errors.role.message}</p>}
          </div>

          <div>
            <label htmlFor="edit-user-password" className="app-label">
              Password (opcional)
            </label>
            <input
              id="edit-user-password"
              type="password"
              className="app-input w-full"
              placeholder="Dejar vacío para no cambiar"
              {...register('password', {
                validate: (value) => {
                  if (!value || !value.trim()) return true;
                  return value.trim().length >= 6 || 'Mínimo 6 caracteres';
                }
              })}
            />
            {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
          </div>

          {error && (
            <p className="text-red-600 text-sm" aria-live="polite">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" className="topbar-btn topbar-btn--ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="app-btn app-btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
