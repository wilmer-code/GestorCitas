import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import '@fullcalendar/daygrid/index.css';
import '@fullcalendar/timegrid/index.css';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import AppointmentModal from '../components/AppointmentModal';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  async function loadClients(query = '') {
    const data = await api(`/clients${query ? `?q=${encodeURIComponent(query)}` : ''}`, { token });
    setClients(data);
  }

  async function loadAppointments() {
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString();
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const params = new URLSearchParams({ start, end });
    if (filterClientId) params.set('clientId', filterClientId);
    if (filterStatus) params.set('status', filterStatus);

    const data = await api(`/appointments?${params.toString()}`, { token });
    setAppointments(data);
  }

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filterClientId, filterStatus]);

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

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="bg-white rounded shadow p-4 flex flex-wrap gap-2 justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">GestorCitas</h1>
          <p className="text-sm text-slate-600">
            {user.name} ({user.role})
          </p>
        </div>
        <div className="flex gap-2">
          {user.role === 'admin' && (
            <button className="border rounded px-3 py-2" onClick={() => navigate('/admin/users')}>
              Admin usuarios
            </button>
          )}
          <button className="bg-slate-900 text-white rounded px-3 py-2" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white rounded shadow p-3">
          <div className="flex justify-between items-end mb-2 gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold">Calendario</h2>
              <div className="flex gap-2 mt-2 flex-wrap">
                <div>
                  <label htmlFor="filterClient" className="block text-xs text-slate-600 mb-1">
                    Filtro cliente
                  </label>
                  <select
                    id="filterClient"
                    className="border rounded p-2 text-sm"
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
                </div>
                <div>
                  <label htmlFor="filterStatus" className="block text-xs text-slate-600 mb-1">
                    Filtro estado
                  </label>
                  <select
                    id="filterStatus"
                    className="border rounded p-2 text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="scheduled">Pendiente</option>
                    <option value="completed">Realizada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              </div>
            </div>
            <button
              className="bg-blue-600 text-white rounded px-3 py-2"
              onClick={() => {
                setEditing(null);
                setError('');
                setModalOpen(true);
              }}
            >
              Nueva cita
            </button>
          </div>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            locale="es"
            dateClick={(arg) => setSelectedDate(arg.date)}
            eventClick={(arg) => {
              const found = appointments.find((x) => x.id === Number(arg.event.id));
              setEditing(found || null);
              setError('');
              setModalOpen(true);
            }}
            datesSet={(arg) => setSelectedDate(arg.start)}
            height="auto"
          />
        </section>

        <aside className="space-y-4">
          <section className="bg-white rounded shadow p-3">
            <h3 className="font-semibold mb-2">Agenda del día</h3>
            <div className="space-y-2">
              {dayAgenda.map((a) => (
                <div key={a.id} className="border rounded p-2">
                  <p className="font-medium">{a.client.name}</p>
                  <p className="text-sm text-slate-600">
                    {new Date(a.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(a.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-slate-500">Estado: {a.status}</p>
                  <button
                    className="text-sm text-blue-700 mt-1"
                    onClick={() => {
                      setEditing(a);
                      setModalOpen(true);
                    }}
                  >
                    Editar / Recordatorio
                  </button>
                </div>
              ))}
              {dayAgenda.length === 0 && <p className="text-sm text-slate-500">Sin citas este día.</p>}
            </div>
          </section>

          <section className="bg-white rounded shadow p-3">
            <h3 className="font-semibold mb-2">Clientes</h3>
            <div className="flex gap-2 mb-2">
              <label htmlFor="searchClients" className="sr-only">
                Buscar clientes
              </label>
              <input
                id="searchClients"
                className="border rounded p-2 flex-1"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="border rounded px-3" onClick={() => loadClients(search)}>
                Buscar
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <label htmlFor="newClient" className="sr-only">
                Nuevo cliente
              </label>
              <input
                id="newClient"
                className="border rounded p-2 flex-1"
                placeholder="Nuevo cliente"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <button className="bg-emerald-600 text-white rounded px-3" onClick={createClient}>
                +
              </button>
            </div>
            <ul className="max-h-64 overflow-auto space-y-1 text-sm">
              {clients.map((c) => (
                <li key={c.id} className="border rounded p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span>{c.name}</span>
                    <div className="flex gap-2">
                      <button className="text-blue-700" onClick={() => editClient(c)}>
                        Editar
                      </button>
                      <button className="text-red-600" onClick={() => deleteClient(c)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

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
        error={error}
      />
    </div>
  );
}
