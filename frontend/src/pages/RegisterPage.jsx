import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../api';

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: { name: '', email: '', password: '' }
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function onSubmit(values) {
    setError('');
    setSuccess('');

    try {
      await api('/auth/register', { method: 'POST', body: values });
      setSuccess('Cuenta creada');
      setTimeout(() => {
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 700);
    } catch (e) {
      if (e.status === 409) {
        setError('Email ya registrado');
      } else {
        setError(e.message);
      }
    }
  }

  return (
    <div className="login-wrap">
      <form onSubmit={handleSubmit(onSubmit)} className="login-card space-y-4" noValidate>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="app-muted text-sm font-normal">Regístrate para acceder a GestorCitas.</p>
        </div>

        <div>
          <label htmlFor="name" className="app-label">
            Nombre
          </label>
          <input
            id="name"
            className="app-input w-full"
            placeholder="Tu nombre"
            {...register('name', {
              required: 'El nombre es obligatorio',
              minLength: { value: 2, message: 'Mínimo 2 caracteres' },
              maxLength: { value: 80, message: 'Máximo 80 caracteres' }
            })}
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="app-label">
            Email
          </label>
          <input
            id="email"
            className="app-input w-full"
            placeholder="Email"
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
          <label htmlFor="password" className="app-label">
            Password
          </label>
          <input
            id="password"
            className="app-input w-full"
            type="password"
            placeholder="Mínimo 6 caracteres"
            {...register('password', {
              required: 'La contraseña es obligatoria',
              minLength: { value: 6, message: 'Mínimo 6 caracteres' }
            })}
          />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
        </div>

        {error && (
          <p className="text-red-600 text-sm" aria-live="polite">
            {error}
          </p>
        )}

        {success && (
          <p className="text-emerald-600 text-sm" aria-live="polite">
            {success}
          </p>
        )}

        <button className="app-btn app-btn-primary login-submit w-full">Crear cuenta</button>

        <p className="text-sm app-muted text-center">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            className="text-blue-600"
            onClick={() => {
              window.history.pushState({}, '', '/login');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            Inicia sesión
          </button>
        </p>
      </form>
    </div>
  );
}
