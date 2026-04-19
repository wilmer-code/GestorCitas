import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(values) {
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email: values.email, password: values.password },
        tenantSlug: values.slug
      });
      login(data, values.slug);
      navigate('/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form onSubmit={handleSubmit(onSubmit)} className="login-card space-y-4" noValidate>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-blue-600">Citio</h1>
          <p className="app-muted text-sm">Gestiona tu negocio con Citio</p>
        </div>

        <div>
          <label htmlFor="slug" className="app-label">Nombre de tu negocio</label>
          <input
            id="slug"
            className="app-input w-full"
            placeholder="mi-peluqueria"
            {...register('slug', { required: 'El nombre del negocio es obligatorio' })}
          />
          {errors.slug && <p className="text-red-600 text-sm mt-1">{errors.slug.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="app-label">Email</label>
          <input
            id="email"
            className="app-input w-full"
            placeholder="tu@email.com"
            {...register('email', {
              required: 'El email es obligatorio',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email invalido' }
            })}
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="app-label">Contrasena</label>
          <input
            id="password"
            className="app-input w-full"
            type="password"
            placeholder="••••••••"
            {...register('password', { required: 'La contrasena es obligatoria' })}
          />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
        </div>

        {error && <p className="text-red-600 text-sm" aria-live="polite">{error}</p>}

        <button
          className="app-btn app-btn-primary login-submit w-full"
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-sm app-muted text-center">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={() => navigate('/register')}
          >
            Registra tu negocio gratis
          </button>
        </p>
      </form>
    </div>
  );
}
