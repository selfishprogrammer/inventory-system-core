import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface JwtPayload {
  id: string;
}

const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = user;
    req.tenantId = user.tenantId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export default auth;
