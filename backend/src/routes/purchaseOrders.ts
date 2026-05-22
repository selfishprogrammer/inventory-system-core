import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder';
import Product from '../models/Product';
import StockMovement from '../models/StockMovement';
import auth from '../middleware/auth';
import { requireMinRole } from '../middleware/roleCheck';
import { getIO } from '../socket';
import { POStatus } from '../types';

const router = Router();
router.use(auth);

const generatePONumber = (): string =>
  `PO-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

const VALID_TRANSITIONS: Record<POStatus, POStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['confirmed', 'cancelled'],
  confirmed: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
  received: [],
  cancelled: [],
};

// GET /api/purchase-orders
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status, supplierId } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { tenantId: req.tenantId };
    if (status) query.status = status;
    if (supplierId) query.supplierId = supplierId;

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('supplierId', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await PurchaseOrder.countDocuments(query);
    res.json({ purchaseOrders, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/purchase-orders
router.post('/', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { supplierId, items, notes, expectedDelivery } = req.body;

    const totalAmount = (items as Array<{ quantity: number; unitPrice: number }>).reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const po = await PurchaseOrder.create({
      tenantId: req.tenantId,
      poNumber: generatePONumber(),
      supplierId,
      items,
      totalAmount,
      notes,
      expectedDelivery,
      createdBy: req.user!._id,
    });

    await po.populate([
      { path: 'supplierId', select: 'name email' },
      { path: 'createdBy', select: 'name' },
    ]);

    res.status(201).json(po);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/purchase-orders/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('supplierId', 'name email phone contactPerson address')
      .populate('createdBy', 'name');
    if (!po) { res.status(404).json({ error: 'Purchase order not found' }); return; }
    res.json(po);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/purchase-orders/:id (edit draft only)
router.put('/:id', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!po) { res.status(404).json({ error: 'Purchase order not found' }); return; }
    if (po.status !== 'draft') {
      res.status(400).json({ error: 'Only draft purchase orders can be edited' });
      return;
    }

    const { supplierId, items, notes, expectedDelivery } = req.body;
    const totalAmount = (items as Array<{ quantity: number; unitPrice: number }>).reduce(
      (sum, i) => sum + i.quantity * i.unitPrice, 0
    );
    Object.assign(po, { supplierId, items, notes, expectedDelivery, totalAmount });
    await po.save();
    res.json(po);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PATCH /api/purchase-orders/:id/status
router.patch('/:id/status', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body as { status: POStatus };

    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!po) { res.status(404).json({ error: 'Purchase order not found' }); return; }

    if (!VALID_TRANSITIONS[po.status]?.includes(status)) {
      res.status(400).json({ error: `Cannot transition from "${po.status}" to "${status}"` });
      return;
    }

    po.status = status;
    await po.save();
    res.json(po);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/purchase-orders/:id/receive
router.post('/:id/receive', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { receivedItems } = req.body as {
      receivedItems: Array<{ itemId: string; receivedQuantity: number; actualUnitPrice?: number }>;
    };

    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.tenantId }).session(session);
    if (!po) {
      await session.abortTransaction();
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    if (!['confirmed', 'partially_received'].includes(po.status)) {
      await session.abortTransaction();
      res.status(400).json({ error: 'Purchase order must be confirmed before receiving stock' });
      return;
    }

    for (const { itemId, receivedQuantity, actualUnitPrice } of receivedItems) {
      const item = po.items.id(itemId);
      if (!item) continue;

      const remaining = item.quantity - item.receivedQuantity;
      const toReceive = Math.min(Math.max(0, receivedQuantity), remaining);
      if (toReceive === 0) continue;

      item.receivedQuantity += toReceive;
      if (actualUnitPrice != null) item.unitPrice = actualUnitPrice;

      const product = await Product.findOneAndUpdate(
        { _id: item.productId, tenantId: req.tenantId },
        { $inc: { 'variants.$[elem].stock': toReceive } },
        { arrayFilters: [{ 'elem.sku': item.variantSku }], new: true, session }
      );

      if (product) {
        const variant = product.variants.find((v) => v.sku === item.variantSku);
        await StockMovement.create(
          [{
            tenantId: req.tenantId,
            productId: item.productId,
            variantSku: item.variantSku,
            type: 'purchase',
            quantity: toReceive,
            previousStock: (variant?.stock ?? 0) - toReceive,
            newStock: variant?.stock ?? 0,
            referenceId: po._id,
            reference: po.poNumber,
            userId: req.user!._id,
          }],
          { session }
        );
      }
    }

    const allReceived = po.items.every((i) => i.receivedQuantity >= i.quantity);
    const anyReceived = po.items.some((i) => i.receivedQuantity > 0);

    if (allReceived) { po.status = 'received'; po.receivedAt = new Date(); }
    else if (anyReceived) { po.status = 'partially_received'; }

    await po.save({ session });
    await session.commitTransaction();

    try {
      getIO().to(`tenant:${req.tenantId}`).emit('po-received', { poId: po._id });
    } catch (_) { /* socket not critical */ }

    res.json(po);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: (error as Error).message });
  } finally {
    session.endSession();
  }
});

export default router;
