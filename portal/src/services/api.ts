// API сервис для работы с backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('auth_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as HeadersInit)
  };
  
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Ошибка сети' } }));
    throw new Error(error.error?.message || 'Ошибка запроса');
  }

  return response.json();
}

function normalizeDocumentPayload(payload: any) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const normalized = { ...payload };
  const amount = normalized.amount;
  const totalAmount = normalized.totalAmount;
  const totalVAT = normalized.totalVAT;
  const invoiceRequired = normalized.invoiceRequired;
  if (invoiceRequired === 'required') {
    normalized.invoiceRequired = true;
  } else if (invoiceRequired === 'notRequired') {
    normalized.invoiceRequired = false;
  } else if (invoiceRequired === 'true') {
    normalized.invoiceRequired = true;
  } else if (invoiceRequired === 'false') {
    normalized.invoiceRequired = false;
  }

  if (normalized.type === 'ReceiptGoods' && !normalized.receiptOperationType) {
    normalized.receiptOperationType = 'Товары';
  }

  if (typeof amount === 'string') {
    const parsed = Number(amount.replace(',', '.'));
    normalized.amount = Number.isFinite(parsed) ? parsed : amount;
  }

  if (typeof totalAmount === 'string') {
    const parsed = Number(totalAmount.replace(',', '.'));
    normalized.totalAmount = Number.isFinite(parsed) ? parsed : totalAmount;
  }

  if (typeof totalVAT === 'string') {
    const parsed = Number(totalVAT.replace(',', '.'));
    normalized.totalVAT = Number.isFinite(parsed) ? parsed : totalVAT;
  }

  return normalized;
}

export const api = {
  // Документы
  documents: {
    list: (filters?: {
      packageId?: string;
      notInPackageId?: string;
      organizationId?: string;
      portalStatus?: string;
      uhStatus?: string;
      limit?: number;
      offset?: number;
    }) => {
      const params = new URLSearchParams();
      if (filters?.packageId) params.append('packageId', filters.packageId);
      if (filters?.notInPackageId) params.append('notInPackageId', filters.notInPackageId);
      if (filters?.organizationId) params.append('organizationId', filters.organizationId);
      if (filters?.portalStatus) params.append('portalStatus', filters.portalStatus);
      if (filters?.uhStatus) params.append('uhStatus', filters.uhStatus);
      if (filters?.limit != null) params.append('limit', String(filters.limit));
      if (filters?.offset != null) params.append('offset', String(filters.offset));
      const query = params.toString();
      return request<{ data: any[] }>(`/documents${query ? `?${query}` : ''}`, {
        method: 'GET'
      });
    },

    getById: (id: string) => request<{ data: any }>(`/documents/${id}`),

    create: (document: any) => request<{ data: any }>('/documents', {
      method: 'POST',
      body: JSON.stringify(normalizeDocumentPayload(document))
    }),

    update: (id: string, updates: any) => request<{ data: any }>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(normalizeDocumentPayload(updates))
    }),

    freeze: (id: string) => request<{ data: any }>(`/documents/${id}/freeze`, {
      method: 'POST'
    }),
    cancel: (id: string) => request<{ data: any }>(`/documents/${id}/cancel`, {
      method: 'POST'
    }),
    delete: (id: string) => request<{ data: any }>(`/documents/${id}`, {
      method: 'DELETE'
    }),
    changeStatus: (id: string, status: string) => request<{ data: any }>(`/documents/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    }),
    getStatusTransitions: (id: string) => request<{ data: { currentStatus: string; editable: boolean; availableTransitions: string[] } }>(
      `/documents/${id}/status/transitions`
    ),
    /** Синхронизация статуса из 1С УХ (получение «Проведен в УХ» по ссылке uh_document_ref) */
    syncUHStatus: (id: string) => request<{ data: { id: string; uhStatus: string; portalStatus: string; uhDocumentRef: string | null; synced: boolean; errorMessage?: string } }>(
      `/documents/${id}/sync-uh-status`,
      { method: 'POST' }
    ),
    addCheck: (id: string, check: { source: string; level: 'error' | 'warning' | 'info'; message: string; field?: string; version?: number }) => 
      request<{ data: any }>(`/documents/${id}/checks`, {
        method: 'POST',
        body: JSON.stringify(check)
      })
  },

  // Пакеты
  packages: {
    list: (filters?: {
      search?: string;
      organizationId?: string;
      status?: string;
      period?: string;
      type?: string;
      limit?: number;
      offset?: number;
    }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.organizationId) params.append('organizationId', filters.organizationId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.period) params.append('period', filters.period);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.limit != null) params.append('limit', String(filters.limit));
      if (filters?.offset != null) params.append('offset', String(filters.offset));
      const query = params.toString();
      return request<{ data: any[] }>(`/packages${query ? `?${query}` : ''}`, {
        method: 'GET'
      });
    },

    getById: (id: string) => request<{ data: any }>(`/packages/${id}`),

    addDocuments: (packageId: string, documentIds: string[]) =>
      request<{ data: { added: number; packageId: string } }>(`/packages/${packageId}/documents`, {
        method: 'POST',
        body: JSON.stringify({ documentIds })
      }),

    sendToUH: (packageId: string) =>
      request<{ data: { packageId: string; enqueued: number; skipped: number; totalInPackage: number; errors?: string[] } }>(
        `/packages/${packageId}/send-to-uh`,
        { method: 'POST' }
      ),

    create: (pkg: any) => request<{ data: any }>('/packages', {
      method: 'POST',
      body: JSON.stringify(pkg)
    })
  },

  // Аналитики (MDM холдинга)
  analytics: {
    listTypes: (params?: { search?: string }) => {
      const sp = new URLSearchParams();
      if (params?.search) sp.append('search', params.search);
      const qs = sp.toString();
      return request<{ data: Array<{ id: string; code: string; name: string; directionId: string | null; isActive: boolean }> }>(
        `/analytics/types${qs ? `?${qs}` : ''}`
      );
    },
    listValues: (params: {
      typeCode: string;
      search?: string;
      organizationId?: string;
      counterpartyId?: string;
      type?: string;
      limit?: number;
      cursorUpdatedAt?: string;
      cursorId?: string;
      activeOnly?: boolean;
    }) => {
      const sp = new URLSearchParams();
      sp.append('typeCode', params.typeCode);
      if (params.search) sp.append('search', params.search);
      if (params.organizationId) sp.append('organizationId', params.organizationId);
      if (params.counterpartyId) sp.append('counterpartyId', params.counterpartyId);
      if (params.type) sp.append('type', params.type);
      if (params.limit != null) sp.append('limit', String(params.limit));
      if (params.cursorUpdatedAt) sp.append('cursorUpdatedAt', params.cursorUpdatedAt);
      if (params.cursorId) sp.append('cursorId', params.cursorId);
      if (params.activeOnly === false) sp.append('activeOnly', 'false');
      return request<{
        data: Array<{ id: string; code: string; name: string; attrs: Record<string, unknown>; isActive: boolean; updatedAt: string }>;
        meta?: { typeCode: string; nextCursor?: { cursorUpdatedAt: string; cursorId: string } | null };
      }>(`/analytics/values?${sp.toString()}`);
    },
    listSubscriptions: () =>
      request<{ data: Array<{ typeId: string; typeCode: string; typeName: string; isEnabled: boolean }> }>(
        `/analytics/subscriptions`
      ),
    setSubscription: (payload: { typeId: string; isEnabled: boolean }) =>
      request<{ data: any }>(`/analytics/subscriptions`, { method: 'POST', body: JSON.stringify(payload) }),
    getWebhook: () => request<{ data: any }>(`/analytics/webhook`),
    upsertWebhook: (payload: { url: string; secret: string; isActive?: boolean }) =>
      request<{ data: any }>(`/analytics/webhook`, { method: 'PUT', body: JSON.stringify(payload) }),
    resync: () => request<{ data: { created: number } }>(`/analytics/webhook/resync`, { method: 'POST' }),

    // ADMIN
    adminCreateType: (payload: { code: string; name: string; directionId?: string | null; isActive?: boolean }) =>
      request<{ data: any }>(`/analytics/admin/types`, { method: 'POST', body: JSON.stringify(payload) }),
    adminUpsertValue: (payload: { typeCode: string; code: string; name: string; attrs?: Record<string, unknown>; isActive?: boolean }) =>
      request<{ data: any }>(`/analytics/admin/values`, { method: 'POST', body: JSON.stringify(payload) })
  },

  organization: {
    getMyOrganization: () =>
      request<{ data: { id: string; code: string; name: string; inn: string | null; directionId: string | null; createdAt: string; updatedAt: string } }>(
        `/organization/me`
      ),
    getEmployees: () =>
      request<{ data: Array<{ id: string; username: string; email: string | null; role: string; organizationId: string | null; isActive: boolean; createdAt: string; updatedAt: string }> }>(
        `/organization/employees`
      ),
    searchUsers: (query: string) =>
      request<{ data: Array<{ id: string; username: string; email: string | null; role: string; organizationId: string | null }> }>(
        `/organization/employees/search?query=${encodeURIComponent(query)}`
      ),
    assignEmployee: (payload: { userId: string }) =>
      request<{ data: any }>(`/organization/employees`, { method: 'POST', body: JSON.stringify(payload) }),
    updateEmployeeRole: (employeeId: string, payload: { role: string }) =>
      request<{ data: any }>(`/organization/employees/${employeeId}/role`, { method: 'PUT', body: JSON.stringify(payload) }),
    unassignEmployee: (employeeId: string) =>
      request<{ data: { success: boolean } }>(`/organization/employees/${employeeId}`, { method: 'DELETE' })
  },

  // Аутентификация
  auth: {
    login: (username: string, password: string) =>
      request<{ data: { token: string; user: any } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      }),
    register: (data: {
      username: string;
      email?: string;
      password: string;
      passwordConfirm: string;
      organizationId?: string;
      role?: string;
    }) =>
      request<{ data: { token: string; user: any } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    me: () => request<{ data: any }>('/auth/me')
  },

  // Файлы документов
  files: {
    upload: async (documentId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/files`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Ошибка сети' } }));
        throw new Error(error.error?.message || 'Ошибка загрузки файла');
      }

      return response.json();
    },

    list: (documentId: string) => request<{ data: any[] }>(`/documents/${documentId}/files`),

    download: async (fileId: string) => {
      const token = localStorage.getItem('auth_token');
      const url = `${API_BASE_URL}/files/${fileId}`;
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` })
          }
        });

        if (!response.ok) {
          throw new Error('Ошибка загрузки файла');
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        const fileName = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'file'
          : 'file';

        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } catch (error: any) {
        throw new Error(error.message || 'Ошибка загрузки файла');
      }
    },

    delete: (fileId: string) => request<{ data: { success: boolean } }>(`/files/${fileId}`, {
      method: 'DELETE'
    })
  },

  // НСИ (справочники)
  nsi: {
    organizations: (search?: string) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      return request<{ data: any[] }>(`/nsi/organizations${params.toString() ? `?${params.toString()}` : ''}`);
    },
    getOrganization: (id: string) => request<{ data: any }>(`/nsi/organizations/${id}`),

    counterparties: (search?: string, inn?: string) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (inn) params.append('inn', inn);
      return request<{ data: any[] }>(`/nsi/counterparties${params.toString() ? `?${params.toString()}` : ''}`);
    },
    getCounterparty: (id: string) => request<{ data: any }>(`/nsi/counterparties/${id}`),

    contracts: (organizationId?: string, counterpartyName?: string, counterpartyId?: string) => {
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      if (counterpartyName) params.append('counterpartyName', counterpartyName);
      if (counterpartyId) params.append('counterpartyId', counterpartyId);
      return request<{ data: any[] }>(`/nsi/contracts${params.toString() ? `?${params.toString()}` : ''}`);
    },
    getContract: (id: string) => request<{ data: any }>(`/nsi/contracts/${id}`),

    accounts: (organizationId?: string, type?: string) => {
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      if (type) params.append('type', type);
      return request<{ data: any[] }>(`/nsi/accounts${params.toString() ? `?${params.toString()}` : ''}`);
    },
    getAccount: (id: string) => request<{ data: any }>(`/nsi/accounts/${id}`),

    departments: (organizationId?: string, search?: string) => {
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      if (search) params.append('search', search);
      return request<{ data: any[] }>(`/nsi/departments${params.toString() ? `?${params.toString()}` : ''}`);
    },
    getDepartment: (id: string) => request<{ data: any }>(`/nsi/departments/${id}`),

    warehouses: (organizationId?: string, search?: string) => {
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      if (search) params.append('search', search);
      return request<{ data: any[] }>(`/nsi/warehouses${params.toString() ? `?${params.toString()}` : ''}`);
    },
    getWarehouse: (id: string) => request<{ data: any }>(`/nsi/warehouses/${id}`),

    nomenclature: (search?: string) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      return request<{ data: any[] }>(`/nsi/nomenclature${params.toString() ? `?${params.toString()}` : ''}`);
    },
    getNomenclature: (id: string) => request<{ data: any }>(`/nsi/nomenclature/${id}`),

    accountingAccounts: (search?: string) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      return request<{ data: any[] }>(`/nsi/accounting-accounts${params.toString() ? `?${params.toString()}` : ''}`);
    },
    getAccountingAccount: (id: string) => request<{ data: any }>(`/nsi/accounting-accounts/${id}`)
  },

  // Подключение к БД 1С:УХ (проверка)
  uh: {
    db: {
      config: () =>
        request<{
          data: { type: string; server: string; database: string; port: number; authType?: string } | null;
          message?: string;
        }>('/uh/db/config'),
      health: () => request<{ ok: boolean; error?: string }>('/uh/db/health'),
      sample: () =>
        request<{ data: { rows: Record<string, unknown>[]; columns: string[]; source: string } }>('/uh/db/sample'),
      servicesCheck: (baseUrl: string, credentials?: { username?: string; password?: string }) =>
        credentials?.username
          ? request<{
              data: Array<{ url: string; statusCode?: number; ok: boolean; error?: string; hint?: string }>;
            }>('/uh/db/services-check', {
              method: 'POST',
              body: JSON.stringify({ baseUrl, username: credentials.username, password: credentials.password ?? '' })
            })
          : request<{
              data: Array<{ url: string; statusCode?: number; ok: boolean; error?: string; hint?: string }>;
            }>(`/uh/db/services-check?baseUrl=${encodeURIComponent(baseUrl)}`)
      ,
      authDebug: (payload: {
        baseUrl?: string;
        endpoint?: string;
        method?: string;
        username?: string;
        password?: string;
        payload?: Record<string, unknown>;
      }) =>
        request<{
          data: {
            url: string;
            method: string;
            statusCode: number;
            wwwAuthenticate?: string | null;
            responseBody?: string;
            authUsed: { username: string; passwordSet: boolean };
            insecureTls: boolean;
          };
        }>('/uh/db/auth-debug', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
      ,
      authInfo: () =>
        request<{ data: { baseUrl: string; username: string; passwordSet: boolean; insecureTls: boolean } }>('/uh/db/auth-info'),
      authOverride: (payload: { username: string; password: string }) =>
        request<{ data: { ok: boolean; auth: { baseUrl: string; username: string; passwordSet: boolean; insecureTls: boolean } } }>('/uh/db/auth-override', {
          method: 'POST',
          body: JSON.stringify(payload)
        }),
      lastResponse: () =>
        request<{ data: { url: string; method: string; statusCode: number; headers: Record<string, unknown>; bodyPreview: string; bodyLength: number; at: string } | null }>('/uh/db/uh-last-response')
    }
  },

  // Административные функции
  admin: {
    logs: {
      get: (tail?: number) => {
        const params = new URLSearchParams();
        if (tail) params.append('tail', tail.toString());
        return request<{ data: { tail: number; filePath: string; lines: string[] } }>(
          `/admin/logs${params.toString() ? `?${params.toString()}` : ''}`
        );
      }
    },
    queue: {
      stats: () => request<{ data: { pending: number; processing: number; completed: number; failed: number } }>('/admin/queue/stats'),
      items: (status?: string, limit?: number) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (limit) params.append('limit', limit.toString());
        return request<{ data: Array<{
          id: string;
          documentId: string;
          documentNumber: string;
          documentType: string;
          operationType: string;
          status: string;
          attempts: number;
          lastError?: string;
          createdAt: string;
          processedAt?: string;
          completedAt?: string;
        }> }>(`/admin/queue/items${params.toString() ? `?${params.toString()}` : ''}`);
      },
      retryItem: (queueItemId: string) =>
        request<{ data: { success: boolean; message: string } }>(`/admin/queue/items/${queueItemId}/retry`, {
          method: 'POST'
        }),
      resendDocument: (documentId: string) =>
        request<{ data: { success: boolean; queueId: string; message: string } }>('/admin/queue/resend', {
          method: 'POST',
          body: JSON.stringify({ documentId })
        })
    },
    nsi: {
      sync: () =>
        request<{
          data: {
            success: boolean;
            synced: number;
            total: number;
            failed: number;
            errors: Array<{ type: string; id: string; name?: string; message: string }>;
            version?: number;
            message?: string;
          };
        }>('/admin/nsi/sync', { method: 'POST' }),
      syncWarehouses: () =>
        request<{
          data: {
            success: boolean;
            synced: number;
            total: number;
            failed: number;
            errors: Array<{ type: string; id: string; name?: string; message: string }>;
            version?: number;
            message?: string;
          };
        }>('/admin/nsi/warehouses/sync', { method: 'POST' }),
      clear: () =>
        request<{
          data: {
            cleared: { contracts: number; accounts: number; warehouses: number; nomenclature?: number; accountingAccounts: number; counterparties: number; organizations: number };
            keptOrganizations: number;
          };
        }>('/admin/nsi/clear', { method: 'POST' }),
      seedWarehouses: () =>
        request<{ data: { added: number } }>('/admin/nsi/seed-warehouses', { method: 'POST' }),
      clearSeededWarehouses: () =>
        request<{ data: { cleared: number } }>('/admin/nsi/clear-seeded-warehouses', { method: 'POST' })
    },
    dashboard: {
      stats: () =>
        request<{
          data: {
            packagesInProcessing: number;
            documentsWithErrors: number;
            processedToday: number;
            queueCount: number;
          };
        }>('/admin/dashboard/stats')
    },
    clearPortalData: () =>
      request<{
        data: {
          queue: number;
          documents: number;
          packages: number;
          nsi: { contracts: number; accounts: number; warehouses: number; nomenclature?: number; accountingAccounts: number; counterparties: number; organizations: number };
          keptOrganizations: number;
        };
      }>('/admin/clear-portal-data', { method: 'POST' }),
    users: {
      list: (params?: { organizationId?: string; role?: string; search?: string; limit?: number; offset?: number }) => {
        const queryParams = new URLSearchParams();
        if (params?.organizationId) queryParams.append('organizationId', params.organizationId);
        if (params?.role) queryParams.append('role', params.role);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.offset) queryParams.append('offset', params.offset.toString());
        return request<{
          data: Array<{
            id: string;
            username: string;
            email: string | null;
            role: string;
            organizationId: string | null;
            organizationName: string | null;
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
          }>;
          pagination: { total: number; limit: number; offset: number };
        }>(`/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
      },
      getById: (id: string) =>
        request<{
          data: {
            id: string;
            username: string;
            email: string | null;
            role: string;
            organizationId: string | null;
            organizationName: string | null;
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
          };
        }>(`/admin/users/${id}`),
      create: (payload: { username: string; email?: string | null; password: string; role: string; organizationId?: string | null }) =>
        request<{ data: any }>('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
      update: (id: string, payload: { username?: string; email?: string | null; role?: string; organizationId?: string | null; isActive?: boolean }) =>
        request<{ data: any }>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      updatePassword: (id: string, payload: { password: string }) =>
        request<{ data: { success: boolean } }>(`/admin/users/${id}/password`, { method: 'PUT', body: JSON.stringify(payload) }),
      delete: (id: string) =>
        request<{ data: { success: boolean } }>(`/admin/users/${id}`, { method: 'DELETE' })
    },
    organizations: {
      list: () =>
        request<{
          data: Array<{
            id: string;
            code: string;
            name: string;
            inn: string | null;
            directionId: string | null;
            createdAt: string;
            updatedAt: string;
          }>;
        }>('/admin/organizations')
    }
  },
  // Объекты учета
  objects: {
    types: {
      list: (params?: { directionId?: string; search?: string; activeOnly?: boolean }) => {
        const queryParams = new URLSearchParams();
        if (params?.directionId) queryParams.append('directionId', params.directionId);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.activeOnly !== false) queryParams.append('activeOnly', 'true');
        return request<{
          data: Array<{
            id: string;
            code: string;
            name: string;
            directionId: string | null;
            icon: string | null;
            description: string | null;
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
          }>;
        }>(`/objects/types${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
      },
      getById: (id: string) =>
        request<{
          data: {
            id: string;
            code: string;
            name: string;
            directionId: string | null;
            icon: string | null;
            description: string | null;
            isActive: boolean;
            schemas: Array<{
              id: string;
              fieldKey: string;
              label: string;
              dataType: string;
              fieldGroup: string | null;
              isRequired: boolean;
              isUnique: boolean;
              validationRules: Record<string, unknown>;
              defaultValue: unknown | null;
              referenceTypeId: string | null;
              enumValues: unknown[] | null;
              displayOrder: number;
            }>;
            createdAt: string;
            updatedAt: string;
          };
        }>(`/objects/types/${id}`),
      create: (payload: {
        code: string;
        name: string;
        directionId?: string | null;
        icon?: string | null;
        description?: string | null;
        isActive?: boolean;
      }) =>
        request<{ data: any }>('/objects/types', { method: 'POST', body: JSON.stringify(payload) }),
      update: (id: string, payload: {
        name?: string;
        directionId?: string | null;
        icon?: string | null;
        description?: string | null;
        isActive?: boolean;
      }) =>
        request<{ data: any }>(`/objects/types/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      getSchemas: (typeId: string) =>
        request<{
          data: Array<{
            id: string;
            fieldKey: string;
            label: string;
            dataType: string;
            fieldGroup: string | null;
            isRequired: boolean;
            isUnique: boolean;
            validationRules: Record<string, unknown>;
            defaultValue: unknown | null;
            referenceTypeId: string | null;
            enumValues: unknown[] | null;
            displayOrder: number;
          }>;
        }>(`/objects/types/${typeId}/schemas`),
      upsertSchema: (typeId: string, payload: {
        fieldKey: string;
        label: string;
        dataType: string;
        fieldGroup?: string | null;
        isRequired?: boolean;
        isUnique?: boolean;
        validationRules?: Record<string, unknown>;
        defaultValue?: unknown;
        referenceTypeId?: string | null;
        enumValues?: unknown[];
        displayOrder?: number;
      }) =>
        request<{ data: any }>(`/objects/types/${typeId}/schemas`, {
          method: 'POST',
          body: JSON.stringify(payload)
        }),
      deleteSchema: (typeId: string, fieldKey: string) =>
        request<{ data: { success: boolean } }>(`/objects/types/${typeId}/schemas/${fieldKey}`, {
          method: 'DELETE'
        })
    },
    cards: {
      list: (params?: {
        typeId?: string;
        organizationId?: string | null;
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.typeId) queryParams.append('typeId', params.typeId);
        if (params?.organizationId !== undefined) {
          queryParams.append('organizationId', params.organizationId === null ? 'null' : params.organizationId);
        }
        if (params?.status) queryParams.append('status', params.status);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.offset) queryParams.append('offset', params.offset.toString());
        return request<{
          data: Array<{
            id: string;
            typeId: string;
            code: string;
            name: string;
            organizationId: string | null;
            status: string;
            attrs: Record<string, unknown>;
            createdAt: string;
            updatedAt: string;
            createdBy: string | null;
            updatedBy: string | null;
          }>;
          total: number;
        }>(`/objects/cards${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
      },
      getById: (id: string) =>
        request<{
          data: {
            id: string;
            typeId: string;
            typeCode: string | null;
            typeName: string | null;
            code: string;
            name: string;
            organizationId: string | null;
            status: string;
            attrs: Record<string, unknown>;
            excludeFromAnalytics?: boolean;
            schemas: Array<{
              fieldKey: string;
              label: string;
              dataType: string;
              fieldGroup: string | null;
              isRequired: boolean;
              defaultValue: unknown;
            }>;
            history: Array<{
              id: string;
              changedBy: string | null;
              changeType: string;
              fieldKey: string | null;
              oldValue: Record<string, unknown> | null;
              newValue: Record<string, unknown> | null;
              comment: string | null;
              createdAt: string;
            }>;
            createdAt: string;
            updatedAt: string;
            createdBy: string | null;
            updatedBy: string | null;
          };
        }>(`/objects/cards/${id}`),
      resolve: (id: string) =>
        request<{
          data:
            | null
            | {
                kind: 'object_card';
                id: string;
                code: string;
                name: string;
                attrs?: Record<string, unknown>;
                typeId?: string;
                organizationId?: string | null;
                status?: string;
              }
            | {
                kind: 'nsi_nomenclature';
                id: string;
                code: string;
                name: string;
                data?: Record<string, unknown>;
              };
        }>(`/objects/cards/resolve/${id}`),
      lookup: (params: { typeId: string; code: string }) =>
        request<{
          data:
            | {
                id: string;
                typeId: string;
                code: string;
                name: string;
                organizationId: string | null;
                status: string;
                attrs: Record<string, unknown>;
                createdAt: string;
                updatedAt: string;
              }
            | null;
        }>(`/objects/cards/lookup?typeId=${encodeURIComponent(params.typeId)}&code=${encodeURIComponent(params.code)}`),
      getHistory: (id: string) =>
        request<{
          data: Array<{
            id: string;
            changedBy: string | null;
            changeType: string;
            fieldKey: string | null;
            oldValue: unknown;
            newValue: unknown;
            comment: string | null;
            createdAt: string;
          }>;
        }>(`/objects/cards/${id}/history`),
      create: (payload: {
        typeId: string;
        code: string;
        name: string;
        organizationId?: string | null;
        status?: string;
        attrs?: Record<string, unknown>;
      }) =>
        request<{ data: any }>('/objects/cards', { method: 'POST', body: JSON.stringify(payload) }),
      update: (id: string, payload: {
        code?: string;
        name?: string;
        organizationId?: string | null;
        status?: string;
        attrs?: Record<string, unknown>;
        excludeFromAnalytics?: boolean;
      }) =>
        request<{ data: any }>(`/objects/cards/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      delete: (id: string) =>
        request<{ data: { success: boolean } }>(`/objects/cards/${id}`, { method: 'DELETE' })
    },
    subscribedCards: {
      list: (params: {
        typeCode: string;
        search?: string;
        status?: string;
        limit?: number;
        offset?: number;
      }) => {
        const queryParams = new URLSearchParams();
        queryParams.append('typeCode', params.typeCode);
        if (params.search) queryParams.append('search', params.search);
        if (params.status) queryParams.append('status', params.status);
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.offset) queryParams.append('offset', params.offset.toString());
        return request<{
          data: {
            type: {
              id: string;
              code: string;
              name: string;
            };
            subscription?: {
              mode: 'NONE' | 'ALL' | 'SELECTED';
              selectedCount: number;
            };
            cards: Array<{
              id: string;
              code: string;
              name: string;
              organizationId: string | null;
              status: string;
              attrs: Record<string, unknown>;
              excludeFromAnalytics?: boolean;
              createdAt: string;
              updatedAt: string;
            }>;
            total: number;
          };
        }>(`/objects/subscribed-cards?${queryParams.toString()}`);
      }
    },

    // Подписки на объекты учета (v2)
    subscriptions: {
      listMy: () =>
        request<{
          data: Array<{
            typeId: string;
            typeCode: string;
            typeName: string;
            mode: 'NONE' | 'ALL' | 'SELECTED';
            selectedCount: number;
          }>;
        }>(`/objects/subscriptions`),
      setMode: (payload: { typeId: string; mode: 'NONE' | 'ALL' | 'SELECTED' }) =>
        request<{ data: any }>(`/objects/subscriptions`, { method: 'POST', body: JSON.stringify(payload) }),
      listCards: (typeId: string) =>
        request<{
          data: Array<{
            id: string;
            typeId: string;
            code: string;
            name: string;
            organizationId: string | null;
            status: string;
            attrs: Record<string, unknown>;
            createdAt: string;
            updatedAt: string;
          }>;
        }>(`/objects/subscriptions/${typeId}/cards`),
      setCards: (typeId: string, payload: { cardIds: string[] }) =>
        request<{ data: { replaced: number } }>(`/objects/subscriptions/${typeId}/cards`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
    },

    // Карточки, видимые организации (для выбора при подписке)
    availableCards: {
      list: (params: { typeCode: string; search?: string; status?: string; limit?: number; offset?: number }) => {
        const queryParams = new URLSearchParams();
        queryParams.append('typeCode', params.typeCode);
        if (params.search) queryParams.append('search', params.search);
        if (params.status) queryParams.append('status', params.status);
        if (params.limit != null) queryParams.append('limit', params.limit.toString());
        if (params.offset != null) queryParams.append('offset', params.offset.toString());
        return request<{
          data: Array<{
            id: string;
            typeId: string;
            code: string;
            name: string;
            organizationId: string | null;
            status: string;
            attrs: Record<string, unknown>;
            createdAt: string;
            updatedAt: string;
          }>;
        }>(`/objects/available-cards?${queryParams.toString()}`);
      }
    }
  },

  // Файлы карточек объектов учета (роуты в /api/objects/cards/...)
  objectFiles: {
    list: (cardId: string) =>
      request<{
        data: Array<{ id: string; name: string; size: number; mimeType: string; uploadedAt: string; hash: string }>;
      }>(`/objects/cards/${cardId}/files`),
    upload: async (cardId: string, file: File) => {
      const url = `${API_BASE_URL}/objects/cards/${cardId}/files`;
      const token = localStorage.getItem('auth_token');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(url, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Ошибка загрузки' } }));
        throw new Error(err.error?.message || 'Ошибка загрузки файла');
      }
      return res.json();
    },
    download: async (fileId: string, fileName?: string) => {
      const url = `${API_BASE_URL}/objects/cards/files/${fileId}`;
      const token = localStorage.getItem('auth_token');
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Ошибка скачивания');
      const blob = await res.blob();
      const name =
        fileName ||
        decodeURIComponent(res.headers.get('Content-Disposition')?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/)?.[1] || '') ||
        res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ||
        `file-${fileId}`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    delete: (fileId: string) =>
      request<{ data?: { success?: boolean } }>(`/objects/cards/files/${fileId}`, { method: 'DELETE' })
  }
};
