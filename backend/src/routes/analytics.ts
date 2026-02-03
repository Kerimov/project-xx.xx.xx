import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { requireOrgAdmin } from '../middleware/org-admin.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { z } from 'zod';
import {
  adminCreateAnalyticsType,
  adminListOrgSubscriptions,
  adminSetOrgSubscription,
  adminUpdateAnalyticsType,
  adminUpsertAnalyticsValue,
  getMyWebhook,
  listAvailableAnalyticsTypes,
  listMySubscriptions,
  listSubscribedAnalyticsValues,
  resyncMyAnalytics,
  setMySubscription,
  upsertMyWebhook
} from '../controllers/analytics.js';
import {
  adminCreateAnalyticsTypeSchema,
  adminUpdateAnalyticsTypeSchema,
  adminUpsertAnalyticsValueSchema,
  listAnalyticsTypesSchema,
  listSubscribedValuesSchema,
  setSubscriptionSchema,
  upsertWebhookSchema
} from '../validators/analytics.js';

export const analyticsRouter = Router();

analyticsRouter.use(authenticateToken);

// Для всех пользователей с организацией
analyticsRouter.get('/types', validateQuery(listAnalyticsTypesSchema), listAvailableAnalyticsTypes);
analyticsRouter.get('/values', validateQuery(listSubscribedValuesSchema), listSubscribedAnalyticsValues);

// Просмотр подписок - доступен всем пользователям с организацией (для проверки доступных аналитик)
analyticsRouter.get('/subscriptions', listMySubscriptions);

// Управление подписками и webhook - только для администраторов организации
analyticsRouter.post('/subscriptions', requireOrgAdmin, validate(setSubscriptionSchema), setMySubscription);
analyticsRouter.get('/webhook', requireOrgAdmin, getMyWebhook);
analyticsRouter.put('/webhook', requireOrgAdmin, validate(upsertWebhookSchema), upsertMyWebhook);
analyticsRouter.post('/webhook/resync', requireOrgAdmin, resyncMyAnalytics);

// ADMIN (холдинг владелец аналитик) - только администратор ЕЦОФ
const idSchema = z.object({ id: z.string().uuid() });
const orgIdSchema = z.object({ orgId: z.string().uuid() });
analyticsRouter.post('/admin/types', requireRole('ecof_admin'), validate(adminCreateAnalyticsTypeSchema), adminCreateAnalyticsType);
analyticsRouter.put('/admin/types/:id', requireRole('ecof_admin'), validateParams(idSchema), validate(adminUpdateAnalyticsTypeSchema), adminUpdateAnalyticsType);
analyticsRouter.post('/admin/values', requireRole('ecof_admin'), validate(adminUpsertAnalyticsValueSchema), adminUpsertAnalyticsValue);

// Управление подписками организаций админом холдинга
analyticsRouter.get('/admin/orgs/:orgId/subscriptions', requireRole('ecof_admin'), validateParams(orgIdSchema), adminListOrgSubscriptions);
analyticsRouter.post('/admin/orgs/:orgId/subscriptions', requireRole('ecof_admin'), validateParams(orgIdSchema), validate(setSubscriptionSchema), adminSetOrgSubscription);

