import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function RegisterPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(null);

  const slugValue = watch('slug', '');

  async function checkSlug(slug) {
    if (!slug || slug.length < 2) { setSlugAvailable(null); return; }
    try {
      const res = await api(`/tenants/check-slug/${slug}`);
      setSlugAvailable(res.available);
    } catch {
      setSlugAvailable(null);
    }
  }

  async function onSubmit(values) {
    setError('');
    setLoading(true);
    try {
      await api('/tenants/register', {
        method: 'POST',
        body: {
          businessName: values.businessName,
          slug: values.slug,
          adminEmail: values.email,
          adminPassword: values.password,
          adminName: values.adminName
        }
      });
      const loginData = await api('/auth/login', {
        method: 'POST',
        body: { email: values.email, password: values.password },
        tenantSlug: values.slug
      });
      login(loginData, values.slug);
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
          <p className="app-muted text-sm">Crea tu cuenta gratis — sin tarjeta de credito</p>
        </div>

        <div>
          <label className="app-label">Nombre de tu negocio</label>
          <input
            className="app-input w-full"
            placeholder="Mi Peluqueria"
            {...register('businessName', { required: 'Obligatorio', minLength: { value: 2, message: 'Minimo 2 caracteres' } })}
          />
          {errors.businessName && <p className="text-red-600 text-sm mt-1">{errors.businessName.message}</p>}
        </div>

        <div>
          <label className="app-label">URL de tu negocio</label>
          <div className="flex items-center gap-1">
            <input
              className="app-input flex-1"
              placeholder="mi-peluqueria"
              {...register('slug', {
                required: 'Obligatorio',
                minLength: { value: 2, message: 'Minimo 2 caracteres' },
                pattern: { value: /^[a-z0-9-]+$/, message: 'Solo minusculas, numeros y guiones' },
                onChange: (e) => checkSlug(e.target.value)
              })}
            />
            <span className="text-xs app-muted">.citio.app</span>
          </div>
          {slugValue.length >= 2 && slugAvailable === true && (
            <p className="text-green-600 text-sm mt-1">Disponible</p>
          )}
          {slugValue.length >= 2 && slugAvailable === false && (
            <p className="text-red-600 text-sm mt-1">Ya esta en uso</p>
          )}
          {errors.slug && <p className="text-red-600 text-sm mt-1">{errors.slug.message}</p>}
        </div>

        <div>
          <label className="app-label">Tu nombre</label>
          <input
            className="app-input w-full"
            placeholder="Maria Garcia"
            {...register('adminName', { required: 'Obligatorio', minLength: { value: 2, message: 'Minimo 2 caracteres' } })}
          />
          {errors.adminName && <p className="text-red-600 text-sm mt-1">{errors.adminName.message}</p>}
        </div>

        <div>
          <label className="app-label">Email</label>
          <input
            className="app-input w-full"
            placeholder="tu@email.com"
            type="email"
            {...register('email', {
              required: 'Obligatorio',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email invalido' }
            })}
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="app-label">Contrasena</label>
          <input
            className="app-input w-full"
            type="password"
            placeholder="Minimo 8 caracteres"
            {...register('password', {
              required: 'Obligatorio',
              minLength: { value: 8, message: 'Minimo 8 caracteres' }
            })}
          />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
        </div>

        {error && <p className="text-red-600 text-sm" aria-live="polite">{error}</p>}

        <button
          className="app-btn app-btn-primary login-submit w-full"
          disabled={loading || slugAvailable === false}
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
        </button>

        <p className="text-sm app-muted text-center">
          Ya tienes cuenta?{' '}
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={() => navigate('/login')}
          >
            Entrar
          </button>
        </p>
      </form>
    </div>
  );
}
