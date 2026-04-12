import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

function toLocalInputValue(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function nextMinuteLocalInputValue() {
  return toLocalInputValue(new Date(Date.now() + 60 * 1000));
}

export default function AppointmentModal({
  open,
  onClose,
  clients,
  appointment,
  onSave,
  onCreateReminder,
  onCancelAppointment,
  onReactivate,
  error
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      clientId: '',
      startAt: '',
      duration: 60
    }
  });
  const [offsetMinutes, setOffsetMinutes] = useState(60);
  const [localError, setLocalError] = useState('');
  const minStartAt = useMemo(() => nextMinuteLocalInputValue(), [open]);
  const isCancelled = appointment?.status === 'cancelled';

  useEffect(() => {
    setLocalError('');

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
    setLocalError('');

    const start = new Date(values.startAt);
    const end = new Date(start.getTime() + Number(values.duration) * 60000);
    const now = Date.now();

    if (start.getTime() < now - 60 * 1000) {
      setLocalError('No se pueden crear citas en el pasado');
      return;
    }

    if (isCancelled) {
      return;
    }

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
        <form className="space-y-3" onSubmit={handleSubmit(submit)} noValidate>
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium mb-1">
              Cliente
            </label>
            <select
              id="clientId"
              className="w-full border rounded p-2"
              disabled={isCancelled}
              {...register('clientId', { required: 'Selecciona un cliente' })}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.clientId && <p className="text-red-600 text-sm">{errors.clientId.message}</p>}
          </div>

          <div>
            <label htmlFor="startAt" className="block text-sm font-medium mb-1">
              Fecha y hora de inicio
            </label>
            <input
              id="startAt"
              className="w-full border rounded p-2"
              type="datetime-local"
              min={minStartAt}
              disabled={isCancelled}
              {...register('startAt', { required: 'La fecha y hora son obligatorias' })}
            />
            {errors.startAt && <p className="text-red-600 text-sm">{errors.startAt.message}</p>}
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium mb-1">
              Duración (minutos)
            </label>
            <input
              id="duration"
              className="w-full border rounded p-2"
              type="number"
              min="15"
              step="15"
              disabled={isCancelled}
              {...register('duration', {
                required: 'La duración es obligatoria',
                min: { value: 15, message: 'Mínimo 15 minutos' },
                max: { value: 480, message: 'Máximo 480 minutos' }
              })}
            />
            {errors.duration && <p className="text-red-600 text-sm">{errors.duration.message}</p>}
          </div>

          {isCancelled && (
            <p className="text-sm app-muted">Cita cancelada: no se puede modificar. Reactívala para editar.</p>
          )}

          {(localError || error) && (
            <p className="text-red-600 text-sm" aria-live="polite">
              {localError || error}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            {appointment && appointment.status !== 'cancelled' && (
              <button
                type="button"
                className="border border-red-300 text-red-700 rounded px-3 py-2"
                onClick={() => onCancelAppointment(appointment.id)}
              >
                Cancelar cita
              </button>
            )}
            {isCancelled && appointment && (
              <button
                type="button"
                className="bg-emerald-600 text-white rounded px-3 py-2"
                onClick={() => onReactivate?.(appointment.id)}
              >
                Reactivar
              </button>
            )}
            <button type="button" className="border rounded px-3 py-2" onClick={onClose}>
              Cerrar
            </button>
            <button className="bg-blue-600 text-white rounded px-3 py-2" disabled={isCancelled}>
              Guardar
            </button>
          </div>
        </form>

        {appointment && !isCancelled && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium">Crear recordatorio</p>
            <div className="flex gap-2 flex-wrap">
              <button
                className="bg-emerald-600 text-white rounded px-3 py-2 text-sm"
                onClick={() => onCreateReminder(appointment.id, 1440)}
                type="button"
              >
                +24h
              </button>
              <button
                className="bg-emerald-600 text-white rounded px-3 py-2 text-sm"
                onClick={() => onCreateReminder(appointment.id, 120)}
                type="button"
              >
                +2h
              </button>
              <input
                type="number"
                min="1"
                className="border rounded p-2 w-32"
                value={offsetMinutes}
                onChange={(e) => setOffsetMinutes(Number(e.target.value))}
                aria-label="Offset manual en minutos"
                placeholder="min"
                title="Offset en minutos"
              />
              <button
                className="bg-emerald-600 text-white rounded px-3 py-2"
                onClick={() => onCreateReminder(appointment.id, offsetMinutes)}
                type="button"
              >
                Crear manual
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
