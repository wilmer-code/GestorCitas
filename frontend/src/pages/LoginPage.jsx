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
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded shadow w-full max-w-sm space-y-4" noValidate>
        <h1 className="text-xl font-bold">GestorCitas</h1>
        <p className="text-sm text-slate-600">Inicia sesión</p>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            className="w-full border rounded p-2"
            placeholder="Email"
            {...register('email', {
              required: 'El email es obligatorio',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Formato de email inválido'
              }
            })}
          />
          {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            className="w-full border rounded p-2"
            type="password"
            placeholder="Password"
            {...register('password', {
              required: 'La contraseña es obligatoria',
              minLength: { value: 6, message: 'Mínimo 6 caracteres' }
            })}
          />
          {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
        </div>

        {error && (
          <p className="text-red-600 text-sm" aria-live="polite">
            {error}
          </p>
        )}

        <button className="w-full bg-blue-600 text-white rounded p-2">Entrar</button>
      </form>
    </div>
  );
}
