const API_URL = import.meta.env.VITE_API_URL || '/api';

export async function api(path, { method = 'GET', token, body, tenantSlug } = {}) {
  const slug = tenantSlug || localStorage.getItem('tenantSlug') || '';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(slug ? { 'x-tenant-slug': slug } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const error = new Error(data?.message || data?.error || 'Error en la peticion');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}
