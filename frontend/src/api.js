const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const error = new Error(data?.message || 'Error en la petición');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}
