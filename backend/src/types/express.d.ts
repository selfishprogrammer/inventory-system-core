import { Types } from 'mongoose';
import { IUser } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      tenantId?: Types.ObjectId;
    }
  }
}

export {};
