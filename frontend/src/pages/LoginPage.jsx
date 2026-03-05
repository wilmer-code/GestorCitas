import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { register, handleSubmit } = useForm({
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
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded shadow w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">GestorCitas</h1>
        <p className="text-sm text-slate-600">Inicia sesión</p>
        <input className="w-full border rounded p-2" placeholder="Email" {...register('email')} />
        <input className="w-full border rounded p-2" type="password" placeholder="Password" {...register('password')} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full bg-blue-600 text-white rounded p-2">Entrar</button>
      </form>
    </div>
  );
}
