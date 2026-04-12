import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: { email: 'user@gestorcitas.local', password: 'user123' }
  });
  const { login } = useAuth();
  const [error, setError] = useState('');

  async function onSubmit(values) {
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: values });
      login(data);
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="login-wrap">
      <form onSubmit={handleSubmit(onSubmit)} className="login-card space-y-4" noValidate>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">GestorCitas</h1>
          <p className="app-muted text-sm font-normal">Accede para gestionar tu agenda y clientes.</p>
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
            placeholder="Password"
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

        <button className="app-btn app-btn-primary login-submit w-full">Entrar</button>

        <p className="text-sm app-muted text-center">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            className="text-blue-600"
            onClick={() => {
              window.history.pushState({}, '', '/register');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            Crear cuenta
          </button>
        </p>
      </form>
    </div>
  );
}
