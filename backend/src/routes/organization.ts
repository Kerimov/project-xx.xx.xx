import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requireOrgAdmin } from '../middleware/org-admin.js';
import * as orgController from '../controllers/organization.js';
import {
  assignEmployeeSchema,
  updateEmployeeRoleSchema,
  searchUsersSchema,
} from '../validators/organization.js';

export const organizationRouter = Router();

// Все маршруты требуют аутентификации
organizationRouter.use(authenticateToken);

// Информация об организации текущего пользователя
organizationRouter.get('/me', orgController.getMyOrganization);

// Сотрудники организации (только для просмотра доступны всем)
organizationRouter.get('/employees', orgController.getMyEmployees);

// Управление сотрудниками - только для администраторов организации
organizationRouter.get('/employees/search', requireOrgAdmin, validate(searchUsersSchema, 'query'), orgController.searchUsers);
organizationRouter.post('/employees', requireOrgAdmin, validate(assignEmployeeSchema), orgController.assignEmployee);
organizationRouter.put('/employees/:id/role', requireOrgAdmin, validate(updateEmployeeRoleSchema), orgController.updateEmployeeRole);
organizationRouter.delete('/employees/:id', requireOrgAdmin, orgController.unassignEmployee);
