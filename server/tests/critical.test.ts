import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { ChallanStatus, Role } from '@prisma/client';
import prisma from '../src/lib/prisma';
import { authService } from '../src/services/auth.service';
import { productService } from '../src/services/product.service';
import { challanService } from '../src/services/challan.service';
import { authenticate, authorize } from '../src/middleware/auth';
import { signToken } from '../src/utils/jwt';

const db = prisma as any;
const product = { id: 'product-1', name: 'Widget', sku: 'W-1', unitPrice: 99, currentStock: 10, minimumStock: 2, warehouse: 'WH-A' };

test('login succeeds with valid credentials and rejects invalid credentials', async () => {
  const passwordHash = await bcrypt.hash('correct-password', 4);
  db.user.findUnique = async () => ({ id: 'user-1', name: 'Admin', email: 'admin@example.com', passwordHash, role: Role.ADMIN });

  const success = await authService.login('admin@example.com', 'correct-password');
  assert.equal(success.user.role, Role.ADMIN);
  assert.ok(success.token);
  await assert.rejects(() => authService.login('admin@example.com', 'wrong-password'), /Invalid email or password/);
});

test('authentication and role authorization reject unauthorized requests', () => {
  let authError: Error | undefined;
  authenticate({ headers: {} } as any, {} as any, (error?: Error) => { authError = error; });
  assert.equal((authError as any).statusCode, 401);

  const token = signToken({ userId: 'sales-1', role: Role.SALES });
  const req: any = { headers: { authorization: `Bearer ${token}` } };
  let nextError: Error | undefined;
  authenticate(req, {} as any, (error?: Error) => { nextError = error; });
  assert.equal(nextError, undefined);
  authorize(Role.ADMIN)(req, {} as any, (error?: Error) => { nextError = error; });
  assert.equal((nextError as any).statusCode, 403);
});

test('product creation with initial stock creates an IN movement', async () => {
  const movements: any[] = [];
  db.$transaction = async (callback: any) => callback({
    product: { create: async ({ data }: any) => ({ id: 'new-product', ...data }) },
    stockMovement: { create: async ({ data }: any) => { movements.push(data); return data; } },
  });
  await productService.create({ name: 'New Widget', sku: 'NW-1', category: 'Test', unitPrice: 10, currentStock: 7, minimumStock: 1, warehouse: 'WH-A' }, 'warehouse-1');
  assert.deepEqual(movements, [{ productId: 'new-product', quantity: 7, movementType: 'IN', reason: 'Initial stock balance', createdBy: 'warehouse-1' }]);
});

test('draft challan does not reduce stock and stores product snapshots', async () => {
  let productUpdates = 0;
  db.customer.findUnique = async () => ({ id: 'customer-1' });
  db.product.findMany = async () => [product];
  db.challan.findUnique = async () => null;
  db.challan.create = async ({ data }: any) => ({ ...data, id: 'challan-1', customer: { id: 'customer-1', name: 'Customer', businessName: 'Business' }, items: data.items.create.map((item: any, index: number) => ({ id: `item-${index}`, ...item })) });
  db.product.update = async () => { productUpdates++; };
  const draft = await challanService.create({ customerId: 'customer-1', items: [{ productId: product.id, quantity: 3 }] }, 'sales-1');
  assert.equal(draft.status, ChallanStatus.DRAFT);
  assert.equal(productUpdates, 0);
  assert.deepEqual(draft.items[0].productNameSnapshot, product.name);
  assert.deepEqual(draft.items[0].skuSnapshot, product.sku);
  assert.equal(draft.items[0].unitPriceSnapshot, product.unitPrice);
});

test('confirmation deducts stock and creates an OUT movement', async () => {
  let stock = 10;
  const movements: any[] = [];
  db.$transaction = async (callback: any) => callback({
    challan: {
      findUnique: async () => ({ id: 'challan-1', challanNumber: 'CH-1', status: ChallanStatus.DRAFT, items: [{ id: 'item-1', productId: product.id, quantity: 3 }] }),
      update: async () => ({ id: 'challan-1', status: ChallanStatus.CONFIRMED, items: [{ id: 'item-1', productId: product.id, productNameSnapshot: product.name, skuSnapshot: product.sku, unitPriceSnapshot: 99, quantity: 3 }], customer: { id: 'customer-1', name: 'Customer', businessName: 'Business' } }),
    },
    product: {
      findMany: async () => [{ ...product, currentStock: stock }],
      updateMany: async ({ data }: any) => { stock -= data.currentStock.decrement; return { count: 1 }; },
    },
    stockMovement: { create: async ({ data }: any) => { movements.push(data); return data; } },
  });
  const confirmed = await challanService.confirm('challan-1', 'sales-1');
  assert.equal(confirmed.status, ChallanStatus.CONFIRMED);
  assert.equal(stock, 7);
  assert.equal(movements[0].movementType, 'OUT');
  assert.equal(movements[0].quantity, 3);
});

test('insufficient stock rejects without partial inventory changes', async () => {
  let updateCalls = 0;
  db.$transaction = async (callback: any) => callback({
    challan: { findUnique: async () => ({ id: 'challan-1', challanNumber: 'CH-1', status: ChallanStatus.DRAFT, items: [{ id: 'one', productId: 'enough', quantity: 2 }, { id: 'two', productId: 'short', quantity: 5 }] }) },
    product: {
      findMany: async () => [{ ...product, id: 'enough', currentStock: 10 }, { ...product, id: 'short', currentStock: 1 }],
      updateMany: async () => { updateCalls++; return { count: 1 }; },
    },
    stockMovement: { create: async () => undefined },
  });
  await assert.rejects(() => challanService.confirm('challan-1', 'sales-1'), /Insufficient stock/);
  assert.equal(updateCalls, 0);
});

test('invalid challan confirmation state is rejected', async () => {
  db.$transaction = async (callback: any) => callback({ challan: { findUnique: async () => ({ id: 'challan-1', status: ChallanStatus.CONFIRMED, items: [] }) } });
  await assert.rejects(() => challanService.confirm('challan-1', 'sales-1'), /Only DRAFT challans can be confirmed/);
});
