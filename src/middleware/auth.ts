import type { Request, Response, NextFunction } from 'express';
import {
  getUserByEmail,
  verifySessionToken,
} from '../db/repository.ts';

export interface AdminUserRecord {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_ADMIN';
  assignedClass: string | null;
  status: string;
}

export interface AuthRequest extends Request {
  adminUser?: AdminUserRecord;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Unauthorized: Administrator authentication required.' });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    // Check backend session token (from Username/Email and Password administrator login)
    const sessionClaims = verifySessionToken(token);
    if (!sessionClaims) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: Invalid or expired administrator session.' });
    }

    const dbUser = await getUserByEmail(sessionClaims.email);
    if (!dbUser || dbUser.status !== 'ACTIVE') {
      return res
        .status(403)
        .json({ error: 'Access denied: Administrator account is inactive or revoked.' });
    }

    req.adminUser = {
      id: dbUser.id,
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_ADMIN',
      assignedClass: dbUser.assignedClass,
      status: dbUser.status,
    };
    return next();
  } catch (error) {
    console.error('Error verifying administrator authentication token:', error);
    return res
      .status(401)
      .json({ error: 'Unauthorized: Invalid or expired administrator session.' });
  }
};

export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.adminUser || req.adminUser.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Forbidden: User management strictly requires Super Admin privileges.',
    });
  }
  return next();
};

export const requireGlobalControl = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (
    !req.adminUser ||
    (req.adminUser.role !== 'SUPER_ADMIN' && req.adminUser.role !== 'TEACHER')
  ) {
    return res.status(403).json({
      error: 'Forbidden: This operation requires Super Admin or Teacher privileges.',
    });
  }
  return next();
};

export function canAccessClass(
  adminUser: AdminUserRecord | undefined,
  targetClassCode: string
): boolean {
  if (!adminUser || adminUser.status !== 'ACTIVE') return false;
  if (adminUser.role === 'SUPER_ADMIN' || adminUser.role === 'TEACHER') {
    return true;
  }
  if (
    adminUser.role === 'CLASS_ADMIN' &&
    adminUser.assignedClass === targetClassCode
  ) {
    return true;
  }
  return false;
}
