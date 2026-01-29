// Роуты для работы с НСИ (справочниками)

import { Router } from 'express';
import {
  getOrganizations,
  getCounterparties,
  getContracts,
  getAccounts,
  getWarehouses
} from '../controllers/nsi.js';

export const nsiRouter = Router();

nsiRouter.get('/organizations', getOrganizations);
nsiRouter.get('/counterparties', getCounterparties);
nsiRouter.get('/contracts', getContracts);
nsiRouter.get('/accounts', getAccounts);
nsiRouter.get('/warehouses', getWarehouses);
