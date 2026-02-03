import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
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

// Для дочерних организаций
analyticsRouter.get('/types', validateQuery(listAnalyticsTypesSchema), listAvailableAnalyticsTypes);
analyticsRouter.get('/subscriptions', listMySubscriptions);
analyticsRouter.post('/subscriptions', validate(setSubscriptionSchema), setMySubscription);
analyticsRouter.get('/values', validateQuery(listSubscribedValuesSchema), listSubscribedAnalyticsValues);

analyticsRouter.get('/webhook', getMyWebhook);
analyticsRouter.put('/webhook', validate(upsertWebhookSchema), upsertMyWebhook);
analyticsRouter.post('/webhook/resync', resyncMyAnalytics);

// ADMIN (холдинг владелец аналитик)
const idSchema = z.object({ id: z.string().uuid() });
const orgIdSchema = z.object({ orgId: z.string().uuid() });
analyticsRouter.post('/admin/types', requireRole('ecof_admin', 'admin'), validate(adminCreateAnalyticsTypeSchema), adminCreateAnalyticsType);
analyticsRouter.put('/admin/types/:id', requireRole('ecof_admin', 'admin'), validateParams(idSchema), validate(adminUpdateAnalyticsTypeSchema), adminUpdateAnalyticsType);
analyticsRouter.post('/admin/values', requireRole('ecof_admin', 'admin'), validate(adminUpsertAnalyticsValueSchema), adminUpsertAnalyticsValue);

// Управление подписками организаций админом холдинга
analyticsRouter.get('/admin/orgs/:orgId/subscriptions', requireRole('ecof_admin', 'admin'), validateParams(orgIdSchema), adminListOrgSubscriptions);
analyticsRouter.post('/admin/orgs/:orgId/subscriptions', requireRole('ecof_admin', 'admin'), validateParams(orgIdSchema), validate(setSubscriptionSchema), adminSetOrgSubscription);

