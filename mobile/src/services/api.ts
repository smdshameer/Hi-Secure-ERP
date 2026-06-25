const API_BASE = 'http://140.245.244.165:3004/api';

let _token: string | null = null;

export function setToken(token: string) {
  _token = token;
}
export function clearToken() {
  _token = null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as any).error || (err as any).message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () =>
    request<{ user_id: number; username: string; role: string }>('/auth/me'),

  getJobs: () =>
    request<any[]>('/v1/tech/jobs'),

  checkIn: (visitId: string | number, lat: number, lng: number) =>
    request('/v1/tech/check-in', {
      method: 'POST',
      body: JSON.stringify({ visit_id: visitId, latitude: lat, longitude: lng }),
    }),

  checkOut: (visitId: string | number, lat: number, lng: number) =>
    request('/v1/tech/check-out', {
      method: 'POST',
      body: JSON.stringify({ visit_id: visitId, latitude: lat, longitude: lng }),
    }),

  completeVisit: (visitId: number, findings: string, signatureUrl: string, photos: any[]) => {
    const body: any = { findings };
    // Only include signature if we have a real URL with extension
    if (signatureUrl && signatureUrl.startsWith('http')) {
      body.signature_url = signatureUrl;
    }
    if (photos && photos.length > 0) {
      body.photos = photos;
    }
    return request(`/v1/tech/visits/${visitId}/complete`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  consumeParts: (jobId: number, partId: number, qty: number) =>
    request('/v1/tech/parts/consume', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, part_id: partId, quantity: qty, location_id: 1 }),
    }),
};
