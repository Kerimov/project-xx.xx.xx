import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
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

// Сотрудники организации
organizationRouter.get('/employees', orgController.getMyEmployees);
organizationRouter.get('/employees/search', validate(searchUsersSchema, 'query'), orgController.searchUsers);
organizationRouter.post('/employees', validate(assignEmployeeSchema), orgController.assignEmployee);
organizationRouter.put('/employees/:id/role', validate(updateEmployeeRoleSchema), orgController.updateEmployeeRole);
organizationRouter.delete('/employees/:id', orgController.unassignEmployee);
