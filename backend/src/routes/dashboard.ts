import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import Product from '../models/Product';
import StockMovement from '../models/StockMovement';
import Order from '../models/Order';
import PurchaseOrder from '../models/PurchaseOrder';
import auth from '../middleware/auth';

const router = Router();
router.use(auth);

// GET /api/dashboard/stats
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId as Types.ObjectId;

    const [products, totalOrders, revenueAgg, pendingPOs] = await Promise.all([
      Product.find({ tenantId, isActive: true }, 'variants'),
      Order.countDocuments({ tenantId, status: { $ne: 'cancelled' } }),
      Order.aggregate([
        { $match: { tenantId, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      PurchaseOrder.countDocuments({
        tenantId,
        status: { $in: ['draft', 'sent', 'confirmed', 'partially_received'] },
      }),
    ]);

    let totalInventoryValue = 0;
    let totalSkus = 0;
    let lowStockCount = 0;

    for (const product of products) {
      for (const variant of product.variants) {
        totalInventoryValue += variant.stock * variant.costPrice;
        totalSkus++;
        if (variant.stock <= variant.lowStockThreshold) lowStockCount++;
      }
    }

    res.json({
      totalProducts: products.length,
      totalSkus,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalOrders,
      totalRevenue: (revenueAgg[0] as { total?: number } | undefined)?.total ?? 0,
      pendingPOs,
      lowStockCount,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/dashboard/low-stock — smart: only flag if (stock + pendingPO) < threshold
router.get('/low-stock', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId as Types.ObjectId;

    const pendingPOItems = await PurchaseOrder.aggregate([
      { $match: { tenantId, status: { $in: ['draft', 'sent', 'confirmed', 'partially_received'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { productId: '$items.productId', variantSku: '$items.variantSku' },
          pendingQuantity: { $sum: { $subtract: ['$items.quantity', '$items.receivedQuantity'] } },
        },
      },
    ]) as Array<{ _id: { productId: Types.ObjectId; variantSku: string }; pendingQuantity: number }>;

    const pendingMap = new Map<string, number>();
    for (const row of pendingPOItems) {
      pendingMap.set(`${row._id.productId}-${row._id.variantSku}`, row.pendingQuantity);
    }

    const products = await Product.find({ tenantId, isActive: true }).populate('supplierId', 'name');

    const lowStockItems = [];
    for (const product of products) {
      for (const variant of product.variants) {
        const key = `${product._id}-${variant.sku}`;
        const pendingQty = pendingMap.get(key) ?? 0;
        const effectiveStock = variant.stock + pendingQty;

        if (effectiveStock < variant.lowStockThreshold) {
          lowStockItems.push({
            productId: product._id,
            productName: product.name,
            category: product.category,
            supplierName: (product.supplierId as unknown as { name?: string } | null)?.name ?? null,
            variantSku: variant.sku,
            variantAttributes: variant.attributes,
            currentStock: variant.stock,
            pendingPOQuantity: pendingQty,
            effectiveStock,
            lowStockThreshold: variant.lowStockThreshold,
            reorderPoint: variant.reorderPoint,
          });
        }
      }
    }

    res.json(lowStockItems.sort((a, b) => a.effectiveStock - b.effectiveStock));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/dashboard/top-sellers
router.get('/top-sellers', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId as Types.ObjectId;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const topSellers = await StockMovement.aggregate([
      { $match: { tenantId, type: 'sale', createdAt: { $gte: since } } },
      { $group: { _id: { productId: '$productId', variantSku: '$variantSku' }, totalSold: { $sum: { $abs: '$quantity' } } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id.productId', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { productId: '$_id.productId', productName: '$product.name', category: '$product.category', variantSku: '$_id.variantSku', totalSold: 1 } },
    ]);

    res.json(topSellers);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/dashboard/stock-movements
router.get('/stock-movements', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId as Types.ObjectId;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const raw = await StockMovement.aggregate([
      { $match: { tenantId, createdAt: { $gte: since } } },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$type' }, total: { $sum: { $abs: '$quantity' } } } },
      { $sort: { '_id.date': 1 } },
    ]) as Array<{ _id: { date: string; type: string }; total: number }>;

    const days = Array.from({ length: 7 }, (_, i) =>
      new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );

    const chartData = days.map((date) => {
      const entry: Record<string, number | string> = { date };
      for (const type of ['purchase', 'sale', 'return', 'adjustment']) {
        const found = raw.find((r) => r._id.date === date && r._id.type === type);
        entry[type] = found ? found.total : 0;
      }
      return entry;
    });

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
