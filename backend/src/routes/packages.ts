import { Router } from 'express';
import { getPackages, getPackageById, createPackage } from '../controllers/packages.js';

export const packagesRouter = Router();

packagesRouter.get('/', getPackages);
packagesRouter.get('/:id', getPackageById);
packagesRouter.post('/', createPackage);
