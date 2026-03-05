import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminUsersPage({ navigate }) {
  const { token, user } = useAuth();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: '', email: '', password: '', role: 'user' }
  });
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  async function loadUsers() {
    const data = await api('/users', { token });
    setUsers(data);
  }

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function createUser(values) {
    setError('');
    try {
      await api('/users', { method: 'POST', token, body: values });
      reset({ name: '', email: '', password: '', role: 'user' });
      loadUsers();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteUser(id) {
    if (!window.confirm('¿Eliminar usuario?')) return;
    await api(`/users/${id}`, { method: 'DELETE', token });
    loadUsers();
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="bg-white rounded shadow p-4 flex justify-between">
        <h1 className="font-bold text-xl">Admin / Usuarios</h1>
        <button className="border rounded px-3 py-2" onClick={() => navigate('/dashboard')}>
          Volver
        </button>
      </header>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-3">Crear usuario</h2>
        <form className="grid md:grid-cols-4 gap-2" onSubmit={handleSubmit(createUser)}>
          <input className="border rounded p-2" placeholder="Nombre" {...register('name')} required />
          <input className="border rounded p-2" placeholder="Email" {...register('email')} required />
          <input className="border rounded p-2" type="password" placeholder="Password" {...register('password')} required />
          <select className="border rounded p-2" {...register('role')}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button className="bg-blue-600 text-white rounded px-3 py-2 md:col-span-4">Guardar</button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </section>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-3">Listado</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="border rounded p-2 flex justify-between items-center">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-sm text-slate-600">
                  {u.email} ({u.role})
                </p>
              </div>
              <button className="text-red-600" onClick={() => deleteUser(u.id)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
