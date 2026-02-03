import type { PoolClient } from 'pg';
import { pool } from '../db/connection.js';

export interface ObjectTypeRow {
  id: string;
  code: string;
  name: string;
  direction_id: string | null;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ObjectTypeSchemaRow {
  id: string;
  type_id: string;
  field_key: string;
  label: string;
  data_type: string;
  field_group: string | null;
  is_required: boolean;
  is_unique: boolean;
  validation_rules: Record<string, unknown>;
  default_value: unknown | null;
  reference_type_id: string | null;
  enum_values: unknown[] | null;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ObjectCardRow {
  id: string;
  type_id: string;
  code: string;
  name: string;
  organization_id: string | null;
  status: string;
  attrs: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface ObjectCardHistoryRow {
  id: string;
  card_id: string;
  changed_by: string | null;
  change_type: string;
  field_key: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  comment: string | null;
  created_at: Date;
}

// ========== Object Types ==========

export async function listObjectTypes(filters?: {
  directionId?: string;
  search?: string;
  activeOnly?: boolean;
}): Promise<ObjectTypeRow[]> {
  let q = `SELECT * FROM object_types WHERE 1=1`;
  const p: any[] = [];
  let i = 1;

  if (filters?.directionId) {
    q += ` AND (direction_id = $${i++} OR direction_id IS NULL)`;
    p.push(filters.directionId);
  }
  if (filters?.activeOnly) {
    q += ` AND is_active = true`;
  }
  if (filters?.search && filters.search.trim()) {
    q += ` AND (code ILIKE $${i++} OR name ILIKE $${i++})`;
    const s = `%${filters.search.trim()}%`;
    p.push(s, s);
  }
  q += ` ORDER BY name ASC`;
  const r = await pool.query(q, p);
  return r.rows as ObjectTypeRow[];
}

export async function getObjectTypeById(id: string): Promise<ObjectTypeRow | null> {
  const r = await pool.query(`SELECT * FROM object_types WHERE id = $1`, [id]);
  return (r.rows[0] ?? null) as ObjectTypeRow | null;
}

export async function getObjectTypeByCode(code: string): Promise<ObjectTypeRow | null> {
  const r = await pool.query(`SELECT * FROM object_types WHERE code = $1`, [code]);
  return (r.rows[0] ?? null) as ObjectTypeRow | null;
}

export async function createObjectType(data: {
  code: string;
  name: string;
  directionId?: string | null;
  icon?: string | null;
  description?: string | null;
  isActive?: boolean;
}): Promise<ObjectTypeRow | null> {
  const r = await pool.query(
    `INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.code,
      data.name,
      data.directionId ?? null,
      data.icon ?? null,
      data.description ?? null,
      data.isActive ?? true
    ]
  );
  return (r.rows[0] ?? null) as ObjectTypeRow | null;
}

export async function updateObjectType(
  id: string,
  updates: Partial<Pick<ObjectTypeRow, 'name' | 'direction_id' | 'icon' | 'description' | 'is_active'>>
): Promise<ObjectTypeRow | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (updates.name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(updates.name);
  }
  if (updates.direction_id !== undefined) {
    fields.push(`direction_id = $${i++}`);
    values.push(updates.direction_id);
  }
  if (updates.icon !== undefined) {
    fields.push(`icon = $${i++}`);
    values.push(updates.icon);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${i++}`);
    values.push(updates.description);
  }
  if (updates.is_active !== undefined) {
    fields.push(`is_active = $${i++}`);
    values.push(updates.is_active);
  }
  if (fields.length === 0) {
    const r0 = await pool.query(`SELECT * FROM object_types WHERE id = $1`, [id]);
    return (r0.rows[0] ?? null) as ObjectTypeRow | null;
  }
  values.push(id);
  const r = await pool.query(
    `UPDATE object_types SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return (r.rows[0] ?? null) as ObjectTypeRow | null;
}

// ========== Object Type Schemas ==========

export async function getObjectTypeSchemas(typeId: string): Promise<ObjectTypeSchemaRow[]> {
  const r = await pool.query(
    `SELECT * FROM object_type_schemas WHERE type_id = $1 ORDER BY field_group, display_order, label`,
    [typeId]
  );
  return r.rows as ObjectTypeSchemaRow[];
}

export async function upsertObjectTypeSchema(data: {
  typeId: string;
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
}): Promise<ObjectTypeSchemaRow | null> {
  const r = await pool.query(
    `INSERT INTO object_type_schemas (
      type_id, field_key, label, data_type, field_group, is_required, is_unique,
      validation_rules, default_value, reference_type_id, enum_values, display_order
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (type_id, field_key)
    DO UPDATE SET
      label = EXCLUDED.label,
      data_type = EXCLUDED.data_type,
      field_group = EXCLUDED.field_group,
      is_required = EXCLUDED.is_required,
      is_unique = EXCLUDED.is_unique,
      validation_rules = EXCLUDED.validation_rules,
      default_value = EXCLUDED.default_value,
      reference_type_id = EXCLUDED.reference_type_id,
      enum_values = EXCLUDED.enum_values,
      display_order = EXCLUDED.display_order,
      updated_at = now()
    RETURNING *`,
    [
      data.typeId,
      data.fieldKey,
      data.label,
      data.dataType,
      data.fieldGroup ?? null,
      data.isRequired ?? false,
      data.isUnique ?? false,
      JSON.stringify(data.validationRules ?? {}),
      data.defaultValue !== undefined ? JSON.stringify(data.defaultValue) : null,
      data.referenceTypeId ?? null,
      data.enumValues ? JSON.stringify(data.enumValues) : null,
      data.displayOrder ?? 0
    ]
  );
  return (r.rows[0] ?? null) as ObjectTypeSchemaRow | null;
}

export async function deleteObjectTypeSchema(typeId: string, fieldKey: string): Promise<boolean> {
  const r = await pool.query(
    `DELETE FROM object_type_schemas WHERE type_id = $1 AND field_key = $2`,
    [typeId, fieldKey]
  );
  return (r.rowCount ?? 0) > 0;
}

// ========== Object Cards ==========

export async function listObjectCards(filters?: {
  typeId?: string;
  organizationId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: ObjectCardRow[]; total: number }> {
  let q = `SELECT * FROM object_cards WHERE 1=1`;
  let countQ = `SELECT COUNT(*) FROM object_cards WHERE 1=1`;
  const p: any[] = [];
  let i = 1;

  if (filters?.typeId) {
    const idx = i++;
    q += ` AND type_id = $${idx}`;
    countQ += ` AND type_id = $${idx}`;
    p.push(filters.typeId);
  }
  if (filters?.organizationId !== undefined) {
    if (filters.organizationId === null) {
      q += ` AND organization_id IS NULL`;
      countQ += ` AND organization_id IS NULL`;
    } else {
      const idx = i++;
      q += ` AND organization_id = $${idx}`;
      countQ += ` AND organization_id = $${idx}`;
      p.push(filters.organizationId);
    }
  }
  if (filters?.status) {
    const idx = i++;
    q += ` AND status = $${idx}`;
    countQ += ` AND status = $${idx}`;
    p.push(filters.status);
  }
  if (filters?.search && filters.search.trim()) {
    const searchIdx1 = i++;
    const searchIdx2 = i++;
    q += ` AND (code ILIKE $${searchIdx1} OR name ILIKE $${searchIdx2})`;
    countQ += ` AND (code ILIKE $${searchIdx1} OR name ILIKE $${searchIdx2})`;
    const s = `%${filters.search.trim()}%`;
    p.push(s, s);
  }

  // Count
  const countParams = [...p];
  const countR = await pool.query(countQ, countParams);
  const total = parseInt(countR.rows[0].count, 10);

  // Data
  q += ` ORDER BY created_at DESC`;
  if (filters?.limit) {
    q += ` LIMIT $${i++}`;
    p.push(filters.limit);
    if (filters.offset) {
      q += ` OFFSET $${i++}`;
      p.push(filters.offset);
    }
  }

  const r = await pool.query(q, p);
  return { rows: r.rows as ObjectCardRow[], total };
}

export async function getObjectCardById(id: string): Promise<ObjectCardRow | null> {
  const r = await pool.query(`SELECT * FROM object_cards WHERE id = $1`, [id]);
  return (r.rows[0] ?? null) as ObjectCardRow | null;
}

export async function createObjectCard(data: {
  typeId: string;
  code: string;
  name: string;
  organizationId?: string | null;
  status?: string;
  attrs?: Record<string, unknown>;
  createdBy?: string | null;
}): Promise<ObjectCardRow | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cardRes = await client.query(
      `INSERT INTO object_cards (type_id, code, name, organization_id, status, attrs, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.typeId,
        data.code,
        data.name,
        data.organizationId ?? null,
        data.status ?? 'Active',
        JSON.stringify(data.attrs ?? {}),
        data.createdBy ?? null
      ]
    );
    const card = cardRes.rows[0] as ObjectCardRow;

    // Записываем создание в историю (в той же транзакции, чтобы FK object_card_history_card_id_fkey видел карточку)
    await addObjectCardHistory(
      card.id,
      'Created',
      data.createdBy || null,
      null,
      null,
      {
        code: card.code,
        name: card.name,
        status: card.status,
        attrs: card.attrs
      },
      null,
      client
    );

    // Записываем событие для webhook
    await client.query(
      `INSERT INTO object_events (event_type, type_id, card_id, payload)
       VALUES ($1, $2, $3, $4)`,
      [
        'Upsert',
        data.typeId,
        card.id,
        JSON.stringify({
          eventType: 'Upsert',
          typeId: data.typeId,
          card: {
            id: card.id,
            code: card.code,
            name: card.name,
            organizationId: card.organization_id,
            status: card.status,
            attrs: card.attrs,
            createdAt: card.created_at
          }
        })
      ]
    );

    await client.query('COMMIT');
    return card;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function updateObjectCard(
  id: string,
  updates: Partial<Pick<ObjectCardRow, 'code' | 'name' | 'organization_id' | 'status' | 'attrs'>> & { updatedBy?: string | null }
): Promise<ObjectCardRow | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (updates.code !== undefined) {
      fields.push(`code = $${i++}`);
      values.push(updates.code);
    }
    if (updates.name !== undefined) {
      fields.push(`name = $${i++}`);
      values.push(updates.name);
    }
    if (updates.organization_id !== undefined) {
      fields.push(`organization_id = $${i++}`);
      values.push(updates.organization_id);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${i++}`);
      values.push(updates.status);
    }
    if (updates.attrs !== undefined) {
      fields.push(`attrs = $${i++}`);
      values.push(JSON.stringify(updates.attrs));
    }
    if (updates.updatedBy !== undefined) {
      fields.push(`updated_by = $${i++}`);
      values.push(updates.updatedBy);
    }

    if (fields.length === 0) {
      const r0 = await client.query(`SELECT * FROM object_cards WHERE id = $1`, [id]);
      await client.query('COMMIT');
      return (r0.rows[0] ?? null) as ObjectCardRow | null;
    }

    // Получаем старые значения для истории
    const oldCardRes = await client.query(`SELECT * FROM object_cards WHERE id = $1`, [id]);
    const oldCard = oldCardRes.rows[0] as ObjectCardRow | undefined;

    values.push(id);
    const r = await client.query(
      `UPDATE object_cards SET ${fields.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
      values
    );
    const card = r.rows[0] as ObjectCardRow;

    // Записываем изменения в историю (триггер автоматически создаст записи, но можно добавить и вручную для важных полей)
    if (oldCard) {
      const changedFields: string[] = [];
      if (updates.code !== undefined && updates.code !== oldCard.code) {
        changedFields.push('code');
        await addObjectCardHistory(
          card.id,
          'FieldChanged',
          updates.updatedBy || null,
          'code',
          oldCard.code,
          card.code,
          null,
          client
        );
      }
      if (updates.name !== undefined && updates.name !== oldCard.name) {
        changedFields.push('name');
        await addObjectCardHistory(
          card.id,
          'FieldChanged',
          updates.updatedBy || null,
          'name',
          oldCard.name,
          card.name,
          null,
          client
        );
      }
      if (updates.status !== undefined && updates.status !== oldCard.status) {
        changedFields.push('status');
        await addObjectCardHistory(
          card.id,
          'StatusChanged',
          updates.updatedBy || null,
          'status',
          oldCard.status,
          card.status,
          null,
          client
        );
      }
      if (updates.attrs !== undefined) {
        const oldAttrs = oldCard.attrs || {};
        const newAttrs = card.attrs || {};
        // Находим измененные поля в attrs
        const allKeys = new Set([...Object.keys(oldAttrs), ...Object.keys(newAttrs)]);
        for (const key of allKeys) {
          if (JSON.stringify(oldAttrs[key]) !== JSON.stringify(newAttrs[key])) {
            await addObjectCardHistory(
              card.id,
              'FieldChanged',
              updates.updatedBy || null,
              key,
              oldAttrs[key],
              newAttrs[key],
              null,
              client
            );
          }
        }
      }
      if (changedFields.length === 0 && updates.attrs === undefined) {
        // Если ничего не изменилось, просто записываем общее обновление
        await addObjectCardHistory(
          card.id,
          'Updated',
          updates.updatedBy || null,
          null,
          null,
          null,
          null,
          client
        );
      }
    }

    // Записываем событие для webhook
    await client.query(
      `INSERT INTO object_events (event_type, type_id, card_id, payload)
       VALUES ($1, $2, $3, $4)`,
      [
        card.status === 'Inactive' || card.status === 'Archived' ? 'Deactivate' : 'Upsert',
        card.type_id,
        card.id,
        JSON.stringify({
          eventType: card.status === 'Inactive' || card.status === 'Archived' ? 'Deactivate' : 'Upsert',
          typeId: card.type_id,
          card: {
            id: card.id,
            code: card.code,
            name: card.name,
            organizationId: card.organization_id,
            status: card.status,
            attrs: card.attrs,
            updatedAt: card.updated_at
          }
        })
      ]
    );

    await client.query('COMMIT');
    return card;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteObjectCard(id: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Получаем данные карточки перед удалением для события
    const cardRes = await client.query(`SELECT type_id FROM object_cards WHERE id = $1`, [id]);
    if (cardRes.rows.length === 0) {
      await client.query('COMMIT');
      return false;
    }

    const card = cardRes.rows[0];
    const r = await client.query(`DELETE FROM object_cards WHERE id = $1`, [id]);
    const deleted = (r.rowCount ?? 0) > 0;

    if (deleted) {
      // Записываем событие удаления для webhook
      await client.query(
        `INSERT INTO object_events (event_type, type_id, card_id, payload)
         VALUES ($1, $2, $3, $4)`,
        [
          'Delete',
          card.type_id,
          id,
          JSON.stringify({
            eventType: 'Delete',
            typeId: card.type_id,
            cardId: id
          })
        ]
      );
    }

    await client.query('COMMIT');
    return deleted;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ========== Object Card History ==========

export async function getObjectCardHistory(cardId: string, limit: number = 50): Promise<ObjectCardHistoryRow[]> {
  const r = await pool.query(
    `SELECT * FROM object_card_history WHERE card_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [cardId, limit]
  );
  return r.rows as ObjectCardHistoryRow[];
}

/** Если передан client, вставка выполняется в той же транзакции (для соблюдения FK при создании карточки). */
export async function addObjectCardHistory(
  cardId: string,
  changeType: string,
  changedBy: string | null,
  fieldKey: string | null,
  oldValue: unknown,
  newValue: unknown,
  comment?: string | null,
  client?: PoolClient
): Promise<void> {
  const q = client ?? pool;
  await q.query(
    `INSERT INTO object_card_history (card_id, changed_by, change_type, field_key, old_value, new_value, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      cardId,
      changedBy,
      changeType,
      fieldKey,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      comment || null
    ]
  );
}

// Получение карточек объектов, на которые подписана организация
export async function listSubscribedObjectCards(params: {
  orgId: string;
  typeCode: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ type: ObjectTypeRow | null; rows: ObjectCardRow[]; total: number }> {
  const type = await getObjectTypeByCode(params.typeCode);
  if (!type) return { type: null, rows: [], total: 0 };

  // Проверяем подписку на аналитику (analytics_types.code == object_types.code)
  const subRes = await pool.query(
    `SELECT 1
     FROM org_analytics_subscriptions s
     JOIN analytics_types t ON t.id = s.type_id
     WHERE s.org_id = $1 AND s.is_enabled = true AND UPPER(t.code) = UPPER($2)
     LIMIT 1`,
    [params.orgId, type.code]
  );
  if (!subRes.rowCount) return { type, rows: [], total: 0 };

  const filters: Parameters<typeof listObjectCards>[0] = {
    typeId: type.id,
    search: params.search,
    status: params.status,
    limit: params.limit,
    offset: params.offset
  };
  const { rows, total } = await listObjectCards(filters);
  return { type, rows, total };
}
