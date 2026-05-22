import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 3,
  manager: 2,
  staff: 1,
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };

export const requireMinRole =
  (minRole: UserRole) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY[minRole]) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
