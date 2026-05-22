import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Tenant from '../models/Tenant';
import User from '../models/User';
import auth from '../middleware/auth';
import { requireMinRole } from '../middleware/roleCheck';

const router = Router();

const signToken = (userId: string): string =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE ?? '7d',
  });

// POST /api/auth/register — create new tenant + owner
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessName, name, email, password } = req.body as {
      businessName: string;
      name: string;
      email: string;
      password: string;
    };

    if (!businessName || !name || !email || !password) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    let slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await Tenant.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    const tenant = await Tenant.create({ name: businessName, slug });
    const user = await User.create({ tenantId: tenant._id, name, email, password, role: 'owner' });

    const token = signToken(user._id.toString());
    res.status(201).json({ token, user, tenant });
  } catch (error) {
    const err = error as { code?: number; message: string };
    if (err.code === 11000) {
      res.status(400).json({ error: 'Email already registered for this tenant' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, tenantSlug } = req.body as {
      email: string;
      password: string;
      tenantSlug?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const tenantFilter: Record<string, unknown> = {};
    if (tenantSlug) {
      const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });
      if (!tenant) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      tenantFilter.tenantId = tenant._id;
    }

    const user = await User.findOne({ email: email.toLowerCase(), ...tenantFilter }).select('+password');
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const tenant = await Tenant.findById(user.tenantId);
    const token = signToken(user._id.toString());
    res.json({ token, user, tenant });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    res.json({ user: req.user, tenant });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/auth/invite
router.post('/invite', auth, requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role: string;
    };

    if (role === 'owner') {
      res.status(400).json({ error: 'Cannot invite another owner' });
      return;
    }

    const user = await User.create({
      tenantId: req.tenantId,
      name,
      email,
      password,
      role: role ?? 'staff',
    });

    res.status(201).json(user);
  } catch (error) {
    const err = error as { code?: number; message: string };
    if (err.code === 11000) {
      res.status(400).json({ error: 'Email already exists in this organisation' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users
router.get('/users', auth, requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
