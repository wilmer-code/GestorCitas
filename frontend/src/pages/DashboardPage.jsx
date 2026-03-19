import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import AppointmentModal from '../components/AppointmentModal';

const THEME_KEY = 'theme';

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DashboardPage({ navigate }) {
  const { user, token, logout } = useAuth();
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleRange, setVisibleRange] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [tabActive, setTabActive] = useState('Citas');
  const [activeModule, setActiveModule] = useState('citas');
  const [viewSelect, setViewSelect] = useState('dayGridMonth');
  const [viewTitle, setViewTitle] = useState('');
  const [weekMode, setWeekMode] = useState('fullweek');
  const [weekMenuOpen, setWeekMenuOpen] = useState(false);
  const [splitMenuOpen, setSplitMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'light');
  const calendarRef = useRef(null);
  const weekMenuRef = useRef(null);
  const splitMenuRef = useRef(null);

  async function loadClients(query = '') {
    const data = await api(`/clients${query ? `?q=${encodeURIComponent(query)}` : ''}`, { token });
    setClients(data);

    if (!selectedClientId && data[0]?.id) {
      setSelectedClientId(String(data[0].id));
    }

    if (selectedClientId && !data.some((c) => String(c.id) === String(selectedClientId))) {
      setSelectedClientId(data[0]?.id ? String(data[0].id) : '');
    }
  }

  async function loadAppointments() {
    const fallbackStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const fallbackEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const start = (visibleRange?.start || fallbackStart).toISOString();
    const end = visibleRange?.end
      ? new Date(visibleRange.end.getTime() - 1).toISOString()
      : fallbackEnd.toISOString();

    const params = new URLSearchParams({ start, end });
    if (filterClientId) params.set('clientId', filterClientId);
    if (filterStatus) params.set('status', filterStatus);

    const data = await api(`/appointments?${params.toString()}`, { token });
    setAppointments(data);
  }

  async function loadNotes(clientId) {
    if (!clientId) {
      setNotes([]);
      return;
    }

    const data = await api(`/notes?clientId=${clientId}`, { token });
    setNotes(data);
  }

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRange, filterClientId, filterStatus]);

  useEffect(() => {
    loadNotes(selectedClientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  useEffect(() => {
    const body = document.body;
    localStorage.setItem(THEME_KEY, theme);
    body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTab = (params.get('tab') || '').toLowerCase();
    const stored = (localStorage.getItem('dashboard_tab') || '').toLowerCase();
    const allowed = ['clientes', 'citas', 'seguimiento', 'recordatorios'];
    const initial = allowed.includes(queryTab) ? queryTab : allowed.includes(stored) ? stored : 'citas';
    setActiveModule(initial);
  }, []);

  useEffect(() => {
    const map = {
      clientes: 'Clientes',
      citas: 'Citas',
      seguimiento: 'Seguimiento',
      recordatorios: 'Recordatorios'
    };
    const nextTab = map[activeModule] || 'Citas';
    setTabActive(nextTab);
    localStorage.setItem('dashboard_tab', activeModule);
  }, [activeModule]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (weekMenuOpen && weekMenuRef.current && !weekMenuRef.current.contains(event.target)) {
        setWeekMenuOpen(false);
      }

      if (splitMenuOpen && splitMenuRef.current && !splitMenuRef.current.contains(event.target)) {
        setSplitMenuOpen(false);
      }
    }

    function handleEsc(event) {
      if (event.key === 'Escape') {
        setWeekMenuOpen(false);
        setSplitMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [weekMenuOpen, splitMenuOpen]);

  const dayAgenda = useMemo(
    () =>
      appointments
        .filter((a) => sameDay(new Date(a.startAt), selectedDate))
        .sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
    [appointments, selectedDate]
  );

  const events = appointments.map((a) => ({
    id: String(a.id),
    title: `${a.client.name}${a.status === 'cancelled' ? ' (cancelada)' : ''}`,
    start: a.startAt,
    end: a.endAt
  }));

  function syncViewTitle() {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;
    setViewTitle(calendarApi.view.title || '');
  }

  function changeCalendarView(viewName) {
    setCalendarView(viewName);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(viewName);
      syncViewTitle();
    }
  }

  function navigateCalendar(action) {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;
    if (action === 'today') calendarApi.today();
    if (action === 'prev') calendarApi.prev();
    if (action === 'next') calendarApi.next();
    syncViewTitle();
  }

  function selectWeekMode(mode) {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    const showWeekends = mode === 'fullweek';
    calendarApi.setOption('weekends', showWeekends);
    calendarApi.changeView('timeGridWeek');

    setWeekMode(mode);
    setCalendarView('timeGridWeek');
    setViewSelect('timeGridWeek');
    setWeekMenuOpen(false);
  }



  async function saveAppointment(payload) {
    setError('');
    try {
      if (editing) {
        await api(`/appointments/${editing.id}`, { method: 'PUT', token, body: payload });
      } else {
        await api('/appointments', { method: 'POST', token, body: payload });
      }
      await loadAppointments();
      setModalOpen(false);
      setEditing(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function cancelAppointment(appointmentId) {
    if (!window.confirm('¿Cancelar esta cita?')) return;

    try {
      await api(`/appointments/${appointmentId}`, {
        method: 'PUT',
        token,
        body: { status: 'cancelled' }
      });
      await loadAppointments();
      setModalOpen(false);
      setEditing(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function createReminder(appointmentId, offsetMinutes) {
    try {
      await api('/reminders', {
        method: 'POST',
        token,
        body: { appointmentId, offsetMinutes: Number(offsetMinutes) }
      });
      alert('Recordatorio creado');
      await loadAppointments();
    } catch (e) {
      alert(e.message);
    }
  }

  async function reactivateAppointment(appointmentId) {
    setError('');
    try {
      const updated = await api(`/appointments/${appointmentId}`, {
        method: 'PUT',
        token,
        body: { status: 'scheduled' }
      });

      await loadAppointments();
      setEditing(updated);
    } catch (e) {
      setError(e.message);
    }
  }

  async function createClient() {
    if (!newClientName.trim()) return;
    await api('/clients', { method: 'POST', token, body: { name: newClientName.trim() } });
    setNewClientName('');
    loadClients(search);
  }

  async function editClient(client) {
    const nextName = window.prompt('Nuevo nombre del cliente', client.name);
    if (!nextName || !nextName.trim()) return;

    await api(`/clients/${client.id}`, {
      method: 'PUT',
      token,
      body: { name: nextName.trim() }
    });

    await loadClients(search);
    await loadAppointments();
  }

  async function deleteClient(client) {
    if (!window.confirm(`¿Eliminar cliente ${client.name}?`)) return;

    await api(`/clients/${client.id}`, {
      method: 'DELETE',
      token
    });

    await loadClients(search);
    await loadAppointments();
  }

  async function createNote() {
    if (!selectedClientId || !newNote.trim()) return;

    await api('/notes', {
      method: 'POST',
      token,
      body: {
        clientId: Number(selectedClientId),
        content: newNote.trim()
      }
    });

    setNewNote('');
    await loadNotes(selectedClientId);
  }

  async function deleteNote(noteId) {
    await api(`/notes/${noteId}`, {
      method: 'DELETE',
      token
    });

    await loadNotes(selectedClientId);
  }

  const filteredAppointments = useMemo(() => {
    if (tabActive === 'Citas' || tabActive === 'Clientes') return appointments;

    if (tabActive === 'Seguimiento') {
      return appointments.filter((a) => a.status === 'scheduled' || a.status === 'pending');
    }

    if (tabActive === 'Recordatorios') {
      const hasReminderField = appointments.some((a) => a.reminderAt || a.hasReminder || a.reminderId || a.reminder);
      if (hasReminderField) {
        return appointments.filter((a) => a.reminderAt || a.hasReminder || a.reminderId || a.reminder);
      }
      const now = new Date();
      return appointments.filter((a) => new Date(a.startAt) >= now);
    }

    return appointments;
  }, [appointments, tabActive]);

  const filteredEvents = useMemo(() => {
    if (tabActive === 'Citas' || tabActive === 'Clientes') return events;

    const filteredIds = new Set(filteredAppointments.map((a) => String(a.id)));
    return events.filter((e) => filteredIds.has(String(e.id)));
  }, [events, filteredAppointments, tabActive]);

  const filteredDayAgenda = useMemo(() => {
    if (tabActive === 'Clientes') {
      if (!selectedClientId) return [];
      return dayAgenda.filter((a) => String(a.client?.id) === String(selectedClientId));
    }

    if (tabActive === 'Citas') return dayAgenda;

    const filteredIds = new Set(filteredAppointments.map((a) => String(a.id)));
    return dayAgenda.filter((a) => filteredIds.has(String(a.id)));
  }, [dayAgenda, filteredAppointments, selectedClientId, tabActive]);

  return (
    <div className="app-shell">
      <div className="mock-window">
      <header className="mock-window-bar app-topbar">
        <div>
          <h1 className="app-title">GestorCitas</h1>
          <p className="app-subtitle">{user.name}</p>
        </div>
        <div className="app-topbar-actions">
          {user.role === 'admin' && (
            <button className="topbar-btn topbar-btn--ghost" onClick={() => navigate('/admin/users')}>
              Admin usuarios
            </button>
          )}
          <div className="topbar-group" role="tablist" aria-label="Tema">
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
            <button className="topbar-btn topbar-btn--ghost" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <section className="app-card">
          <div className="mock-calendar-shell">
            <div className="calendar-header">
              <div>
                <h2 className="calendar-title">Calendario</h2>
                <div className="mock-tabs">
                  {['Clientes', 'Citas', 'Seguimiento', 'Recordatorios'].map((tab) => (
                    <button
                      key={tab}
                      className={`mock-tab ${tabActive === tab ? 'mock-tab--active' : ''}`}
                      onClick={() => setActiveModule(tab.toLowerCase())}
                      type="button"
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mock-filters">
              <label htmlFor="filterClient" className="inline-label">
                Filtro cliente:
              </label>
              <select
                id="filterClient"
                className="mock-select"
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
              >
                <option value="">Todos</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>

              <label htmlFor="filterStatus" className="inline-label">
                Estado:
              </label>
              <select
                id="filterStatus"
                className="mock-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="scheduled">Pendiente</option>
                <option value="completed">Realizada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            <div className="mock-toolbar">
              <div className="mock-btnbar">
                <button
                  className="mock-btn"
                  onClick={() => {
                    navigateCalendar('today');
                    setWeekMenuOpen(false);
                    setSplitMenuOpen(false);
                  }}
                >
                  Hoy
                </button>
                <button
                  className={`mock-btn ${calendarView === 'dayGridMonth' ? 'mock-btn--active' : ''}`}
                  onClick={() => changeCalendarView('dayGridMonth')}
                >
                  Mes
                </button>
                <div className="relative" ref={weekMenuRef}>
                  <button
                    className={`mock-btn ${calendarView === 'timeGridWeek' ? 'mock-btn--active' : ''}`}
                    onClick={() => setWeekMenuOpen((v) => !v)}
                  >
                    Semana <span className="split-caret split-caret--sm" />
                  </button>

                  {weekMenuOpen && (
                    <div
                      className="absolute top-[44px] left-0 z-30 min-w-[210px] rounded-md border bg-white shadow-lg p-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className={`w-full text-left px-3 py-2 rounded text-sm ${weekMode === 'workweek' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100'}`}
                        onClick={() => selectWeekMode('workweek')}
                        type="button"
                      >
                        Semana laboral (L–V)
                      </button>
                      <button
                        className={`w-full text-left px-3 py-2 rounded text-sm ${weekMode === 'fullweek' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100'}`}
                        onClick={() => selectWeekMode('fullweek')}
                        type="button"
                      >
                        Semana completa (L–D)
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className={`mock-btn ${calendarView === 'timeGridDay' ? 'mock-btn--active' : ''}`}
                  onClick={() => changeCalendarView('timeGridDay')}
                >
                  Día
                </button>
              </div>

              <div className="calendar-title-center">{viewTitle}</div>

              <div className="right-toolbar">
                <div className="split" ref={splitMenuRef}>
                  <button
                    type="button"
                    className="split-left"
                    onClick={() => {
                      navigateCalendar('today');
                      setSplitMenuOpen(false);
                      setWeekMenuOpen(false);
                    }}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    className="split-right"
                    aria-haspopup="menu"
                    aria-expanded={splitMenuOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSplitMenuOpen((v) => !v);
                    }}
                  >
                    Mes <span className="split-caret" />
                  </button>

                  {splitMenuOpen && (
                    <div className="split-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="split-menu-item"
                        onClick={() => {
                          navigateCalendar('prev');
                          setSplitMenuOpen(false);
                        }}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        className="split-menu-item"
                        onClick={() => {
                          navigateCalendar('next');
                          setSplitMenuOpen(false);
                        }}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-new"
                  onClick={() => {
                    setEditing(null);
                    setError('');
                    setModalOpen(true);
                  }}
                >
                  Nueva cita
                </button>
              </div>
            </div>

            <div className="calendar-layout">
            <div className="calendar-left">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={calendarView}
                headerToolbar={false}
                events={filteredEvents}
                locale="es"
                allDayText="Todo el día"
                slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                dateClick={(arg) => setSelectedDate(arg.date)}
                eventClick={(arg) => {
                  const found = filteredAppointments.find((x) => x.id === Number(arg.event.id));
                  setEditing(found || null);
                  setError('');
                  setModalOpen(true);
                }}
                datesSet={(arg) => {
                  setVisibleRange({ start: arg.start, end: arg.end });
                  setCalendarView(arg.view.type);
                  setViewSelect(arg.view.type);
                  syncViewTitle();
                }}
                height="auto"
              />
            </div>

            <aside className="calendar-right">
              <section className="inner-panel">
                <h3 className="panel-title">
                  {tabActive === 'Seguimiento'
                    ? 'Seguimiento del día'
                    : tabActive === 'Recordatorios'
                      ? 'Recordatorios'
                      : tabActive === 'Clientes'
                        ? 'Agenda del cliente'
                        : 'Agenda del día'}
                </h3>
                <div className="space-y-2">
                  {tabActive === 'Clientes' && !selectedClientId && (
                    <p className="text-sm app-muted">Selecciona un cliente para ver su agenda.</p>
                  )}

                  {filteredDayAgenda.map((a) => (
                    <div key={a.id} className="app-list-item">
                      <p className="font-medium">{a.client.name}</p>
                      <p className="text-sm app-muted">
                        {new Date(a.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(a.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs app-muted">Estado: {a.status}</p>
                      <button
                        className="text-sm text-blue-600 mt-1"
                        onClick={() => {
                          setEditing(a);
                          setModalOpen(true);
                        }}
                      >
                        Editar / Recordatorio
                      </button>
                    </div>
                  ))}

                  {filteredDayAgenda.length === 0 && !(tabActive === 'Clientes' && !selectedClientId) && (
                    <p className="text-sm app-muted">Sin citas este día.</p>
                  )}
                </div>
              </section>

              <section className="inner-panel clients-panel">
            <h3 className="panel-title">Clientes</h3>
            <div className="clients-search-row">
              <label htmlFor="searchClients" className="sr-only">
                Buscar clientes
              </label>
              <input
                id="searchClients"
                className="app-input flex-1 min-w-0"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="app-btn app-btn-ghost clients-search-btn" onClick={() => loadClients(search)}>
                Buscar
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <label htmlFor="newClient" className="sr-only">
                Nuevo cliente
              </label>
              <input
                id="newClient"
                className="app-input flex-1"
                placeholder="Nuevo cliente"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <button className="app-btn app-btn-primary" onClick={createClient}>
                +
              </button>
            </div>
            <ul className="max-h-64 overflow-auto space-y-1 text-sm">
              {clients.map((c) => {
                const isSelected = String(selectedClientId) === String(c.id);

                return (
                  <li
                    key={c.id}
                    className={`client-item cursor-pointer ${isSelected ? 'client-item--active' : ''}`}
                    onClick={() => setSelectedClientId(String(c.id))}
                  >
                    <div className="client-row">
                      <div className="client-name">{c.name}</div>
                      <div className="client-right">
                        <button
                          className="client-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            editClient(c);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="client-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteClient(c);
                          }}
                        >
                          Eliminar
                        </button>
                        {isSelected && (
                          <button type="button" className="client-check" aria-label="Seleccionado">
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="inner-panel">
            <h3 className="panel-title">Notas</h3>
            <p className="text-xs app-muted mb-2">
              Cliente seleccionado: {clients.find((c) => String(c.id) === String(selectedClientId))?.name || 'Ninguno'}
            </p>
            <textarea
              className="app-input w-full mb-2"
              rows="3"
              placeholder={selectedClientId ? 'Escribe una nota de seguimiento...' : 'Selecciona un cliente para agregar notas'}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={!selectedClientId}
            />
            <button className="app-btn app-btn-primary mb-3" onClick={createNote} disabled={!selectedClientId}>
              Guardar nota
            </button>
            <div className="space-y-2 max-h-56 overflow-auto">
              {notes.map((note) => (
                <div key={note.id} className="app-list-item text-sm">
                  <p>{note.content}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs app-muted">{new Date(note.createdAt).toLocaleString()}</span>
                    <button className="text-red-600 text-xs" onClick={() => deleteNote(note.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm app-muted">Sin notas.</p>}
            </div>
          </section>
            </aside>
          </div>
        </div>
      </section>

      <AppointmentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        clients={clients}
        appointment={editing}
        onSave={saveAppointment}
        onCreateReminder={createReminder}
        onCancelAppointment={cancelAppointment}
        onReactivate={reactivateAppointment}
        error={error}
      />
      </div>
    </div>
  );
}
