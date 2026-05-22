import { Router, Request, Response } from 'express';
import Product from '../models/Product';
import StockMovement from '../models/StockMovement';
import auth from '../middleware/auth';
import { requireMinRole } from '../middleware/roleCheck';
import { getIO } from '../socket';

const router = Router();
router.use(auth);

// GET /api/products
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', category, search } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { tenantId: req.tenantId, isActive: true };

    if (category) query.category = category;
    if (search) query.$text = { $search: search };

    const products = await Product.find(query)
      .populate('supplierId', 'name email')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/products/categories
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Product.distinct('category', { tenantId: req.tenantId, isActive: true });
    res.json((categories as string[]).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/products
router.post('/', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, category, supplierId, attributes, variants } = req.body;

    if (variants?.length > 0) {
      const skus = variants.map((v: { sku: string }) => v.sku);
      const duplicate = await Product.findOne({ tenantId: req.tenantId, 'variants.sku': { $in: skus } });
      if (duplicate) {
        res.status(400).json({ error: 'One or more SKUs already exist in this tenant' });
        return;
      }
    }

    const product = await Product.create({
      tenantId: req.tenantId,
      name, description, category, supplierId,
      attributes: attributes ?? [],
      variants: variants ?? [],
    });

    if (variants?.length > 0) {
      const movements = variants
        .filter((v: { stock: number }) => v.stock > 0)
        .map((v: { sku: string; stock: number }) => ({
          tenantId: req.tenantId,
          productId: product._id,
          variantSku: v.sku,
          type: 'adjustment' as const,
          quantity: v.stock,
          previousStock: 0,
          newStock: v.stock,
          userId: req.user!._id,
          note: 'Initial stock on product creation',
        }));
      if (movements.length > 0) await StockMovement.insertMany(movements);
    }

    await product.populate('supplierId', 'name email');
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('supplierId', 'name email phone contactPerson');
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/products/:id
router.put('/:id', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, category, supplierId, attributes } = req.body;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { name, description, category, supplierId, attributes },
      { new: true, runValidators: true }
    ).populate('supplierId', 'name email');
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { isActive: false },
      { new: true }
    );
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json({ message: 'Product archived successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/products/:id/adjust
router.post('/:id/adjust', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { variantSku, quantity, note } = req.body as {
      variantSku: string;
      quantity: string;
      note?: string;
    };

    const product = await Product.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    const variantIndex = product.variants.findIndex((v) => v.sku === variantSku);
    if (variantIndex === -1) { res.status(404).json({ error: 'Variant SKU not found' }); return; }

    const previousStock = product.variants[variantIndex].stock;
    const newStock = previousStock + parseInt(quantity);

    if (newStock < 0) {
      res.status(400).json({ error: 'Stock cannot go below zero' });
      return;
    }

    const updated = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { [`variants.${variantIndex}.stock`]: newStock } },
      { new: true }
    );

    await StockMovement.create({
      tenantId: req.tenantId,
      productId: product._id,
      variantSku,
      type: 'adjustment',
      quantity: parseInt(quantity),
      previousStock,
      newStock,
      userId: req.user!._id,
      note,
    });

    try {
      getIO().to(`tenant:${req.tenantId}`).emit('stock-updated', { productId: product._id, variantSku, newStock });
    } catch (_) { /* socket not critical */ }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/products/:id/movements
router.get('/:id/movements', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '30' } = req.query as Record<string, string>;

    const movements = await StockMovement.find({ tenantId: req.tenantId, productId: req.params.id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await StockMovement.countDocuments({ tenantId: req.tenantId, productId: req.params.id });
    res.json({ movements, total });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
