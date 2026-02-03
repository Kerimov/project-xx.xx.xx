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
  setObjectSubscriptionModeSchema,
  setObjectSubscriptionCardsSchema,
} from '../validators/objects.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { requireOrgAdmin } from '../middleware/org-admin.js';

const objectsRouter = Router();

// Все routes требуют аутентификации
objectsRouter.use(authenticateToken);

// ========== Object Types ==========
// Чтение типов и схем — всем авторизованным (для вкладки «Объекты учета», подписок, создания карточек).
// Создание/изменение/удаление — только ecof_admin.

objectsRouter.get('/types', objectsController.listObjectTypes);
objectsRouter.get('/types/:id', objectsController.getObjectTypeById);
objectsRouter.post('/types', requireAdmin, validate(createObjectTypeSchema), objectsController.createObjectType);
objectsRouter.put('/types/:id', requireAdmin, validate(updateObjectTypeSchema), objectsController.updateObjectType);

// ========== Object Type Schemas ==========

objectsRouter.get('/types/:typeId/schemas', objectsController.getObjectTypeSchemas);
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
objectsRouter.get('/cards/lookup', objectsController.lookupObjectCard);
// Универсальный resolve по id: карточка объекта или номенклатура НСИ (без 404, для legacy значений в документах)
objectsRouter.get('/cards/resolve/:id', objectsController.resolveCardOrNsiNomenclatureById);
objectsRouter.get('/cards/:id', objectsController.getObjectCardById);
objectsRouter.post('/cards', validate(createObjectCardSchema), objectsController.createObjectCard);
objectsRouter.put('/cards/:id', validate(updateObjectCardSchema), objectsController.updateObjectCard);
objectsRouter.delete('/cards/:id', requireOrgAdmin, objectsController.deleteObjectCard); // удаление только для админов

// Получение карточек объектов по подписке (для всех авторизованных)
objectsRouter.get('/subscribed-cards', objectsController.listSubscribedObjectCards);

// ========== Подписки организации на объекты учета (v2) ==========
// Просмотр — всем (для скрытия полей в формах), управление — org_admin/ecof_admin
objectsRouter.get('/subscriptions', objectsController.listMyObjectSubscriptions);
objectsRouter.post('/subscriptions', requireOrgAdmin, validate(setObjectSubscriptionModeSchema), objectsController.setMyObjectSubscriptionMode);
objectsRouter.get('/subscriptions/:typeId/cards', requireOrgAdmin, objectsController.listMyObjectSubscriptionCards);
objectsRouter.put('/subscriptions/:typeId/cards', requireOrgAdmin, validate(setObjectSubscriptionCardsSchema), objectsController.setMyObjectSubscriptionCards);

// Карточки для выбора при подписке (видимые организации)
objectsRouter.get('/available-cards', requireOrgAdmin, objectsController.listAvailableCardsForMyOrg);

export default objectsRouter;
