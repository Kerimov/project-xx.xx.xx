// API сервис для работы с backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('auth_token');

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Network error' } }));
    throw new Error(error.error?.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Документы
  documents: {
    list: (filters?: {
      packageId?: string;
      organizationId?: string;
      portalStatus?: string;
      uhStatus?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.packageId) params.append('packageId', filters.packageId);
      if (filters?.organizationId) params.append('organizationId', filters.organizationId);
      if (filters?.portalStatus) params.append('portalStatus', filters.portalStatus);
      if (filters?.uhStatus) params.append('uhStatus', filters.uhStatus);
      const query = params.toString();
      return request<{ data: any[] }>(`/documents${query ? `?${query}` : ''}`, {
        method: 'GET'
      });
    },

    getById: (id: string) => request<{ data: any }>(`/documents/${id}`),

    create: (document: any) => request<{ data: any }>('/documents', {
      method: 'POST',
      body: JSON.stringify(document)
    }),

    update: (id: string, updates: any) => request<{ data: any }>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),

    freeze: (id: string) => request<{ data: any }>(`/documents/${id}/freeze`, {
      method: 'POST'
    })
  },

  // Пакеты
  packages: {
    list: (filters?: {
      organizationId?: string;
      status?: string;
      period?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.organizationId) params.append('organizationId', filters.organizationId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.period) params.append('period', filters.period);
      const query = params.toString();
      return request<{ data: any[] }>(`/packages${query ? `?${query}` : ''}`, {
        method: 'GET'
      });
    },

    getById: (id: string) => request<{ data: any }>(`/packages/${id}`),

    create: (pkg: any) => request<{ data: any }>('/packages', {
      method: 'POST',
      body: JSON.stringify(pkg)
    })
  },

  // Аутентификация
  auth: {
    login: (username: string, password: string) =>
      request<{ data: { token: string; user: any } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })
  }
};
