import { Router, Request, Response } from 'express';
import Supplier from '../models/Supplier';
import auth from '../middleware/auth';
import { requireMinRole } from '../middleware/roleCheck';

const router = Router();
router.use(auth);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await Supplier.find({ tenantId: req.tenantId, isActive: true }).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!supplier) { res.status(404).json({ error: 'Supplier not found' }); return; }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/:id', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) { res.status(404).json({ error: 'Supplier not found' }); return; }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/:id', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    await Supplier.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { isActive: false });
    res.json({ message: 'Supplier removed' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
