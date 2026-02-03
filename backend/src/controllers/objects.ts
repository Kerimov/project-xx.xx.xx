import { Request, Response, NextFunction } from 'express';
import * as objectsRepo from '../repositories/objects.js';
import { pool } from '../db/connection.js';

function getUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

function getOrgId(req: Request): string | null {
  return (req as any).user?.organizationId ?? null;
}

function isEcofAdmin(req: Request): boolean {
  return String((req as any).user?.role || '') === 'ecof_admin';
}

// ========== Object Types ==========

export async function listObjectTypes(req: Request, res: Response, next: NextFunction) {
  try {
    const directionId = (req.query.directionId as string | undefined) ?? undefined;
    const search = (req.query.search as string | undefined) ?? undefined;
    const activeOnly = (req.query.activeOnly as string | undefined) !== 'false';

    const rows = await objectsRepo.listObjectTypes({
      directionId,
      search,
      activeOnly
    });

    res.json({
      data: rows.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        directionId: t.direction_id,
        icon: t.icon,
        description: t.description,
        isActive: t.is_active,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      }))
    });
  } catch (e) {
    next(e);
  }
}

export async function getObjectTypeById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const type = await objectsRepo.getObjectTypeById(id);
    if (!type) {
      return res.status(404).json({ error: { message: 'Тип объекта учета не найден' } });
    }

    // Загружаем схему полей
    const schemas = await objectsRepo.getObjectTypeSchemas(id);

    res.json({
      data: {
        id: type.id,
        code: type.code,
        name: type.name,
        directionId: type.direction_id,
        icon: type.icon,
        description: type.description,
        isActive: type.is_active,
        schemas: schemas.map((s) => ({
          id: s.id,
          fieldKey: s.field_key,
          label: s.label,
          dataType: s.data_type,
          fieldGroup: s.field_group,
          isRequired: s.is_required,
          isUnique: s.is_unique,
          validationRules: s.validation_rules,
          defaultValue: s.default_value,
          referenceTypeId: s.reference_type_id,
          enumValues: s.enum_values,
          displayOrder: s.display_order
        })),
        createdAt: type.created_at,
        updatedAt: type.updated_at
      }
    });
  } catch (e) {
    next(e);
  }
}

export async function createObjectType(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    const type = await objectsRepo.createObjectType({
      code: data.code,
      name: data.name,
      directionId: data.directionId ?? null,
      icon: data.icon ?? null,
      description: data.description ?? null,
      isActive: data.isActive ?? true
    });

    if (!type) {
      return res.status(500).json({ error: { message: 'Не удалось создать тип объекта учета' } });
    }

    res.status(201).json({
      data: {
        id: type.id,
        code: type.code,
        name: type.name,
        directionId: type.direction_id,
        icon: type.icon,
        description: type.description,
        isActive: type.is_active,
        createdAt: type.created_at,
        updatedAt: type.updated_at
      }
    });
  } catch (e: any) {
    if (e.code === '23505') { // unique violation
      return res.status(400).json({ error: { message: 'Тип объекта учета с таким кодом уже существует' } });
    }
    next(e);
  }
}

export async function updateObjectType(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body;

    const type = await objectsRepo.updateObjectType(id, {
      name: data.name,
      direction_id: data.directionId,
      icon: data.icon,
      description: data.description,
      is_active: data.isActive
    });

    if (!type) {
      return res.status(404).json({ error: { message: 'Тип объекта учета не найден' } });
    }

    res.json({
      data: {
        id: type.id,
        code: type.code,
        name: type.name,
        directionId: type.direction_id,
        icon: type.icon,
        description: type.description,
        isActive: type.is_active,
        createdAt: type.created_at,
        updatedAt: type.updated_at
      }
    });
  } catch (e) {
    next(e);
  }
}

// ========== Object Type Schemas ==========

export async function getObjectTypeSchemas(req: Request, res: Response, next: NextFunction) {
  try {
    const { typeId } = req.params;
    const schemas = await objectsRepo.getObjectTypeSchemas(typeId);

    res.json({
      data: schemas.map((s) => ({
        id: s.id,
        fieldKey: s.field_key,
        label: s.label,
        dataType: s.data_type,
        fieldGroup: s.field_group,
        isRequired: s.is_required,
        isUnique: s.is_unique,
        validationRules: s.validation_rules,
        defaultValue: s.default_value,
        referenceTypeId: s.reference_type_id,
        enumValues: s.enum_values,
        displayOrder: s.display_order
      }))
    });
  } catch (e) {
    next(e);
  }
}

export async function upsertObjectTypeSchema(req: Request, res: Response, next: NextFunction) {
  try {
    const { typeId } = req.params;
    const data = req.body;

    const schema = await objectsRepo.upsertObjectTypeSchema({
      typeId,
      fieldKey: data.fieldKey,
      label: data.label,
      dataType: data.dataType,
      fieldGroup: data.fieldGroup ?? null,
      isRequired: data.isRequired ?? false,
      isUnique: data.isUnique ?? false,
      validationRules: data.validationRules ?? {},
      defaultValue: data.defaultValue,
      referenceTypeId: data.referenceTypeId ?? null,
      enumValues: data.enumValues ?? null,
      displayOrder: data.displayOrder ?? 0
    });

    if (!schema) {
      return res.status(500).json({ error: { message: 'Не удалось сохранить схему поля' } });
    }

    res.json({
      data: {
        id: schema.id,
        fieldKey: schema.field_key,
        label: schema.label,
        dataType: schema.data_type,
        fieldGroup: schema.field_group,
        isRequired: schema.is_required,
        isUnique: schema.is_unique,
        validationRules: schema.validation_rules,
        defaultValue: schema.default_value,
        referenceTypeId: schema.reference_type_id,
        enumValues: schema.enum_values,
        displayOrder: schema.display_order
      }
    });
  } catch (e) {
    next(e);
  }
}

export async function deleteObjectTypeSchema(req: Request, res: Response, next: NextFunction) {
  try {
    const { typeId, fieldKey } = req.params;
    const deleted = await objectsRepo.deleteObjectTypeSchema(typeId, fieldKey);

    if (!deleted) {
      return res.status(404).json({ error: { message: 'Поле схемы не найдено' } });
    }

    res.json({ data: { success: true } });
  } catch (e) {
    next(e);
  }
}

// ========== Object Cards ==========

export async function listObjectCards(req: Request, res: Response, next: NextFunction) {
  try {
    const typeId = (req.query.typeId as string | undefined) ?? undefined;
    const organizationId = (req.query.organizationId as string | undefined) ?? undefined;
    const status = (req.query.status as string | undefined) ?? undefined;
    const search = (req.query.search as string | undefined) ?? undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const { rows, total } = await objectsRepo.listObjectCards({
      typeId,
      organizationId: organizationId === 'null' ? null : organizationId,
      status: status as 'Active' | 'Inactive' | 'Archived' | undefined,
      search,
      limit,
      offset
    });

    res.json({
      data: rows.map((c) => ({
        id: c.id,
        typeId: c.type_id,
        code: c.code,
        name: c.name,
        organizationId: c.organization_id,
        status: c.status,
        attrs: c.attrs,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        createdBy: c.created_by,
        updatedBy: c.updated_by
      })),
      total
    });
  } catch (e) {
    next(e);
  }
}

export async function lookupObjectCard(req: Request, res: Response, next: NextFunction) {
  try {
    const typeId = String(req.query.typeId || '');
    const code = String(req.query.code || '');
    if (!typeId || !code) {
      return res.status(400).json({ error: { message: 'Укажите typeId и code' } });
    }
    const card = await objectsRepo.getObjectCardByTypeAndCode(typeId, code);
    res.json({
      data: card
        ? {
            id: card.id,
            typeId: card.type_id,
            code: card.code,
            name: card.name,
            organizationId: card.organization_id,
            status: card.status,
            attrs: card.attrs,
            createdAt: card.created_at,
            updatedAt: card.updated_at
          }
        : null
    });
  } catch (e) {
    next(e);
  }
}

export async function getObjectCardById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const card = await objectsRepo.getObjectCardById(id);

    if (!card) {
      return res.status(404).json({ error: { message: 'Карточка объекта учета не найдена' } });
    }

    // Загружаем тип объекта и схему
    const type = await objectsRepo.getObjectTypeById(card.type_id);
    const schemas = await objectsRepo.getObjectTypeSchemas(card.type_id);

    // Загружаем историю изменений
    const history = await objectsRepo.getObjectCardHistory(id, 20);

    res.json({
      data: {
        id: card.id,
        typeId: card.type_id,
        typeCode: type?.code,
        typeName: type?.name,
        code: card.code,
        name: card.name,
        organizationId: card.organization_id,
        status: card.status,
        attrs: card.attrs,
        schemas: schemas.map((s) => ({
          fieldKey: s.field_key,
          label: s.label,
          dataType: s.data_type,
          fieldGroup: s.field_group,
          isRequired: s.is_required,
          defaultValue: s.default_value
        })),
        history: history.map((h) => ({
          id: h.id,
          changedBy: h.changed_by,
          changeType: h.change_type,
          fieldKey: h.field_key,
          oldValue: h.old_value,
          newValue: h.new_value,
          comment: h.comment,
          createdAt: h.created_at
        })),
        createdAt: card.created_at,
        updatedAt: card.updated_at,
        createdBy: card.created_by,
        updatedBy: card.updated_by
      }
    });
  } catch (e) {
    next(e);
  }
}

export async function createObjectCard(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    const userId = getUserId(req);

    const orgId = data.organizationId ?? getOrgId(req);
    if (orgId) {
      const type = await objectsRepo.getObjectTypeById(data.typeId);
      if (type) {
        // v2: проверяем подписку организации на тип объекта учета (NONE/ALL/SELECTED)
        if (!isEcofAdmin(req)) {
          const sub = await objectsRepo.getOrgObjectTypeSubscription(orgId, type.id);
          const mode = (sub?.mode ?? 'NONE') as any;
          if (mode === 'NONE') {
            return res.status(403).json({
              error: { message: 'Организация не подписана на данный тип объекта учета' }
            });
          }
        }
      }
    }

    const card = await objectsRepo.createObjectCard({
      typeId: data.typeId,
      code: data.code,
      name: data.name,
      organizationId: orgId ?? null,
      status: data.status ?? 'Active',
      attrs: data.attrs ?? {},
      createdBy: userId
    });

    if (!card) {
      return res.status(500).json({ error: { message: 'Не удалось создать карточку объекта учета' } });
    }

    res.status(201).json({
      data: {
        id: card.id,
        typeId: card.type_id,
        code: card.code,
        name: card.name,
        organizationId: card.organization_id,
        status: card.status,
        attrs: card.attrs,
        createdAt: card.created_at,
        updatedAt: card.updated_at
      }
    });
  } catch (e: any) {
    if (e.code === '23505') { // unique violation
      return res.status(400).json({
        error: { message: 'Карточка объекта учета с таким кодом уже существует для данного типа' }
      });
    }
    next(e);
  }
}

export async function updateObjectCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body;
    const userId = getUserId(req);

    const card = await objectsRepo.updateObjectCard(id, {
      code: data.code,
      name: data.name,
      organization_id: data.organizationId,
      status: data.status,
      attrs: data.attrs,
      updatedBy: userId
    });

    if (!card) {
      return res.status(404).json({ error: { message: 'Карточка объекта учета не найдена' } });
    }

    res.json({
      data: {
        id: card.id,
        typeId: card.type_id,
        code: card.code,
        name: card.name,
        organizationId: card.organization_id,
        status: card.status,
        attrs: card.attrs,
        updatedAt: card.updated_at
      }
    });
  } catch (e: any) {
    if (e.code === '23505') {
      return res.status(400).json({
        error: { message: 'Карточка объекта учета с таким кодом уже существует для данного типа' }
      });
    }
    next(e);
  }
}

export async function deleteObjectCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const deleted = await objectsRepo.deleteObjectCard(id);

    if (!deleted) {
      return res.status(404).json({ error: { message: 'Карточка объекта учета не найдена' } });
    }

    res.json({ data: { success: true } });
  } catch (e) {
    next(e);
  }
}

export async function listSubscribedObjectCards(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    }

    const typeCode = String(req.query.typeCode || '');
    if (!typeCode) {
      return res.status(400).json({ error: { message: 'Укажите typeCode' } });
    }

    const search = (req.query.search as string | undefined) ?? undefined;
    const status = (req.query.status as string | undefined) ?? undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const { type, rows, total } = await objectsRepo.listSubscribedObjectCards({
      orgId,
      typeCode,
      search,
      status,
      limit,
      offset
    });

    if (!type) {
      return res.status(404).json({ error: { message: 'Тип объекта учета не найден' } });
    }

    const sub = await objectsRepo.getOrgObjectTypeSubscription(orgId, type.id);
    const mode = (sub?.mode ?? 'NONE') as any;
    const selectedCount = sub?.selected_count ?? 0;

    res.json({
      data: {
        type: {
          id: type.id,
          code: type.code,
          name: type.name
        },
        subscription: {
          mode,
          selectedCount
        },
        cards: rows.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          organizationId: c.organization_id,
          status: c.status,
          attrs: c.attrs,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        })),
        total
      }
    });
  } catch (e) {
    next(e);
  }
}

// ========== Org subscriptions (v2) ==========

export async function listMyObjectSubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });

    const rows = await objectsRepo.listOrgObjectTypeSubscriptions(orgId);
    res.json({
      data: rows.map((r) => ({
        typeId: r.type_id,
        typeCode: r.type_code,
        typeName: r.type_name,
        mode: r.mode,
        selectedCount: r.selected_count
      }))
    });
  } catch (e) {
    next(e);
  }
}

export async function setMyObjectSubscriptionMode(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });

    const { typeId, mode } = req.body as { typeId: string; mode: objectsRepo.OrgObjectSubscriptionMode };
    const updated = await objectsRepo.upsertOrgObjectTypeSubscription(orgId, typeId, mode);
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
}

export async function listMyObjectSubscriptionCards(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    const { typeId } = req.params as any;

    const cards = await objectsRepo.listOrgSelectedObjectCards(orgId, typeId);
    res.json({
      data: cards.map((c) => ({
        id: c.id,
        typeId: c.type_id,
        code: c.code,
        name: c.name,
        organizationId: c.organization_id,
        status: c.status,
        attrs: c.attrs,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }))
    });
  } catch (e) {
    next(e);
  }
}

export async function setMyObjectSubscriptionCards(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    const { typeId } = req.params as any;
    const { cardIds } = req.body as { cardIds: string[] };

    // При выборе карточек считаем режим SELECTED
    await objectsRepo.upsertOrgObjectTypeSubscription(orgId, typeId, 'SELECTED');
    const r = await objectsRepo.replaceOrgSelectedObjectCards({
      orgId,
      typeId,
      cardIds: Array.isArray(cardIds) ? cardIds : [],
      validateType: true
    });
    res.json({ data: r });
  } catch (e) {
    next(e);
  }
}

/**
 * Карточки типа для выбора в подписке (без учета текущей подписки), но только видимые организации:
 * organization_id IS NULL OR organization_id = orgId
 */
export async function listAvailableCardsForMyOrg(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });

    const typeCode = String(req.query.typeCode || '');
    if (!typeCode) return res.status(400).json({ error: { message: 'Укажите typeCode' } });

    const search = (req.query.search as string | undefined) ?? undefined;
    const status = (req.query.status as string | undefined) ?? undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const type = await objectsRepo.getObjectTypeByCode(typeCode);
    if (!type) return res.status(404).json({ error: { message: 'Тип объекта учета не найден' } });

    // ecof_admin может смотреть всё, остальные — только org/null
    const allowAll = isEcofAdmin(req);

    // Простой запрос с OR-фильтром; используем repo.listObjectCards не можем (там нет OR)
    const p: any[] = [type.id];
    let i = 2;
    const where: string[] = [`c.type_id = $1`];
    if (!allowAll) {
      where.push(`(c.organization_id IS NULL OR c.organization_id = $${i++})`);
      p.push(orgId);
    }
    if (status) {
      where.push(`c.status = $${i++}`);
      p.push(status);
    }
    if (search && search.trim()) {
      where.push(`(c.code ILIKE $${i} OR c.name ILIKE $${i + 1})`);
      const s = `%${search.trim()}%`;
      p.push(s, s);
      i += 2;
    }

    p.push(Math.min(Math.max(limit, 1), 1000), Math.max(offset, 0));
    const r = await pool.query(
      `
      SELECT c.*
      FROM object_cards c
      WHERE ${where.join(' AND ')}
      ORDER BY c.name ASC
      LIMIT $${i++} OFFSET $${i++}
      `,
      p
    );

    res.json({
      data: (r.rows || []).map((c: any) => ({
        id: c.id,
        typeId: c.type_id,
        code: c.code,
        name: c.name,
        organizationId: c.organization_id,
        status: c.status,
        attrs: c.attrs,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }))
    });
  } catch (e) {
    next(e);
  }
}
