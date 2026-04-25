import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import AppointmentModal from '../components/AppointmentModal';

const THEME_KEY = 'theme';
const STATUS_LABELS = { PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada', COMPLETED: 'Completada' };

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
  const [viewTitle, setViewTitle] = useState('');
  const [weekMode, setWeekMode] = useState('fullweek');
  const [weekMenuOpen, setWeekMenuOpen] = useState(false);
  const [splitMenuOpen, setSplitMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'light');
  const calendarRef = useRef(null);
  const weekMenuRef = useRef(null);
  const splitMenuRef = useRef(null);

  async function loadClients(query) {
    try {
      const q = query || '';
      const url = q ? '/clients?q=' + encodeURIComponent(q) : '/clients';
      const data = await api(url, { token });
      setClients(data);
      if (!selectedClientId && data[0]?.id) setSelectedClientId(data[0].id);
    } catch (e) { console.error('Error cargando clientes', e.message); }
  }

  async function loadAppointments() {
    try {
      const fallbackStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const fallbackEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);
      const start = (visibleRange?.start || fallbackStart).toISOString();
      const end = visibleRange?.end ? new Date(visibleRange.end.getTime() - 1).toISOString() : fallbackEnd.toISOString();
      const params = new URLSearchParams({ start, end });
      if (filterClientId) params.set('clientId', filterClientId);
      if (filterStatus) params.set('status', filterStatus);
      const data = await api('/appointments?' + params.toString(), { token });
      setAppointments(data);
    } catch (e) { console.error('Error cargando citas', e.message); }
  }

  useEffect(() => { loadClients(); }, []);
  useEffect(() => { loadAppointments(); }, [visibleRange, filterClientId, filterStatus]);
  useEffect(() => { loadNotes(selectedClientId); }, [selectedClientId]);


  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const allowed = ['clientes', 'citas', 'seguimiento', 'recordatorios'];
    const stored = (localStorage.getItem('dashboard_tab') || '').toLowerCase();
    setActiveModule(allowed.includes(stored) ? stored : 'citas');
  }, []);

  useEffect(() => {
    const map = { clientes: 'Clientes', citas: 'Citas', seguimiento: 'Seguimiento', recordatorios: 'Recordatorios' };
    setTabActive(map[activeModule] || 'Citas');
    localStorage.setItem('dashboard_tab', activeModule);
  }, [activeModule]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (weekMenuOpen && weekMenuRef.current && !weekMenuRef.current.contains(e.target)) setWeekMenuOpen(false);
      if (splitMenuOpen && splitMenuRef.current && !splitMenuRef.current.contains(e.target)) setSplitMenuOpen(false);
    }
    function handleEsc(e) { if (e.key === 'Escape') { setWeekMenuOpen(false); setSplitMenuOpen(false); } }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleEsc); };
  }, [weekMenuOpen, splitMenuOpen]);

  const dayAgenda = useMemo(() =>
    appointments.filter((a) => sameDay(new Date(a.startTime), selectedDate))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [appointments, selectedDate]
  );

  const events = appointments.map((a) => ({
    id: String(a.id),
    title: (a.client?.name || 'Cliente') + (a.status === 'CANCELLED' ? ' (cancelada)' : ''),
    start: a.startTime,
    end: a.endTime,
    color: a.status === 'CANCELLED' ? '#ef4444' : a.status === 'COMPLETED' ? '#22c55e' : '#3b82f6'
  }));

  function syncViewTitle() {
    const calApi = calendarRef.current?.getApi();
    if (calApi) setViewTitle(calApi.view.title || '');
  }

  function changeCalendarView(viewName) {
    setCalendarView(viewName);
    const calApi = calendarRef.current?.getApi();
    if (calApi) { calApi.changeView(viewName); syncViewTitle(); }
  }

  function navigateCalendar(action) {
    const calApi = calendarRef.current?.getApi();
    if (!calApi) return;
    if (action === 'today') calApi.today();
    if (action === 'prev') calApi.prev();
    if (action === 'next') calApi.next();
    syncViewTitle();
  }

  function selectWeekMode(mode) {
    const calApi = calendarRef.current?.getApi();
    if (!calApi) return;
    calApi.setOption('weekends', mode === 'fullweek');
    calApi.changeView('timeGridWeek');
    setWeekMode(mode);
    setCalendarView('timeGridWeek');
    setWeekMenuOpen(false);
  }

  async function saveAppointment(payload) {
    setError('');
    try {
      if (editing) {
        await api('/appointments/' + editing.id, { method: 'PUT', token, body: payload });
      } else {
        await api('/appointments', { method: 'POST', token, body: payload });
      }
      await loadAppointments();
      setModalOpen(false);
      setEditing(null);
    } catch (e) { setError(e.message); }
  }

  async function cancelAppointment(appointmentId) {
    if (!window.confirm('Cancelar esta cita?')) return;
    try {
      await api('/appointments/' + appointmentId, { method: 'PUT', token, body: { status: 'CANCELLED' } });
      await loadAppointments();
      setModalOpen(false);
      setEditing(null);
    } catch (e) { setError(e.message); }
  }

  async function reactivateAppointment(appointmentId) {
    try {
      const updated = await api('/appointments/' + appointmentId, { method: 'PUT', token, body: { status: 'PENDING' } });
      await loadAppointments();
      setEditing(updated);
    } catch (e) { setError(e.message); }
  }

  async function createReminder(appointmentId, sendAt) {
    try {
      await api('/reminders', { method: 'POST', token, body: { appointmentId, sendAt } });
      alert('Recordatorio creado');
      await loadAppointments();
    } catch (e) { alert(e.message); }
  }

  
  async function loadNotes(clientId) {
    try {
      const data = await api('/notes?clientId=' + clientId, { token });
      setNotes(data);
    } catch (e) { console.error(e.message); }
  }

  async function createNote() {
    try {
      await api('/notes', { method: 'POST', token, body: { clientId: selectedClientId, content: newNote.trim() } });
      setNewNote('');
      await loadNotes(selectedClientId);
    } catch (e) { alert(e.message); }
  }

  async function deleteNote(noteId) {
    await api('/notes/' + noteId, { method: 'DELETE', token });
    await loadNotes(selectedClientId);
  }

  async function createClient() {
    if (!newClientName.trim()) return;
    try {
      await api('/clients', { method: 'POST', token, body: { name: newClientName.trim() } });
      setNewClientName('');
      loadClients(search);
    } catch (e) { alert(e.message); }
  }

  async function editClient(client) {
    const nextName = window.prompt('Nuevo nombre del cliente', client.name);
    if (!nextName?.trim()) return;
    await api('/clients/' + client.id, { method: 'PUT', token, body: { name: nextName.trim() } });
    await loadClients(search);
  }

  async function deleteClient(client) {
    if (!window.confirm('Eliminar cliente ' + client.name + '?')) return;
    await api('/clients/' + client.id, { method: 'DELETE', token });
    await loadClients(search);
    await loadAppointments();
  }

  const filteredAppointments = useMemo(() => {
    if (tabActive === 'Seguimiento') return appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED');
    if (tabActive === 'Recordatorios') return appointments.filter((a) => a.reminders?.length > 0);
    return appointments;
  }, [appointments, tabActive]);

  const filteredEvents = useMemo(() => {
    if (tabActive === 'Citas' || tabActive === 'Clientes') return events;
    const ids = new Set(filteredAppointments.map((a) => String(a.id)));
    return events.filter((e) => ids.has(e.id));
  }, [events, filteredAppointments, tabActive]);

  const filteredDayAgenda = useMemo(() => {
    if (tabActive === 'Clientes') {
      if (!selectedClientId) return [];
      return dayAgenda.filter((a) => a.clientId === selectedClientId);
    }
    if (tabActive === 'Citas') return dayAgenda;
    const ids = new Set(filteredAppointments.map((a) => String(a.id)));
    return dayAgenda.filter((a) => ids.has(String(a.id)));
  }, [dayAgenda, filteredAppointments, selectedClientId, tabActive]);

  const tenantName = user?.tenant?.name || localStorage.getItem('tenantSlug') || '';

  return (
    <div className="app-shell">
      <div className="mock-window">
        <header className="mock-window-bar app-topbar">
          <div>
            <h1 className="app-title">Citio</h1>
            <p className="app-subtitle">{user?.name} — {tenantName}</p>
          </div>
          <div className="app-topbar-actions">
            {user?.role === 'ADMIN' && (
              <button className="topbar-btn topbar-btn--ghost" onClick={() => navigate('/admin/users')}>Admin usuarios</button>
            )}
            <div className="topbar-group">
              <button className={'topbar-btn ' + (theme === 'light' ? 'topbar-btn--active' : 'topbar-btn--ghost')} onClick={() => setTheme('light')}>Claro</button>
              <button className={'topbar-btn ' + (theme === 'dark' ? 'topbar-btn--active' : 'topbar-btn--ghost')} onClick={() => setTheme('dark')}>Oscuro</button>
              <button className="topbar-btn topbar-btn--ghost" onClick={logout}>Salir</button>
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
                    <button key={tab} className={'mock-tab ' + (tabActive === tab ? 'mock-tab--active' : '')}
                      onClick={() => setActiveModule(tab.toLowerCase())} type="button">{tab}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mock-filters">
              <label htmlFor="filterClient" className="inline-label">Filtro cliente:</label>
              <select id="filterClient" className="mock-select" value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)}>
                <option value="">Todos</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label htmlFor="filterStatus" className="inline-label">Estado:</label>
              <select id="filterStatus" className="mock-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="CONFIRMED">Confirmada</option>
                <option value="COMPLETED">Completada</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>

            <div className="mock-toolbar">
              <div className="mock-btnbar">
                <button className="mock-btn" onClick={() => navigateCalendar('today')}>Hoy</button>
                <button className={'mock-btn ' + (calendarView === 'dayGridMonth' ? 'mock-btn--active' : '')} onClick={() => changeCalendarView('dayGridMonth')}>Mes</button>
                <div className="relative" ref={weekMenuRef}>
                  <button className={'mock-btn ' + (calendarView === 'timeGridWeek' ? 'mock-btn--active' : '')} onClick={() => setWeekMenuOpen((v) => !v)}>
                    Semana <span className="split-caret split-caret--sm" />
                  </button>
                  {weekMenuOpen && (
                    <div className="absolute top-[44px] left-0 z-30 min-w-[210px] rounded-md border bg-white shadow-lg p-1">
                      <button className={'w-full text-left px-3 py-2 rounded text-sm ' + (weekMode === 'workweek' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100')} onClick={() => selectWeekMode('workweek')} type="button">Semana laboral (L-V)</button>
                      <button className={'w-full text-left px-3 py-2 rounded text-sm ' + (weekMode === 'fullweek' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100')} onClick={() => selectWeekMode('fullweek')} type="button">Semana completa (L-D)</button>
                    </div>
                  )}
                </div>
                <button className={'mock-btn ' + (calendarView === 'timeGridDay' ? 'mock-btn--active' : '')} onClick={() => changeCalendarView('timeGridDay')}>Dia</button>
              </div>
              <div className="calendar-title-center">{viewTitle}</div>
              <div className="right-toolbar">
                <div className="split" ref={splitMenuRef}>
                  <button type="button" className="split-left" onClick={() => { navigateCalendar('today'); setSplitMenuOpen(false); }}>Hoy</button>
                  <button type="button" className="split-right" onClick={(e) => { e.stopPropagation(); setSplitMenuOpen((v) => !v); }}>
                    Mes <span className="split-caret" />
                  </button>
                  {splitMenuOpen && (
                    <div className="split-menu" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="split-menu-item" onClick={() => { navigateCalendar('prev'); setSplitMenuOpen(false); }}>Anterior</button>
                      <button type="button" className="split-menu-item" onClick={() => { navigateCalendar('next'); setSplitMenuOpen(false); }}>Siguiente</button>
                    </div>
                  )}
                </div>
                <button type="button" className="btn-new" onClick={() => { setEditing(null); setError(''); setModalOpen(true); }}>Nueva cita</button>
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
                  allDayText="Todo el dia"
                  slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                  dateClick={(arg) => setSelectedDate(arg.date)}
                  eventClick={(arg) => {
                    const found = appointments.find((x) => x.id === arg.event.id);
                    setEditing(found || null);
                    setError('');
                    setModalOpen(true);
                  }}
                  datesSet={(arg) => {
                    setVisibleRange({ start: arg.start, end: arg.end });
                    setCalendarView(arg.view.type);
                    syncViewTitle();
                  }}
                  height="auto"
                />
              </div>

              <aside className="calendar-right">
                <section className="inner-panel">
                  <h3 className="panel-title">
                    {tabActive === 'Seguimiento' ? 'Seguimiento del dia' : tabActive === 'Recordatorios' ? 'Recordatorios' : tabActive === 'Clientes' ? 'Agenda del cliente' : 'Agenda del dia'}
                  </h3>
                  <div className="space-y-2">
                    {filteredDayAgenda.length === 0 && <p className="text-sm app-muted">Sin citas este dia.</p>}
                    {filteredDayAgenda.map((a) => (
                      <div key={a.id} className="app-list-item">
                        <p className="font-medium">{a.client?.name || 'Cliente'}</p>
                        <p className="text-sm app-muted">
                          {new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(a.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs app-muted">{a.title} — {STATUS_LABELS[a.status] || a.status}</p>
                        <button className="text-sm text-blue-600 mt-1" onClick={() => { setEditing(a); setModalOpen(true); }}>Editar</button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="inner-panel clients-panel">
                  <h3 className="panel-title">Clientes</h3>
                  <div className="clients-search-row">
                    <input className="app-input flex-1 min-w-0" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <button className="app-btn app-btn-ghost clients-search-btn" onClick={() => loadClients(search)}>Buscar</button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input className="app-input flex-1" placeholder="Nuevo cliente" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                    <button className="app-btn app-btn-primary" onClick={createClient}>+</button>
                  </div>
                  <ul className="max-h-64 overflow-auto space-y-1 text-sm">
                    {clients.map((c) => {
                      const isSelected = selectedClientId === c.id;
                      return (
                        <li key={c.id} className={'client-item cursor-pointer ' + (isSelected ? 'client-item--active' : '')} onClick={() => setSelectedClientId(c.id)}>
                          <div className="client-row">
                            <div className="client-name">{c.name}</div>
                            <div className="client-right">
                              <button className="client-edit" onClick={(e) => { e.stopPropagation(); editClient(c); }}>Editar</button>
                              <button className="client-delete" onClick={(e) => { e.stopPropagation(); deleteClient(c); }}>Eliminar</button>
                              {isSelected && <span className="client-check">✓</span>}
                            </div>
                          </div>
                          {c.tags?.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {c.tags.map((t) => <span key={t} className="text-xs bg-blue-100 text-blue-700 px-1 rounded">{t}</span>)}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="inner-panel">
                  <h3 className="panel-title">Notas</h3>
                  <p className="text-xs app-muted mb-2">
                    Cliente: {clients.find((c) => c.id === selectedClientId)?.name || 'Ninguno'}
                  </p>
                  <textarea
                    className="app-input w-full mb-2"
                    rows="3"
                    placeholder={selectedClientId ? 'Escribe una nota...' : 'Selecciona un cliente'}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                    Guardar nota
                  </button>
                  <div className="space-y-2 max-h-56 overflow-auto">
                    {notes.map((note) => (
                      <div key={note.id} className="app-list-item text-sm">
                        <p>{note.content}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs app-muted">{new Date(note.createdAt).toLocaleString()}</span>
                          <button className="text-red-600 text-xs" onClick={() => deleteNote(note.id)}>Eliminar</button>
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
          onClose={() => { setModalOpen(false); setEditing(null); }}
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
