import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { NotFoundError } from '../utils/errors';
import { getPagination } from '../utils/response';

interface CustomerInput {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  customerType: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address: string;
  status?: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  followUpDate?: string | null;
  notes?: string;
}

export const customerService = {
  async getAll(query: Record<string, string | undefined>) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where: Prisma.CustomerWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
        { businessName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status as Prisma.EnumCustomerStatusFilter;
    }

    if (query.customerType) {
      where.customerType = query.customerType as Prisma.EnumCustomerTypeFilter;
    }

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        challans: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return customer;
  },

  async create(data: CustomerInput) {
    return prisma.customer.create({
      data: {
        ...data,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        notes: data.notes || '',
      },
    });
  },

  async update(id: string, data: Partial<CustomerInput>) {
    await this.getById(id);

    const updateData: Prisma.CustomerUpdateInput = { ...data };
    if (data.followUpDate !== undefined) {
      updateData.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
    }

    return prisma.customer.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id: string) {
    await this.getById(id);
    return prisma.customer.delete({ where: { id } });
  },

  async getStats() {
    const total = await prisma.customer.count();
    return { totalCustomers: total };
  },
};
