import { Router } from 'express';
import * as objectsController from '../controllers/objects.js';
import { validate } from '../middleware/validate.js';
import {
  createObjectTypeSchema,
  updateObjectTypeSchema,
  createObjectTypeSchemaFieldSchema,
  createObjectCardSchema,
  updateObjectCardSchema,
  listObjectCardsSchema,
  setObjectSubscriptionSchema
} from '../validators/objects.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { requireOrgAdmin } from '../middleware/org-admin.js';

const objectsRouter = Router();

// Все routes требуют аутентификации
objectsRouter.use(authenticateToken);

// ========== Object Types (только для ecof_admin) ==========

objectsRouter.get('/types', requireAdmin, objectsController.listObjectTypes);
objectsRouter.get('/types/:id', requireAdmin, objectsController.getObjectTypeById);
objectsRouter.post('/types', requireAdmin, validate(createObjectTypeSchema), objectsController.createObjectType);
objectsRouter.put('/types/:id', requireAdmin, validate(updateObjectTypeSchema), objectsController.updateObjectType);

// ========== Object Type Schemas (только для ecof_admin) ==========

objectsRouter.get('/types/:typeId/schemas', requireAdmin, objectsController.getObjectTypeSchemas);
objectsRouter.post(
  '/types/:typeId/schemas',
  requireAdmin,
  validate(createObjectTypeSchemaFieldSchema),
  objectsController.upsertObjectTypeSchema
);
objectsRouter.put(
  '/types/:typeId/schemas/:fieldKey',
  requireAdmin,
  validate(createObjectTypeSchemaFieldSchema.partial()),
  objectsController.upsertObjectTypeSchema
);
objectsRouter.delete('/types/:typeId/schemas/:fieldKey', requireAdmin, objectsController.deleteObjectTypeSchema);

// ========== Object Cards ==========

// Список карточек (доступен всем авторизованным, но фильтруется по подпискам)
objectsRouter.get('/cards', validate(listObjectCardsSchema), objectsController.listObjectCards);
objectsRouter.get('/cards/:id', objectsController.getObjectCardById);
objectsRouter.post('/cards', validate(createObjectCardSchema), objectsController.createObjectCard);
objectsRouter.put('/cards/:id', validate(updateObjectCardSchema), objectsController.updateObjectCard);
objectsRouter.delete('/cards/:id', requireOrgAdmin, objectsController.deleteObjectCard); // удаление только для админов

// ========== Subscriptions (для org_admin и ecof_admin) ==========

objectsRouter.get('/subscriptions', objectsController.listMyObjectSubscriptions);
objectsRouter.post('/subscriptions', requireOrgAdmin, validate(setObjectSubscriptionSchema), objectsController.setMyObjectSubscription);

// Получение карточек объектов по подписке (для всех авторизованных)
objectsRouter.get('/subscribed-cards', objectsController.listSubscribedObjectCards);

export default objectsRouter;
