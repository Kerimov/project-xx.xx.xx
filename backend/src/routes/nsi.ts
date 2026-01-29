// Роуты для работы с НСИ (справочниками)

import { Router } from 'express';
import {
  getOrganizations,
  getOrganizationById,
  getCounterparties,
  getCounterpartyById,
  getContracts,
  getContractById,
  getAccounts,
  getAccountById,
  getWarehouses,
  getWarehouseById
} from '../controllers/nsi.js';

export const nsiRouter = Router();

nsiRouter.get('/organizations', getOrganizations);
nsiRouter.get('/organizations/:id', getOrganizationById);
nsiRouter.get('/counterparties', getCounterparties);
nsiRouter.get('/counterparties/:id', getCounterpartyById);
nsiRouter.get('/contracts', getContracts);
nsiRouter.get('/contracts/:id', getContractById);
nsiRouter.get('/accounts', getAccounts);
nsiRouter.get('/accounts/:id', getAccountById);
nsiRouter.get('/warehouses', getWarehouses);
nsiRouter.get('/warehouses/:id', getWarehouseById);
