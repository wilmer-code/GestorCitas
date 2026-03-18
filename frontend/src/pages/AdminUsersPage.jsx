import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import UserEditModal from '../components/UserEditModal';
import { useAuth } from '../context/AuthContext';

const THEME_KEY = 'theme';

function roleLabel(role) {
  return role === 'admin' ? 'Administrador' : 'Usuario';
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function AdminUsersPage({ navigate }) {
  const { token, user, logout } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: { name: '', email: '', password: '', role: 'user' }
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

  const navItems = [
    {
      label: 'Panel',
      path: '/dashboard?tab=citas',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="admin-nav-icon">
          <path d="M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8v-9h-8v9Zm0-11h8V3h-8v7Z" />
        </svg>
      )
    },
    {
      label: 'Clientes',
      path: '/dashboard?tab=clientes',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="admin-nav-icon">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.8-3.6 4.2-5 8-5s6.2 1.4 8 5" />
        </svg>
      )
    },
    {
      label: 'Citas',
      path: '/dashboard?tab=citas',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="admin-nav-icon">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M8 2v4M16 2v4M3 9h18" />
        </svg>
      )
    },
    {
      label: 'Seguimiento',
      path: '/dashboard?tab=seguimiento',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="admin-nav-icon">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    },
    {
      label: 'Recordatorios',
      path: '/dashboard?tab=recordatorios',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="admin-nav-icon">
          <path d="M15 17H5a2 2 0 0 1-2-2c2-1.3 2-2.8 2-5a5 5 0 0 1 10 0c0 2.2 0 3.7 2 5a2 2 0 0 1-2 2Z" />
          <path d="M9.5 20a2.5 2.5 0 0 0 5 0" />
        </svg>
      )
    }
  ];

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
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, pageSize]);

  async function createUser(values) {
    setError('');
    setLoading(true);
    try {
      await api('/users', { method: 'POST', token, body: values });
      reset({ name: '', email: '', password: '', role: 'user' });
      await loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id) {
    if (!window.confirm('¿Eliminar usuario?')) return;
    await api(`/users/${id}`, { method: 'DELETE', token });
    await loadUsers();
  }

  function openEditUser(userToEdit) {
    setEditError('');
    setEditingUser(userToEdit);
  }

  function closeEditUser() {
    setEditingUser(null);
    setEditError('');
  }

  async function updateUser(values) {
    if (!editingUser) return;

    setEditLoading(true);
    setEditError('');
    try {
      await api(`/users/${editingUser.id}`, {
        method: 'PUT',
        token,
        body: values
      });
      closeEditUser();
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
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
  }, [users, query]);

  const sortedUsers = useMemo(() => {
    if (sortDir === 'none') return filteredUsers;

    const copy = [...filteredUsers];
    const factor = sortDir === 'asc' ? 1 : -1;

    copy.sort((a, b) => {
      if (sortKey === 'createdAt') {
        return (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()) * factor;
      }

      const av = String(a[sortKey] || '').toLowerCase();
      const bv = String(b[sortKey] || '').toLowerCase();
      return av.localeCompare(bv, 'es') * factor;
    });

    return copy;
  }, [filteredUsers, sortDir, sortKey]);

  const total = sortedUsers.length;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goPrev() {
    setCurrentPage((p) => Math.max(1, p - 1));
  }

  function goNext() {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function toggleSort(nextKey) {
    if (sortKey !== nextKey) {
      setSortKey(nextKey);
      setSortDir('asc');
      return;
    }

    setSortDir((prev) => {
      if (prev === 'asc') return 'desc';
      if (prev === 'desc') return 'none';
      return 'asc';
    });
  }

  function ariaSortFor(key) {
    if (sortKey !== key || sortDir === 'none') return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div>
          <h1 className="admin-brand">GestorCitas</h1>
          <nav className="admin-nav">
            {navItems.map((item) => (
              <button key={item.label} className="admin-nav-item" onClick={() => navigate(item.path)}>
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <p className="admin-section-title">ADMINISTRACIÓN</p>
          <button className="admin-nav-item admin-nav-item--active" onClick={() => navigate('/admin/users')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="admin-nav-icon">
              <path d="m12 2 7 4v6c0 5-3.8 8.7-7 10-3.2-1.3-7-5-7-10V6l7-4Z" />
            </svg>
            <span>Gestión de usuarios</span>
          </button>
        </div>

        <div className="admin-user-card">
          <div className="admin-user-top">
            <span className="admin-user-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="admin-nav-icon">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c1.8-3.6 4.2-5 8-5s6.2 1.4 8 5" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user?.name || user?.email || 'Usuario'}</p>
              <p className="text-sm app-muted">{roleLabel(user?.role)}</p>
            </div>
            <span className="admin-user-chevron" aria-hidden="true">
              ›
            </span>
          </div>

          <hr className="admin-user-sep" />

          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="admin-nav-icon">
              <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="app-card admin-main-header">
          <div>
            <h2 className="text-2xl font-bold">Admin / Usuarios</h2>
            <p className="app-muted text-sm">Gestión de usuarios del sistema.</p>
          </div>

          <div className="topbar-group">
            <button
              className={`topbar-btn ${theme === 'light' ? 'topbar-btn--active' : 'topbar-btn--ghost'}`}
              onClick={() => setTheme('light')}
            >
              Claro
            </button>
            <button
              className={`topbar-btn ${theme === 'dark' ? 'topbar-btn--active' : 'topbar-btn--ghost'}`}
              onClick={() => setTheme('dark')}
            >
              Oscuro
            </button>
            <button className="topbar-btn topbar-btn--ghost" onClick={() => navigate('/dashboard')}>
              Volver
            </button>
          </div>
        </header>

        <section className="app-card">
          <h3 className="panel-title">Crear usuario</h3>
          <form className="admin-create-grid" onSubmit={handleSubmit(createUser)} noValidate>
            <div className="admin-col-name">
              <label htmlFor="admin-name" className="app-label">
                Nombre
              </label>
              <input
                id="admin-name"
                className="app-input w-full"
                placeholder="Nombre"
                {...register('name', {
                  required: 'El nombre es obligatorio',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres' }
                })}
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div className="admin-col-email">
              <label htmlFor="admin-email" className="app-label">
                Email
              </label>
              <input
                id="admin-email"
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

            <div className="admin-col-password">
              <label htmlFor="admin-password" className="app-label">
                Password
              </label>
              <div className="admin-password-wrap">
                <input
                  id="admin-password"
                  className="app-input w-full"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  {...register('password', {
                    required: 'La contraseña es obligatoria',
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                  })}
                />
                <button
                  type="button"
                  className="topbar-btn topbar-btn--ghost"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
            </div>

            <div className="admin-col-role">
              <label htmlFor="admin-role" className="app-label">
                Rol
              </label>
              <select id="admin-role" className="app-input admin-select w-full" {...register('role')}>
                <option value="user">usuario</option>
                <option value="admin">admin</option>
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
              <input
                className="app-input"
                placeholder="Buscar usuarios..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className="users-toolbar-box">
                <span className="app-muted text-sm">Mostrar:</span>
                <select
                  className="users-toolbar-select"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="users-view-toggle" role="tablist" aria-label="Vista de usuarios">
                <button
                  type="button"
                  className={`users-view-btn ${usersView === 'table' ? 'active' : ''}`}
                  onClick={() => setUsersView('table')}
                  aria-label="Vista tabla"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`users-view-btn ${usersView === 'cards' ? 'active' : ''}`}
                  onClick={() => setUsersView('cards')}
                  aria-label="Vista tarjetas"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                    <rect x="3" y="3" width="8" height="8" rx="1.5" />
                    <rect x="13" y="3" width="8" height="8" rx="1.5" />
                    <rect x="3" y="13" width="8" height="8" rx="1.5" />
                    <rect x="13" y="13" width="8" height="8" rx="1.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {usersView === 'table' ? (
            <div className="admin-table-wrap">
              <table className="admin-table admin-users-table">
                <thead>
                  <tr>
                    <th aria-sort={ariaSortFor('name')}>
                      <button type="button" className="admin-th-sort" onClick={() => toggleSort('name')}>
                        <span>Nombre</span>
                        <span className={`admin-sort-icon admin-sort-icon--${sortKey === 'name' ? sortDir : 'none'}`} aria-hidden="true" />
                      </button>
                    </th>
                    <th aria-sort={ariaSortFor('email')}>
                      <button type="button" className="admin-th-sort" onClick={() => toggleSort('email')}>
                        <span>Email</span>
                        <span className={`admin-sort-icon admin-sort-icon--${sortKey === 'email' ? sortDir : 'none'}`} aria-hidden="true" />
                      </button>
                    </th>
                    <th aria-sort={ariaSortFor('role')}>
                      <button type="button" className="admin-th-sort" onClick={() => toggleSort('role')}>
                        <span>Rol</span>
                        <span className={`admin-sort-icon admin-sort-icon--${sortKey === 'role' ? sortDir : 'none'}`} aria-hidden="true" />
                      </button>
                    </th>
                    <th aria-sort={ariaSortFor('createdAt')}>
                      <button type="button" className="admin-th-sort" onClick={() => toggleSort('createdAt')}>
                        <span>Creado</span>
                        <span className={`admin-sort-icon admin-sort-icon--${sortKey === 'createdAt' ? sortDir : 'none'}`} aria-hidden="true" />
                      </button>
                    </th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {listLoading && (
                    <tr>
                      <td colSpan={5} className="app-muted text-center py-6">
                        Cargando...
                      </td>
                    </tr>
                  )}

                  {!listLoading && paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="app-muted text-center py-6">
                        {query ? 'Sin resultados' : 'No hay usuarios'}
                      </td>
                    </tr>
                  )}

                  {!listLoading &&
                    paginatedUsers.map((u) => (
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
                        <td>
                          <span className={`admin-badge ${u.role === 'admin' ? 'admin-badge--admin' : ''}`}>
                            {u.role === 'admin' ? 'Admin' : 'Usuario'}
                          </span>
                        </td>
                        <td>
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })
                            : '-'}
                        </td>
                        <td>
                          <div className="admin-actions-group">
                            <button className="admin-action-btn admin-action-edit" type="button" onClick={() => openEditUser(u)}>
                              Editar
                            </button>
                            <button className="admin-action-btn admin-action-delete" type="button" onClick={() => deleteUser(u.id)}>
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="users-cards-grid">
              {listLoading && <p className="app-muted">Cargando...</p>}
              {!listLoading && paginatedUsers.length === 0 && (
                <p className="app-muted">{query ? 'Sin resultados' : 'No hay usuarios'}</p>
              )}
              {!listLoading &&
                paginatedUsers.map((u) => (
                  <article key={u.id} className="users-card-item">
                    <div className="admin-user-cell">
                      <span className="admin-avatar">{initials(u.name)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{u.name}</p>
                        <p className="text-xs app-muted truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`admin-badge ${u.role === 'admin' ? 'admin-badge--admin' : ''}`}>
                        {u.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                      <span className="text-xs app-muted">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })
                          : '-'}
                      </span>
                    </div>
                    <div className="admin-actions-group mt-3">
                      <button className="admin-action-btn admin-action-edit" type="button" onClick={() => openEditUser(u)}>
                        Editar
                      </button>
                      <button className="admin-action-btn admin-action-delete" type="button" onClick={() => deleteUser(u.id)}>
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          )}

          <div className="admin-users-footer">
            <div className="admin-users-pagination">
              <button className="topbar-btn topbar-btn--ghost" onClick={goPrev} disabled={currentPage <= 1}>
                ←
              </button>
              <p className="app-muted text-sm">
                {total === 0 ? '0 - 0 de 0' : `${startIndex + 1} - ${endIndex} de ${total}`}
              </p>
              <button className="topbar-btn topbar-btn--ghost" onClick={goNext} disabled={currentPage >= totalPages}>
                →
              </button>
            </div>
          </div>
        </section>
      </main>

      <UserEditModal
        open={Boolean(editingUser)}
        user={editingUser}
        onClose={closeEditUser}
        onSave={updateUser}
        saving={editLoading}
        error={editError}
      />
    </div>
  );
}
