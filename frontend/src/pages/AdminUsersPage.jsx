import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import UserEditModal from '../components/UserEditModal';
import { useAuth } from '../context/AuthContext';

const THEME_KEY = 'theme';

function roleLabel(role) {
  return role === 'ADMIN' ? 'Administrador' : 'Usuario';
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AdminUsersPage({ navigate }) {
  const { token, user, logout } = useAuth();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', email: '', password: '', role: 'USER' }
  });

  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [usersView, setUsersView] = useState('table');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'light');
  const [editingUser, setEditingUser] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  async function loadUsers() {
    setListLoading(true);
    try {
      const data = await api('/users', { token });
      setUsers(data);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/dashboard'); return; }
    loadUsers();
  }, [user]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => { setCurrentPage(1); }, [query, pageSize]);

  async function createUser(values) {
    setError('');
    setLoading(true);
    try {
      await api('/users', { method: 'POST', token, body: values });
      reset({ name: '', email: '', password: '', role: 'USER' });
      await loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id) {
    if (!window.confirm('Eliminar usuario?')) return;
    await api('/users/' + id, { method: 'DELETE', token });
    await loadUsers();
  }

  async function updateUser(values) {
    if (!editingUser) return;
    setEditLoading(true);
    setEditError('');
    try {
      await api('/users/' + editingUser.id, { method: 'PUT', token, body: values });
      setEditingUser(null);
      await loadUsers();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
  }, [users, query]);

  const sortedUsers = useMemo(() => {
    if (sortDir === 'none') return filteredUsers;
    const copy = [...filteredUsers];
    const factor = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === 'createdAt') return (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) * factor;
      return String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''), 'es') * factor;
    });
    return copy;
  }, [filteredUsers, sortDir, sortKey]);

  const total = sortedUsers.length;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function toggleSort(nextKey) {
    if (sortKey !== nextKey) { setSortKey(nextKey); setSortDir('asc'); return; }
    setSortDir((prev) => prev === 'asc' ? 'desc' : prev === 'desc' ? 'none' : 'asc');
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div>
          <h1 className="admin-brand">Citio</h1>
          <nav className="admin-nav">
            {[
              { label: 'Panel', path: '/dashboard' },
              { label: 'Clientes', path: '/dashboard' },
              { label: 'Citas', path: '/dashboard' },
            ].map((item) => (
              <button key={item.label} className="admin-nav-item" onClick={() => navigate(item.path)}>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <p className="admin-section-title">ADMINISTRACION</p>
          <button className="admin-nav-item admin-nav-item--active" onClick={() => navigate('/admin/users')}>
            <span>Gestion de usuarios</span>
          </button>
        </div>
        <div className="admin-user-card">
          <div className="admin-user-top">
            <div className="min-w-0">
              <p className="font-semibold truncate">{user?.name || user?.email || 'Usuario'}</p>
              <p className="text-sm app-muted">{roleLabel(user?.role)}</p>
            </div>
          </div>
          <hr className="admin-user-sep" />
          <button type="button" className="admin-logout-btn" onClick={() => { logout(); navigate('/login'); }}>
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="app-card admin-main-header">
          <div>
            <h2 className="text-2xl font-bold">Admin / Usuarios</h2>
            <p className="app-muted text-sm">Gestion de usuarios del negocio.</p>
          </div>
          <div className="topbar-group">
            <button className={'topbar-btn ' + (theme === 'light' ? 'topbar-btn--active' : 'topbar-btn--ghost')} onClick={() => setTheme('light')}>Claro</button>
            <button className={'topbar-btn ' + (theme === 'dark' ? 'topbar-btn--active' : 'topbar-btn--ghost')} onClick={() => setTheme('dark')}>Oscuro</button>
            <button className="topbar-btn topbar-btn--ghost" onClick={() => navigate('/dashboard')}>Volver</button>
          </div>
        </header>

        <section className="app-card">
          <h3 className="panel-title">Crear usuario</h3>
          <form className="admin-create-grid" onSubmit={handleSubmit(createUser)} noValidate>
            <div className="admin-col-name">
              <label className="app-label">Nombre</label>
              <input className="app-input w-full" placeholder="Nombre"
                {...register('name', { required: 'Obligatorio', minLength: { value: 2, message: 'Minimo 2 caracteres' } })} />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div className="admin-col-email">
              <label className="app-label">Email</label>
              <input className="app-input w-full" placeholder="Email"
                {...register('email', { required: 'Obligatorio', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email invalido' } })} />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div className="admin-col-password">
              <label className="app-label">Password</label>
              <div className="admin-password-wrap">
                <input className="app-input w-full" type={showPassword ? 'text' : 'password'} placeholder="Minimo 8 caracteres"
                  {...register('password', { required: 'Obligatorio', minLength: { value: 8, message: 'Minimo 8 caracteres' } })} />
                <button type="button" className="topbar-btn topbar-btn--ghost" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
            </div>
            <div className="admin-col-role">
              <label className="app-label">Rol</label>
              <select className="app-input admin-select w-full" {...register('role')}>
                <option value="USER">Usuario</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="admin-col-save">
              <button className="app-btn app-btn-primary admin-save-btn" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        </section>

        <section className="app-card">
          <div className="admin-table-top">
            <h3 className="panel-title mb-0">Listado de usuarios</h3>
            <div className="users-toolbar">
              <input className="app-input" placeholder="Buscar usuarios..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <select className="users-toolbar-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table admin-users-table">
              <thead>
                <tr>
                  <th><button type="button" className="admin-th-sort" onClick={() => toggleSort('name')}>Nombre</button></th>
                  <th><button type="button" className="admin-th-sort" onClick={() => toggleSort('email')}>Email</button></th>
                  <th><button type="button" className="admin-th-sort" onClick={() => toggleSort('role')}>Rol</button></th>
                  <th><button type="button" className="admin-th-sort" onClick={() => toggleSort('createdAt')}>Creado</button></th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listLoading && <tr><td colSpan={5} className="app-muted text-center py-6">Cargando...</td></tr>}
                {!listLoading && paginatedUsers.length === 0 && <tr><td colSpan={5} className="app-muted text-center py-6">{query ? 'Sin resultados' : 'No hay usuarios'}</td></tr>}
                {!listLoading && paginatedUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-avatar">{initials(u.name)}</span>
                        <div>
                          <p className="font-semibold">{u.name}</p>
                          <p className="text-xs app-muted">{roleLabel(u.role)}</p>
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td><span className={'admin-badge ' + (u.role === 'ADMIN' ? 'admin-badge--admin' : '')}>{roleLabel(u.role)}</span></td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
                    <td>
                      <div className="admin-actions-group">
                        <button className="admin-action-btn admin-action-edit" type="button" onClick={() => { setEditError(''); setEditingUser(u); }}>Editar</button>
                        <button className="admin-action-btn admin-action-delete" type="button" onClick={() => deleteUser(u.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-users-footer">
            <div className="admin-users-pagination">
              <button className="topbar-btn topbar-btn--ghost" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>←</button>
              <p className="app-muted text-sm">{total === 0 ? '0 - 0 de 0' : (startIndex + 1) + ' - ' + endIndex + ' de ' + total}</p>
              <button className="topbar-btn topbar-btn--ghost" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>→</button>
            </div>
          </div>
        </section>
      </main>

      <UserEditModal
        open={Boolean(editingUser)}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={updateUser}
        saving={editLoading}
        error={editError}
      />
    </div>
  );
}
