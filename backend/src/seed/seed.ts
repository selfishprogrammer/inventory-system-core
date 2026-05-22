import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Tenant from '../models/Tenant';
import User from '../models/User';
import Supplier from '../models/Supplier';
import Product from '../models/Product';
import PurchaseOrder from '../models/PurchaseOrder';
import Order from '../models/Order';
import StockMovement from '../models/StockMovement';

async function seed(): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    await Promise.all([
      Tenant.deleteMany({}),
      User.deleteMany({}),
      Supplier.deleteMany({}),
      Product.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      Order.deleteMany({}),
      StockMovement.deleteMany({}),
    ]);
    console.log('deleted all data');

    const tenant1 = await Tenant.create({ name: 'FashionHub Store', slug: 'fashionhub', plan: 'professional' });

    const [owner1, manager1, staff1] = await Promise.all([
      User.create({ tenantId: tenant1._id, name: 'Arjun Sharma', email: 'owner@fashionhub.com', password: 'password123', role: 'owner' }),
      User.create({ tenantId: tenant1._id, name: 'Priya Verma', email: 'manager@fashionhub.com', password: 'password123', role: 'manager' }),
      User.create({ tenantId: tenant1._id, name: 'Ravi Kumar', email: 'staff@fashionhub.com', password: 'password123', role: 'staff' }),
    ]);

    const [supplier1a, supplier1b] = await Promise.all([
      Supplier.create({ tenantId: tenant1._id, name: 'Delhi Textiles Co.', email: 'contact@delhitextiles.com', phone: '+91-9876543210', contactPerson: 'Ramesh Gupta', address: { city: 'Delhi', country: 'India' }, paymentTerms: 30 }),
      Supplier.create({ tenantId: tenant1._id, name: 'Mumbai Fashion Hub', email: 'orders@mumbaifashion.com', phone: '+91-9876543211', contactPerson: 'Kavita Nair', address: { city: 'Mumbai', country: 'India' }, paymentTerms: 45 }),
    ]);

    const tshirt = await Product.create({
      tenantId: tenant1._id,
      name: 'Classic Cotton T-Shirt',
      description: 'Premium 100% cotton crew-neck t-shirt',
      category: 'Apparel',
      supplierId: supplier1a._id,
      attributes: [
        { name: 'size', values: ['S', 'M', 'L', 'XL'] },
        { name: 'color', values: ['White', 'Black', 'Navy'] },
      ],
      variants: [
        { sku: 'TSHIRT-S-WHITE', attributes: { size: 'S', color: 'White' }, price: 799, costPrice: 350, stock: 50, lowStockThreshold: 10 },
        { sku: 'TSHIRT-S-BLACK', attributes: { size: 'S', color: 'Black' }, price: 799, costPrice: 350, stock: 30, lowStockThreshold: 10 },
        { sku: 'TSHIRT-M-WHITE', attributes: { size: 'M', color: 'White' }, price: 799, costPrice: 350, stock: 80, lowStockThreshold: 15 },
        { sku: 'TSHIRT-M-BLACK', attributes: { size: 'M', color: 'Black' }, price: 799, costPrice: 350, stock: 60, lowStockThreshold: 15 },
        { sku: 'TSHIRT-M-NAVY',  attributes: { size: 'M', color: 'Navy' },  price: 849, costPrice: 380, stock: 8,  lowStockThreshold: 10 },
        { sku: 'TSHIRT-L-WHITE', attributes: { size: 'L', color: 'White' }, price: 849, costPrice: 380, stock: 45, lowStockThreshold: 10 },
        { sku: 'TSHIRT-L-BLACK', attributes: { size: 'L', color: 'Black' }, price: 849, costPrice: 380, stock: 3,  lowStockThreshold: 10 },
        { sku: 'TSHIRT-XL-WHITE',attributes: { size: 'XL',color: 'White' }, price: 899, costPrice: 400, stock: 20, lowStockThreshold: 8  },
        { sku: 'TSHIRT-XL-BLACK',attributes: { size: 'XL',color: 'Black' }, price: 899, costPrice: 400, stock: 15, lowStockThreshold: 8  },
      ],
    });

    const jeans = await Product.create({
      tenantId: tenant1._id,
      name: 'Slim Fit Denim Jeans',
      description: 'Premium stretch denim, slim fit',
      category: 'Apparel',
      supplierId: supplier1b._id,
      attributes: [
        { name: 'size',  values: ['28', '30', '32', '34', '36'] },
        { name: 'color', values: ['Blue', 'Black'] },
      ],
      variants: [
        { sku: 'JEANS-28-BLUE',  attributes: { size: '28', color: 'Blue' },  price: 1499, costPrice: 700, stock: 25, lowStockThreshold: 5 },
        { sku: 'JEANS-30-BLUE',  attributes: { size: '30', color: 'Blue' },  price: 1499, costPrice: 700, stock: 40, lowStockThreshold: 8 },
        { sku: 'JEANS-32-BLUE',  attributes: { size: '32', color: 'Blue' },  price: 1499, costPrice: 700, stock: 35, lowStockThreshold: 8 },
        { sku: 'JEANS-32-BLACK', attributes: { size: '32', color: 'Black' }, price: 1599, costPrice: 750, stock: 4,  lowStockThreshold: 8 },
        { sku: 'JEANS-34-BLUE',  attributes: { size: '34', color: 'Blue' },  price: 1499, costPrice: 700, stock: 20, lowStockThreshold: 5 },
        { sku: 'JEANS-34-BLACK', attributes: { size: '34', color: 'Black' }, price: 1599, costPrice: 750, stock: 12, lowStockThreshold: 5 },
      ],
    });

    const sneakers = await Product.create({
      tenantId: tenant1._id,
      name: 'Urban Sneakers',
      description: 'Lightweight casual sneakers with memory foam',
      category: 'Footwear',
      supplierId: supplier1a._id,
      attributes: [
        { name: 'size',  values: ['7', '8', '9', '10', '11'] },
        { name: 'color', values: ['White', 'Black', 'Grey'] },
      ],
      variants: [
        { sku: 'SNKR-7-WHITE',  attributes: { size: '7',  color: 'White' }, price: 2499, costPrice: 1100, stock: 15, lowStockThreshold: 5 },
        { sku: 'SNKR-8-WHITE',  attributes: { size: '8',  color: 'White' }, price: 2499, costPrice: 1100, stock: 20, lowStockThreshold: 5 },
        { sku: 'SNKR-9-BLACK',  attributes: { size: '9',  color: 'Black' }, price: 2499, costPrice: 1100, stock: 18, lowStockThreshold: 5 },
        { sku: 'SNKR-10-BLACK', attributes: { size: '10', color: 'Black' }, price: 2499, costPrice: 1100, stock: 2,  lowStockThreshold: 5 },
        { sku: 'SNKR-10-GREY',  attributes: { size: '10', color: 'Grey' },  price: 2499, costPrice: 1100, stock: 10, lowStockThreshold: 5 },
      ],
    });

    // stock movement history (7 days)
    const movementDocs = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      movementDocs.push(
        { tenantId: tenant1._id, productId: tshirt._id,   variantSku: 'TSHIRT-M-BLACK', type: 'sale', quantity: -3, previousStock: 63, newStock: 60, userId: staff1._id, createdAt: date },
        { tenantId: tenant1._id, productId: jeans._id,    variantSku: 'JEANS-30-BLUE',  type: 'sale', quantity: -2, previousStock: 42, newStock: 40, userId: staff1._id, createdAt: date },
        { tenantId: tenant1._id, productId: sneakers._id, variantSku: 'SNKR-9-BLACK',   type: 'sale', quantity: -1, previousStock: 19, newStock: 18, userId: staff1._id, createdAt: date }
      );
    }
    await StockMovement.insertMany(movementDocs);

    await PurchaseOrder.create({
      tenantId: tenant1._id,
      poNumber: `PO-${Date.now()}-SEED1`,
      supplierId: supplier1a._id,
      status: 'confirmed',
      items: [
        { productId: tshirt._id, productName: tshirt.name, variantSku: 'TSHIRT-L-BLACK', variantAttributes: { size: 'L', color: 'Black' }, quantity: 50, unitPrice: 380, receivedQuantity: 0 },
        { productId: tshirt._id, productName: tshirt.name, variantSku: 'TSHIRT-M-NAVY',  variantAttributes: { size: 'M', color: 'Navy'  }, quantity: 40, unitPrice: 380, receivedQuantity: 0 },
        { productId: sneakers._id, productName: sneakers.name, variantSku: 'SNKR-10-BLACK', variantAttributes: { size: '10', color: 'Black' }, quantity: 30, unitPrice: 1100, receivedQuantity: 0 },
      ],
      totalAmount: 50 * 380 + 40 * 380 + 30 * 1100,
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: manager1._id,
    });

    await Order.create([
      {
        tenantId: tenant1._id, orderNumber: `ORD-${Date.now()}-001`, customerName: 'Sunita Patel', customerEmail: 'sunita@example.com', status: 'fulfilled',
        items: [
          { productId: tshirt._id, productName: tshirt.name, variantSku: 'TSHIRT-M-WHITE', quantity: 2, unitPrice: 799, fulfilledQuantity: 2 },
          { productId: jeans._id, productName: jeans.name, variantSku: 'JEANS-32-BLUE', quantity: 1, unitPrice: 1499, fulfilledQuantity: 1 },
        ],
        totalAmount: 2 * 799 + 1499, createdBy: staff1._id,
      },
      {
        tenantId: tenant1._id, orderNumber: `ORD-${Date.now()}-002`, customerName: 'Mohit Agarwal', status: 'fulfilled',
        items: [{ productId: sneakers._id, productName: sneakers.name, variantSku: 'SNKR-9-BLACK', quantity: 1, unitPrice: 2499, fulfilledQuantity: 1 }],
        totalAmount: 2499, createdBy: staff1._id,
      },
    ]);

    //gadget

    const tenant2 = await Tenant.create({ name: 'TechGadgets Wholesale', slug: 'techgadgets', plan: 'starter' });

    const [owner2, staff2] = await Promise.all([
      User.create({ tenantId: tenant2._id, name: 'Neha Singh', email: 'owner@techgadgets.com', password: 'password123', role: 'owner' }),
      User.create({ tenantId: tenant2._id, name: 'Amit Joshi', email: 'staff@techgadgets.com', password: 'password123', role: 'staff' }),
    ]);

    const supplier2 = await Supplier.create({ tenantId: tenant2._id, name: 'Shenzhen Electronics Ltd.', email: 'export@shenzhenelec.com', phone: '+86-755-1234567', contactPerson: 'David Chen', address: { city: 'Shenzhen', country: 'China' }, paymentTerms: 60 });

    const earphones = await Product.create({
      tenantId: tenant2._id, name: 'Wireless Earphones Pro', description: 'True wireless with ANC, 24h battery', category: 'Audio', supplierId: supplier2._id,
      attributes: [{ name: 'color', values: ['Black', 'White', 'Rose Gold'] }],
      variants: [
        { sku: 'EAR-BLACK',   attributes: { color: 'Black'    }, price: 3999, costPrice: 1800, stock: 35, lowStockThreshold: 10 },
        { sku: 'EAR-WHITE',   attributes: { color: 'White'    }, price: 3999, costPrice: 1800, stock: 4,  lowStockThreshold: 10 },
        { sku: 'EAR-ROSEGOLD',attributes: { color: 'Rose Gold'}, price: 4299, costPrice: 1950, stock: 12, lowStockThreshold: 8  },
      ],
    });

    const powerbank = await Product.create({
      tenantId: tenant2._id, name: 'Ultra Slim Power Bank', description: '20000mAh, 65W fast charging, USB-C PD', category: 'Accessories', supplierId: supplier2._id,
      attributes: [{ name: 'capacity', values: ['10000mAh', '20000mAh'] }],
      variants: [
        { sku: 'PB-10K', attributes: { capacity: '10000mAh' }, price: 1499, costPrice: 650,  stock: 60, lowStockThreshold: 15 },
        { sku: 'PB-20K', attributes: { capacity: '20000mAh' }, price: 2299, costPrice: 1000, stock: 7,  lowStockThreshold: 15 },
      ],
    });

    await PurchaseOrder.create({
      tenantId: tenant2._id, poNumber: `PO-${Date.now()}-SEED2`, supplierId: supplier2._id, status: 'partially_received',
      items: [
        { productId: earphones._id, productName: earphones.name, variantSku: 'EAR-WHITE', variantAttributes: { color: 'White' }, quantity: 50, unitPrice: 1800, receivedQuantity: 10 },
        { productId: powerbank._id, productName: powerbank.name, variantSku: 'PB-20K', variantAttributes: { capacity: '20000mAh' }, quantity: 30, unitPrice: 1000, receivedQuantity: 0 },
      ],
      totalAmount: 50 * 1800 + 30 * 1000,
      expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      createdBy: owner2._id,
    });

    const techMovements = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      techMovements.push(
        { tenantId: tenant2._id, productId: earphones._id,  variantSku: 'EAR-BLACK', type: 'sale', quantity: -4, previousStock: 39, newStock: 35, userId: staff2._id, createdAt: date },
        { tenantId: tenant2._id, productId: powerbank._id, variantSku: 'PB-10K',    type: 'sale', quantity: -5, previousStock: 65, newStock: 60, userId: staff2._id, createdAt: date }
      );
    }
    await StockMovement.insertMany(techMovements);

    console.log('seed completed');
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
