import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

function toLocalInputValue(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function AppointmentModal({ open, onClose, clients, appointment, onSave, onCreateReminder, onCancelAppointment, onReactivate, error }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { clientId: '', title: '', startTime: '', duration: 60 }
  });
  const [localError, setLocalError] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const isCancelled = appointment?.status === 'CANCELLED';

  const minStartTime = useMemo(() => toLocalInputValue(new Date(Date.now() + 60 * 1000)), [open]);

  useEffect(() => {
    setLocalError('');
    if (!appointment) {
      reset({ clientId: clients[0]?.id || '', title: '', startTime: '', duration: 60 });
      return;
    }
    const duration = Math.round((new Date(appointment.endTime) - new Date(appointment.startTime)) / 60000);
    reset({
      clientId: appointment.clientId,
      title: appointment.title || '',
      startTime: toLocalInputValue(appointment.startTime),
      duration
    });
  }, [appointment, clients, reset]);

  if (!open) return null;

  function submit(values) {
    setLocalError('');
    const start = new Date(values.startTime);
    const end = new Date(start.getTime() + Number(values.duration) * 60000);
    if (isCancelled) return;
    onSave({
      clientId: values.clientId,
      title: values.title,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });
  }

  function handleCreateReminder() {
    if (!reminderDate) { alert('Selecciona fecha y hora para el recordatorio'); return; }
    onCreateReminder(appointment.id, new Date(reminderDate).toISOString());
    setReminderDate('');
  }

  const STATUS_LABELS = { PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada', COMPLETED: 'Completada' };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded shadow p-4 w-full max-w-md space-y-3">
        <h3 className="font-semibold">{appointment ? 'Editar cita' : 'Nueva cita'}</h3>
        {appointment && <p className="text-xs text-gray-500">Estado: {STATUS_LABELS[appointment.status] || appointment.status}</p>}

        <form className="space-y-3" onSubmit={handleSubmit(submit)} noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Titulo</label>
            <input className="w-full border rounded p-2" placeholder="Corte de pelo, Consulta..." disabled={isCancelled}
              {...register('title', { required: 'El titulo es obligatorio', minLength: { value: 2, message: 'Minimo 2 caracteres' } })} />
            {errors.title && <p className="text-red-600 text-sm">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <select className="w-full border rounded p-2" disabled={isCancelled} {...register('clientId', { required: 'Selecciona un cliente' })}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.clientId && <p className="text-red-600 text-sm">{errors.clientId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fecha y hora de inicio</label>
            <input className="w-full border rounded p-2" type="datetime-local" min={minStartTime} disabled={isCancelled}
              {...register('startTime', { required: 'La fecha y hora son obligatorias' })} />
            {errors.startTime && <p className="text-red-600 text-sm">{errors.startTime.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Duracion (minutos)</label>
            <input className="w-full border rounded p-2" type="number" min="15" step="15" disabled={isCancelled}
              {...register('duration', { required: true, min: { value: 15, message: 'Minimo 15 minutos' }, max: { value: 480, message: 'Maximo 480 minutos' } })} />
            {errors.duration && <p className="text-red-600 text-sm">{errors.duration.message}</p>}
          </div>

          {isCancelled && <p className="text-sm app-muted">Cita cancelada — reactiva para editar.</p>}
          {(localError || error) && <p className="text-red-600 text-sm">{localError || error}</p>}

          <div className="flex gap-2 justify-end flex-wrap">
            {appointment && !isCancelled && (
              <button type="button" className="border border-red-300 text-red-700 rounded px-3 py-2"
                onClick={() => onCancelAppointment(appointment.id)}>Cancelar cita</button>
            )}
            {isCancelled && (
              <button type="button" className="bg-emerald-600 text-white rounded px-3 py-2"
                onClick={() => onReactivate?.(appointment.id)}>Reactivar</button>
            )}
            <button type="button" className="border rounded px-3 py-2" onClick={onClose}>Cerrar</button>
            <button className="bg-blue-600 text-white rounded px-3 py-2" disabled={isCancelled}>Guardar</button>
          </div>
        </form>

        {appointment && !isCancelled && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium">Crear recordatorio</p>
            <div className="flex gap-2 flex-wrap items-center">
              <input type="datetime-local" className="border rounded p-2 text-sm flex-1"
                value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
              <button className="bg-emerald-600 text-white rounded px-3 py-2 text-sm" onClick={handleCreateReminder} type="button">
                Crear
              </button>
            </div>
            {appointment.reminders?.length > 0 && (
              <div className="text-xs text-gray-500">
                {appointment.reminders.map((r) => (
                  <p key={r.id}>{new Date(r.sendAt).toLocaleString()} {r.sentAt ? '(enviado)' : '(pendiente)'}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
