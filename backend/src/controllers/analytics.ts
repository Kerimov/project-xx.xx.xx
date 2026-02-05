import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection.js';
import * as analyticsRepo from '../repositories/analytics.js';

function getOrgId(req: Request): string | null {
  return (req as any).user?.organizationId ?? null;
}

export async function listAvailableAnalyticsTypes(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    }

    const orgRes = await pool.query(`SELECT direction_id FROM organizations WHERE id = $1`, [orgId]);
    const directionId: string | null = orgRes.rows[0]?.direction_id ?? null;

    const rows = await analyticsRepo.listAnalyticsTypes({
      directionId: directionId ?? undefined,
      activeOnly: true,
      search: (req.query.search as string | undefined) ?? undefined
    });

    res.json({
      data: rows.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        directionId: t.direction_id,
        isActive: t.is_active
      }))
    });
  } catch (e) {
    next(e);
  }
}

export async function listMySubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });

    const rows = await analyticsRepo.listOrgSubscriptions(orgId);
    res.json({
      data: rows.map((r) => ({
        typeId: r.type_id,
        typeCode: r.type_code,
        typeName: r.type_name,
        isEnabled: r.is_enabled
      }))
    });
  } catch (e) {
    next(e);
  }
}

export async function setMySubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });

    const { typeId, isEnabled } = req.body as { typeId: string; isEnabled: boolean };
    const updated = await analyticsRepo.setSubscription(orgId, typeId, !!isEnabled);

    // Если подписку включили — инициируем snapshot (resync job) для типа
    if (isEnabled) {
      await analyticsRepo.createResyncJobsForOrg(orgId, [typeId]);
    }

    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
}

export async function listSubscribedAnalyticsValues(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });

    const typeCode = String(req.query.typeCode || '');
    if (!typeCode) {
      return res.status(400).json({ error: { message: 'Укажите typeCode' } });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const cursorUpdatedAt = (req.query.cursorUpdatedAt as string | undefined) ?? undefined;
    const cursorId = (req.query.cursorId as string | undefined) ?? undefined;
    const search = (req.query.search as string | undefined) ?? undefined;
    const organizationId = (req.query.organizationId as string | undefined) ?? undefined;
    const counterpartyId = (req.query.counterpartyId as string | undefined) ?? undefined;
    const nsiType = (req.query.type as string | undefined) ?? undefined;
    const activeOnly = (String(req.query.activeOnly || 'true').toLowerCase() !== 'false');

    const { type, rows } = await analyticsRepo.listSubscribedValues({
      orgId,
      typeCode,
      limit,
      cursorUpdatedAt,
      cursorId,
      search,
      organizationId,
      counterpartyId,
      type: nsiType,
      activeOnly
    });

    if (!type) {
      return res.status(404).json({ error: { message: 'Неизвестный typeCode' } });
    }

    const nextCursor =
      rows.length > 0
        ? { cursorUpdatedAt: rows[rows.length - 1].updated_at, cursorId: rows[rows.length - 1].id }
        : null;

    res.json({
      data: rows.map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        attrs: v.attrs ?? {},
        isActive: v.is_active,
        updatedAt: v.updated_at
      })),
      meta: { typeCode: type.code, nextCursor }
    });
  } catch (e) {
    next(e);
  }
}

export async function getMyWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    const row = await analyticsRepo.getOrgWebhook(orgId);
    res.json({
      data: row
        ? {
            url: row.url,
            isActive: row.is_active,
            lastDeliveredSeq: row.last_delivered_seq,
            failCount: row.fail_count,
            lastError: row.last_error,
            nextRetryAt: row.next_retry_at
          }
        : null
    });
  } catch (e) {
    next(e);
  }
}

export async function upsertMyWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });

    const { url, secret, isActive } = req.body as { url: string; secret: string; isActive?: boolean };
    const row = await analyticsRepo.upsertOrgWebhook({
      orgId,
      url,
      secret,
      isActive: isActive ?? true
    });

    // При обновлении вебхука целесообразно инициировать snapshot по всем активным подпискам
    const subs = await analyticsRepo.listOrgSubscriptions(orgId);
    const enabledTypeIds = subs.filter((s) => s.is_enabled).map((s) => s.type_id);
    await analyticsRepo.createResyncJobsForOrg(orgId, enabledTypeIds);

    res.json({ data: row ? { url: row.url, isActive: row.is_active } : null });
  } catch (e) {
    next(e);
  }
}

export async function resyncMyAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: { message: 'У пользователя не задана организация' } });
    const subs = await analyticsRepo.listOrgSubscriptions(orgId);
    const enabledTypeIds = subs.filter((s) => s.is_enabled).map((s) => s.type_id);
    const created = await analyticsRepo.createResyncJobsForOrg(orgId, enabledTypeIds);
    res.json({ data: { created } });
  } catch (e) {
    next(e);
  }
}

// ADMIN

export async function adminCreateAnalyticsType(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, name, directionId, isActive } = req.body as {
      code: string;
      name: string;
      directionId?: string | null;
      isActive?: boolean;
    };
    const row = await analyticsRepo.createAnalyticsType({ code, name, directionId, isActive });
    res.status(201).json({ data: row });
  } catch (e) {
    next(e);
  }
}

export async function adminUpdateAnalyticsType(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, directionId, isActive } = req.body as {
      name?: string;
      directionId?: string | null;
      isActive?: boolean;
    };
    const row = await analyticsRepo.updateAnalyticsType(id, {
      name,
      direction_id: directionId,
      is_active: isActive
    });
    res.json({ data: row });
  } catch (e) {
    next(e);
  }
}

export async function adminUpsertAnalyticsValue(req: Request, res: Response, next: NextFunction) {
  try {
    const { typeCode, code, name, attrs, isActive } = req.body as {
      typeCode: string;
      code: string;
      name: string;
      attrs?: Record<string, unknown>;
      isActive?: boolean;
    };

    const type = await analyticsRepo.getAnalyticsTypeByCode(typeCode);
    if (!type) {
      return res.status(404).json({ error: { message: 'Неизвестный typeCode' } });
    }
    const value = await analyticsRepo.upsertAnalyticsValue({
      typeId: type.id,
      typeCode: type.code,
      code,
      name,
      attrs,
      isActive
    });
    res.json({ data: value });
  } catch (e) {
    next(e);
  }
}

export async function adminListOrgSubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId || '';
    const rows = await analyticsRepo.listOrgSubscriptions(orgId);
    res.json({
      data: rows.map((r) => ({
        orgId: r.org_id,
        typeId: r.type_id,
        typeCode: r.type_code,
        typeName: r.type_name,
        isEnabled: r.is_enabled
      }))
    });
  } catch (e) {
    next(e);
  }
}

export async function adminSetOrgSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId || '';
    const { typeId, isEnabled } = req.body as { typeId: string; isEnabled: boolean };

    const updated = await analyticsRepo.setSubscription(orgId, typeId, !!isEnabled);
    if (isEnabled) {
      await analyticsRepo.createResyncJobsForOrg(orgId, [typeId]);
    }

    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
}

