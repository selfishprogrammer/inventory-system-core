import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import StockMovement from '../models/StockMovement';
import auth from '../middleware/auth';
import { requireMinRole } from '../middleware/roleCheck';
import { getIO } from '../socket';

const router = Router();
router.use(auth);

const generateOrderNumber = (): string =>
  `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

interface OrderItemInput {
  productId: string;
  variantSku: string;
  quantity: number;
}

// GET /api/orders
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { tenantId: req.tenantId };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);
    res.json({ orders, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/orders — atomic stock deduction, race-condition safe
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerName, customerEmail, items, notes } = req.body as {
      customerName: string;
      customerEmail?: string;
      items: OrderItemInput[];
      notes?: string;
    };

    if (!items || items.length === 0) {
      await session.abortTransaction();
      res.status(400).json({ error: 'Order must have at least one item' });
      return;
    }

    let totalAmount = 0;
    const processedItems: Record<string, unknown>[] = [];

    for (const item of items) {
      const { productId, variantSku, quantity } = item;

      if (!quantity || quantity < 1) {
        await session.abortTransaction();
        res.status(400).json({ error: 'Quantity must be at least 1' });
        return;
      }

      // Atomic decrement — the condition prevents negative stock even under concurrency
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          tenantId: req.tenantId,
          isActive: true,
          variants: { $elemMatch: { sku: variantSku, stock: { $gte: quantity } } },
        },
        { $inc: { 'variants.$[elem].stock': -quantity } },
        { arrayFilters: [{ 'elem.sku': variantSku }], new: true, session }
      );

      if (!updatedProduct) {
        await session.abortTransaction();
        res.status(409).json({ error: `Insufficient stock for SKU: ${variantSku}`, code: 'INSUFFICIENT_STOCK', variantSku });
        return;
      }

      const variant = updatedProduct.variants.find((v) => v.sku === variantSku);
      if (!variant) {
        await session.abortTransaction();
        res.status(404).json({ error: `Variant ${variantSku} not found` });
        return;
      }

      const previousStock = variant.stock + quantity;

      await StockMovement.create(
        [{
          tenantId: req.tenantId,
          productId,
          variantSku,
          type: 'sale',
          quantity: -quantity,
          previousStock,
          newStock: variant.stock,
          userId: req.user!._id,
        }],
        { session }
      );

      processedItems.push({
        productId,
        productName: updatedProduct.name,
        variantSku,
        variantAttributes: variant.attributes,
        quantity,
        unitPrice: variant.price,
        fulfilledQuantity: quantity,
      });

      totalAmount += variant.price * quantity;
    }

    const [order] = await Order.create(
      [{
        tenantId: req.tenantId,
        orderNumber: generateOrderNumber(),
        customerName,
        customerEmail,
        status: 'fulfilled',
        items: processedItems,
        totalAmount,
        notes,
        createdBy: req.user!._id,
      }],
      { session }
    );

    await session.commitTransaction();

    try {
      getIO().to(`tenant:${req.tenantId}`).emit('order-created', { orderId: order._id });
    } catch (_) { /* socket not critical */ }

    const populated = await Order.findById(order._id).populate('createdBy', 'name');
    res.status(201).json(populated);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: (error as Error).message });
  } finally {
    session.endSession();
  }
});

// GET /api/orders/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('createdBy', 'name');
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', requireMinRole('manager'), async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId }).session(session);
    if (!order) {
      await session.abortTransaction();
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status === 'cancelled') {
      await session.abortTransaction();
      res.status(400).json({ error: 'Order is already cancelled' });
      return;
    }

    for (const item of order.items) {
      const restoreQty = item.fulfilledQuantity;
      if (restoreQty <= 0) continue;

      const product = await Product.findOneAndUpdate(
        { _id: item.productId, tenantId: req.tenantId },
        { $inc: { 'variants.$[elem].stock': restoreQty } },
        { arrayFilters: [{ 'elem.sku': item.variantSku }], new: true, session }
      );

      if (product) {
        const variant = product.variants.find((v) => v.sku === item.variantSku);
        await StockMovement.create(
          [{
            tenantId: req.tenantId,
            productId: item.productId,
            variantSku: item.variantSku,
            type: 'return',
            quantity: restoreQty,
            previousStock: (variant?.stock ?? 0) - restoreQty,
            newStock: variant?.stock ?? 0,
            referenceId: order._id,
            reference: order.orderNumber,
            userId: req.user!._id,
            note: 'Order cancelled — stock restored',
          }],
          { session }
        );
      }
    }

    order.status = 'cancelled';
    await order.save({ session });
    await session.commitTransaction();
    res.json(order);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: (error as Error).message });
  } finally {
    session.endSession();
  }
});

export default router;
