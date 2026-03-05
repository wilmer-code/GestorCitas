import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

function toLocalInputValue(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AppointmentModal({
  open,
  onClose,
  clients,
  appointment,
  onSave,
  onCreateReminder,
  error
}) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      clientId: '',
      startAt: '',
      duration: 60
    }
  });
  const [offset, setOffset] = useState(60);

  useEffect(() => {
    if (!appointment) {
      reset({ clientId: clients[0]?.id || '', startAt: '', duration: 60 });
      return;
    }

    const duration = Math.round((new Date(appointment.endAt) - new Date(appointment.startAt)) / 60000);
    reset({
      clientId: appointment.clientId,
      startAt: toLocalInputValue(appointment.startAt),
      duration
    });
  }, [appointment, clients, reset]);

  if (!open) return null;

  function submit(values) {
    const start = new Date(values.startAt);
    const end = new Date(start.getTime() + Number(values.duration) * 60000);

    onSave({
      clientId: Number(values.clientId),
      startAt: start.toISOString(),
      endAt: end.toISOString()
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded shadow p-4 w-full max-w-md space-y-3">
        <h3 className="font-semibold">{appointment ? 'Editar cita' : 'Nueva cita'}</h3>
        <form className="space-y-3" onSubmit={handleSubmit(submit)}>
          <select className="w-full border rounded p-2" {...register('clientId')}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input className="w-full border rounded p-2" type="datetime-local" {...register('startAt')} required />
          <input className="w-full border rounded p-2" type="number" min="15" step="15" {...register('duration')} required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" className="border rounded px-3 py-2" onClick={onClose}>
              Cerrar
            </button>
            <button className="bg-blue-600 text-white rounded px-3 py-2">Guardar</button>
          </div>
        </form>

        {appointment && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium">Crear recordatorio</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                className="border rounded p-2 w-32"
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
              />
              <button
                className="bg-emerald-600 text-white rounded px-3 py-2"
                onClick={() => onCreateReminder(appointment.id, offset)}
                type="button"
              >
                Crear (-min)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
