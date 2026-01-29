import { pool } from '../db/connection.js';

export interface DocumentRow {
  id: string;
  package_id: string | null;
  number: string;
  date: Date;
  type: string;
  organization_id: string;
  counterparty_name: string | null;
  counterparty_inn: string | null;
  amount: number | null;
  currency: string;
  portal_status: string;
  uh_status: string | null;
  uh_document_ref: string | null;
  uh_error_message: string | null;
  current_version: number;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  frozen_at: Date | null;
  sent_to_uh_at: Date | null;
}

export async function getDocuments(filters?: {
  packageId?: string;
  organizationId?: string;
  portalStatus?: string;
  uhStatus?: string;
  limit?: number;
  offset?: number;
}) {
  let query = `
    SELECT d.*, o.name as organization_name
    FROM documents d
    LEFT JOIN organizations o ON d.organization_id = o.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.packageId) {
    query += ` AND d.package_id = $${paramIndex++}`;
    params.push(filters.packageId);
  }
  if (filters?.organizationId) {
    query += ` AND d.organization_id = $${paramIndex++}`;
    params.push(filters.organizationId);
  }
  if (filters?.portalStatus) {
    query += ` AND d.portal_status = $${paramIndex++}`;
    params.push(filters.portalStatus);
  }
  if (filters?.uhStatus) {
    query += ` AND d.uh_status = $${paramIndex++}`;
    params.push(filters.uhStatus);
  }

  query += ` ORDER BY d.created_at DESC`;

  if (filters?.limit) {
    query += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }
  }

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getDocumentById(id: string) {
  const result = await pool.query(
    `SELECT d.*, o.name as organization_name
     FROM documents d
     LEFT JOIN organizations o ON d.organization_id = o.id
     WHERE d.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createDocument(data: {
  packageId?: string;
  number: string;
  date: string;
  type: string;
  organizationId: string;
  counterpartyName?: string;
  counterpartyInn?: string;
  amount?: number;
  currency?: string;
  contractId?: string;
  paymentAccountId?: string;
  warehouseId?: string;
  hasDiscrepancies?: boolean;
  originalReceived?: boolean;
  isUPD?: boolean;
  invoiceRequired?: boolean;
  items?: any[]; // табличная часть (товары/услуги)
  totalAmount?: number;
  totalVAT?: number;
  dueDate?: string;
  receiptBasis?: string;
  returnBasis?: string;
  documentNumber?: string;
  paymentTerms?: string;
  createdBy?: string;
}) {
  // Валидация UUID для organizationId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.organizationId)) {
    const err: any = new Error(`Invalid organizationId format: ${data.organizationId}`);
    err.statusCode = 400;
    throw err;
  }

  const result = await pool.query(
    `INSERT INTO documents (
      package_id, number, date, type, organization_id,
      counterparty_name, counterparty_inn, amount, currency,
      portal_status, current_version, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      data.packageId || null,
      data.number,
      data.date,
      data.type,
      data.organizationId,
      data.counterpartyName || null,
      data.counterpartyInn || null,
      data.amount || data.totalAmount || null,
      data.currency || 'RUB',
      'Draft',
      1,
      data.createdBy || null
    ]
  );

  // Создаём первую версию документа с полными данными в JSONB
  const document = result.rows[0];
  const versionData = {
    number: data.number,
    date: data.date,
    type: data.type,
    counterpartyName: data.counterpartyName,
    counterpartyInn: data.counterpartyInn,
    contractId: data.contractId,
    paymentAccountId: data.paymentAccountId,
    warehouseId: data.warehouseId,
    hasDiscrepancies: data.hasDiscrepancies,
    originalReceived: data.originalReceived,
    isUPD: data.isUPD,
    invoiceRequired: data.invoiceRequired,
    items: data.items || [],
    totalAmount: data.totalAmount || data.amount || 0,
    totalVAT: data.totalVAT || 0,
    amount: data.amount || data.totalAmount || 0,
    currency: data.currency || 'RUB',
    dueDate: data.dueDate,
    receiptBasis: data.receiptBasis,
    returnBasis: data.returnBasis,
    documentNumber: data.documentNumber,
    paymentTerms: data.paymentTerms
  };

  await pool.query(
    `INSERT INTO document_versions (document_id, version, status, data, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      document.id,
      1,
      'Draft',
      JSON.stringify(versionData),
      data.createdBy || null
    ]
  );

  return document;
}

export async function updateDocument(id: string, updates: Partial<DocumentRow>) {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) {
    return getDocumentById(id);
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE documents SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function freezeDocumentVersion(documentId: string, version: number) {
  // Обновляем статус версии
  await pool.query(
    `UPDATE document_versions
     SET status = 'Frozen', frozen_at = CURRENT_TIMESTAMP
     WHERE document_id = $1 AND version = $2`,
    [documentId, version]
  );

  // Обновляем статус документа
  const result = await pool.query(
    `UPDATE documents
     SET portal_status = 'Frozen', frozen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [documentId]
  );

  return result.rows[0] || null;
}

export async function updateDocumentStatus(
  documentId: string,
  newStatus: string,
  metadata?: { validatedAt?: Date; frozenAt?: Date; cancelledAt?: Date }
) {
  const updates: string[] = ['portal_status = $2', 'updated_at = CURRENT_TIMESTAMP'];
  const params: any[] = [documentId, newStatus];
  let paramIndex = 3;

  if (metadata?.validatedAt) {
    updates.push(`validated_at = $${paramIndex++}`);
    params.push(metadata.validatedAt);
  }

  if (metadata?.frozenAt) {
    updates.push(`frozen_at = $${paramIndex++}`);
    params.push(metadata.frozenAt);
  }

  if (metadata?.cancelledAt) {
    updates.push(`cancelled_at = $${paramIndex++}`);
    params.push(metadata.cancelledAt);
  }

  const result = await pool.query(
    `UPDATE documents
     SET ${updates.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params
  );

  return result.rows[0] || null;
}

export async function cancelDocument(documentId: string) {
  // Отменяем документ (можно отменить только если он не заморожен и не отправлен в УХ)
  const result = await pool.query(
    `UPDATE documents
     SET portal_status = 'Cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 
       AND portal_status NOT IN ('Frozen', 'QueuedToUH', 'SentToUH', 'AcceptedByUH', 'PostedInUH')
     RETURNING *`,
    [documentId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  // Также отменяем версию документа
  await pool.query(
    `UPDATE document_versions
     SET status = 'Cancelled'
     WHERE document_id = $1 AND version = (
       SELECT current_version FROM documents WHERE id = $1
     )`,
    [documentId]
  );

  return result.rows[0];
}

export async function getDocumentFiles(documentId: string, version?: number) {
  let query = `SELECT * FROM document_files WHERE document_id = $1`;
  const params: any[] = [documentId];

  if (version !== undefined) {
    query += ` AND version = $2`;
    params.push(version);
  }

  query += ` ORDER BY uploaded_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getDocumentChecks(documentId: string, version?: number) {
  let query = `SELECT * FROM document_checks WHERE document_id = $1`;
  const params: any[] = [documentId];

  if (version !== undefined) {
    query += ` AND version = $2`;
    params.push(version);
  }

  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getDocumentHistory(documentId: string, version?: number) {
  let query = `SELECT * FROM document_history WHERE document_id = $1`;
  const params: any[] = [documentId];

  if (version !== undefined) {
    query += ` AND version = $2`;
    params.push(version);
  }

  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getDocumentVersion(documentId: string, version: number) {
  const result = await pool.query(
    `SELECT * FROM document_versions 
     WHERE document_id = $1 AND version = $2`,
    [documentId, version]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    documentId: row.document_id,
    version: row.version,
    status: row.status,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    createdAt: row.created_at,
    createdBy: row.created_by
  };
}

export async function updateDocumentVersion(documentId: string, version: number, data: any) {
  const result = await pool.query(
    `UPDATE document_versions
     SET data = $3, updated_at = CURRENT_TIMESTAMP
     WHERE document_id = $1 AND version = $2
     RETURNING *`,
    [documentId, version, JSON.stringify(data)]
  );
  
  return result.rows[0] || null;
}
