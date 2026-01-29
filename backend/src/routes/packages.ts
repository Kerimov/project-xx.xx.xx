import { Router } from 'express';
import { getPackages, getPackageById, createPackage } from '../controllers/packages.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import {
  createPackageSchema,
  listPackagesSchema
} from '../validators/packages.js';
import { z } from 'zod';

export const packagesRouter = Router();

const packageIdSchema = z.object({
  id: z.string().uuid('Invalid package ID format')
});

packagesRouter.get('/', validateQuery(listPackagesSchema), getPackages);
packagesRouter.get('/:id', validateParams(packageIdSchema), getPackageById);
packagesRouter.post('/', validate(createPackageSchema), createPackage);
