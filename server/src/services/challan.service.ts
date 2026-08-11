import { ChallanStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { NotFoundError, AppError } from '../utils/errors';
import { getPagination, generateChallanNumber } from '../utils/response';
import { customerService } from './customer.service';
import { productService } from './product.service';

interface ChallanItemInput {
  productId: string;
  quantity: number;
}

export const challanService = {
  async getAll(query: Record<string, string | undefined>) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { challanNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
          user: { select: { id: true, name: true } },
          items: true,
        },
      }),
      prisma.challan.count({ where }),
    ]);

    const enriched = items.map((c) => ({
      ...c,
      items: c.items.map((item) => ({
        ...item,
        unitPriceSnapshot: Number(item.unitPriceSnapshot),
      })),
    }));

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string) {
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
    });

    if (!challan) {
      throw new NotFoundError('Challan not found');
    }

    return {
      ...challan,
      items: challan.items.map((item) => ({
        ...item,
        unitPriceSnapshot: Number(item.unitPriceSnapshot),
      })),
    };
  },

  async create(
    data: { customerId: string; items: ChallanItemInput[] },
    userId: string
  ) {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new AppError('One or more products not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);

    let challanNumber = generateChallanNumber();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.challan.findUnique({ where: { challanNumber } });
      if (!existing) break;
      challanNumber = generateChallanNumber();
      attempts++;
    }

    const challan = await prisma.challan.create({
      data: {
        challanNumber,
        customerId: data.customerId,
        totalQuantity,
        status: ChallanStatus.DRAFT,
        createdBy: userId,
        items: {
          create: data.items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              productNameSnapshot: product.name,
              skuSnapshot: product.sku,
              unitPriceSnapshot: product.unitPrice,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: {
        customer: { select: { id: true, name: true, businessName: true } },
        items: true,
      },
    });

    return {
      ...challan,
      items: challan.items.map((item) => ({
        ...item,
        unitPriceSnapshot: Number(item.unitPriceSnapshot),
      })),
    };
  },

  async confirm(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const challan = await tx.challan.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!challan) {
        throw new NotFoundError('Challan not found');
      }

      if (challan.status !== ChallanStatus.DRAFT) {
        throw new AppError(
          `Cannot confirm challan with status ${challan.status}. Only DRAFT challans can be confirmed.`,
          400
        );
      }

      const quantitiesByProduct = new Map<string, number>();
      for (const item of challan.items) {
        quantitiesByProduct.set(
          item.productId,
          (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity
        );
      }

      const productIds = [...quantitiesByProduct.keys()];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const [productId, quantity] of quantitiesByProduct) {
        const product = productMap.get(productId);
        if (!product) {
          throw new AppError('One or more challan products no longer exist');
        }
        if (product.currentStock < quantity) {
          throw new AppError(`Insufficient stock for ${product.name}`);
        }
      }

      for (const [productId, quantity] of quantitiesByProduct) {
        const product = productMap.get(productId)!;
        // The conditional update is the final guard against concurrent confirmations.
        const result = await tx.product.updateMany({
          where: { id: productId, currentStock: { gte: quantity } },
          data: { currentStock: { decrement: quantity } },
        });
        if (result.count !== 1) {
          throw new AppError(`Insufficient stock for ${product.name}`);
        }

        await tx.stockMovement.create({
          data: {
            productId,
            quantity,
            movementType: 'OUT',
            reason: `Challan ${challan.challanNumber} confirmed`,
            createdBy: userId,
          },
        });
      }

      const updated = await tx.challan.update({
        where: { id },
        data: { status: ChallanStatus.CONFIRMED },
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
          items: true,
        },
      });

      return {
        ...updated,
        items: updated.items.map((item) => ({
          ...item,
          unitPriceSnapshot: Number(item.unitPriceSnapshot),
        })),
      };
    });
  },

  async cancel(id: string) {
    const challan = await prisma.challan.findUnique({ where: { id } });
    if (!challan) {
      throw new NotFoundError('Challan not found');
    }

    if (challan.status !== ChallanStatus.DRAFT) {
      throw new AppError(
        `Cannot cancel challan with status ${challan.status}. Only DRAFT challans can be cancelled.`,
        400
      );
    }

    const updated = await prisma.challan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED },
      include: {
        customer: { select: { id: true, name: true, businessName: true } },
        items: true,
      },
    });

    return {
      ...updated,
      items: updated.items.map((item) => ({
        ...item,
        unitPriceSnapshot: Number(item.unitPriceSnapshot),
      })),
    };
  },

  async getStats() {
    const [total, recent] = await Promise.all([
      prisma.challan.count(),
      prisma.challan.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
        },
      }),
    ]);

    return { totalChallans: total, recentChallans: recent };
  },
};

export const dashboardService = {
  async getStats() {
    const [customerStats, productStats, challanStats, lowStockProducts] =
      await Promise.all([
        customerService.getStats(),
        productService.getStats(),
        challanService.getStats(),
        productService.getLowStock(5),
      ]);

    return {
      totalCustomers: customerStats.totalCustomers,
      totalProducts: productStats.totalProducts,
      lowStockCount: productStats.lowStockCount,
      totalChallans: challanStats.totalChallans,
      recentChallans: challanStats.recentChallans,
      lowStockProducts,
    };
  },
};
