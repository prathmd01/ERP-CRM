import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { NotFoundError, AppError } from '../utils/errors';
import { getPagination } from '../utils/response';

interface ProductInput {
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock?: number;
  minimumStock?: number;
  warehouse: string;
}

export const productService = {
  async getAll(query: Record<string, string | undefined>) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.lowStock === 'true') {
      where.AND = [
        { currentStock: { lte: prisma.product.fields.minimumStock } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    const enrichedItems = items.map((p) => ({
      ...p,
      unitPrice: Number(p.unitPrice),
      isLowStock: p.currentStock <= p.minimumStock,
    }));

    return {
      items: enrichedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return {
      ...product,
      unitPrice: Number(product.unitPrice),
      isLowStock: product.currentStock <= product.minimumStock,
    };
  },

  async create(data: ProductInput, userId: string) {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...data,
          unitPrice: data.unitPrice,
          currentStock: data.currentStock ?? 0,
          minimumStock: data.minimumStock ?? 0,
        },
      });

      if (created.currentStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            quantity: created.currentStock,
            movementType: 'IN',
            reason: 'Initial stock balance',
            createdBy: userId,
          },
        });
      }

      return created;
    });
    return {
      ...product,
      unitPrice: Number(product.unitPrice),
      isLowStock: product.currentStock <= product.minimumStock,
    };
  },

  async update(id: string, data: Partial<ProductInput>) {
    await this.getById(id);
    const product = await prisma.product.update({
      where: { id },
      data,
    });
    return {
      ...product,
      unitPrice: Number(product.unitPrice),
      isLowStock: product.currentStock <= product.minimumStock,
    };
  },

  async getStats() {
    const [total, lowStockProducts] = await Promise.all([
      prisma.product.count(),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "Product" WHERE "currentStock" <= "minimumStock"
      `,
    ]);

    return {
      totalProducts: total,
      lowStockCount: Number(lowStockProducts[0]?.count || 0),
    };
  },

  async getLowStock(limit = 5) {
    const products = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        sku: string;
        currentStock: number;
        minimumStock: number;
        warehouse: string;
      }>
    >`
      SELECT id, name, sku, "currentStock", "minimumStock", warehouse
      FROM "Product"
      WHERE "currentStock" <= "minimumStock"
      ORDER BY "currentStock" ASC
      LIMIT ${limit}
    `;
    return products;
  },
};

export const inventoryService = {
  async getInventory(query: Record<string, string | undefined>) {
    return productService.getAll(query);
  },

  async getMovements(query: Record<string, string | undefined>) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where: Prisma.StockMovementWhereInput = {};

    if (query.productId) {
      where.productId = query.productId;
    }

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async createMovement(
    data: {
      productId: string;
      quantity: number;
      movementType: 'IN' | 'OUT';
      reason: string;
    },
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      let newStock = product.currentStock;
      if (data.movementType === 'IN') {
        newStock += data.quantity;
      } else {
        newStock -= data.quantity;
        if (newStock < 0) {
          throw new AppError(`Insufficient stock for ${product.name}`);
        }
      }

      await tx.product.update({
        where: { id: data.productId },
        data: { currentStock: newStock },
      });

      return tx.stockMovement.create({
        data: {
          productId: data.productId,
          quantity: data.quantity,
          movementType: data.movementType,
          reason: data.reason,
          createdBy: userId,
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { id: true, name: true } },
        },
      });
    });
  },
};
