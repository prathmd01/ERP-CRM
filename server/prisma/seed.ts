import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType, ChallanStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo@123';

async function main() {
  console.log('Seeding database...');

  await prisma.challanItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = await Promise.all([
    prisma.user.create({
      data: { name: 'Admin User', email: 'admin@erp.demo', passwordHash, role: Role.ADMIN },
    }),
    prisma.user.create({
      data: { name: 'Sales User', email: 'sales@erp.demo', passwordHash, role: Role.SALES },
    }),
    prisma.user.create({
      data: { name: 'Warehouse User', email: 'warehouse@erp.demo', passwordHash, role: Role.WAREHOUSE },
    }),
    prisma.user.create({
      data: { name: 'Accounts User', email: 'accounts@erp.demo', passwordHash, role: Role.ACCOUNTS },
    }),
  ]);

  const [admin, sales, warehouse] = users;

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Rajesh Kumar',
        mobile: '9876543210',
        email: 'rajesh@kumartraders.com',
        businessName: 'Kumar Traders',
        gstNumber: '27AABCU9603R1ZM',
        customerType: CustomerType.WHOLESALE,
        address: '12 MG Road, Pune, Maharashtra',
        status: CustomerStatus.ACTIVE,
        followUpDate: new Date('2026-08-15'),
        notes: 'Regular wholesale buyer, pays on time.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Priya Sharma',
        mobile: '9876543211',
        email: 'priya@sharmaretail.com',
        businessName: 'Sharma Retail Store',
        customerType: CustomerType.RETAIL,
        address: '45 FC Road, Pune, Maharashtra',
        status: CustomerStatus.ACTIVE,
        notes: 'Retail customer, prefers bulk orders monthly.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Amit Patel',
        mobile: '9876543212',
        email: 'amit@pateldist.com',
        businessName: 'Patel Distributors',
        gstNumber: '24AABCP1234A1Z5',
        customerType: CustomerType.DISTRIBUTOR,
        address: '78 Ring Road, Ahmedabad, Gujarat',
        status: CustomerStatus.ACTIVE,
        followUpDate: new Date('2026-08-20'),
        notes: 'Major distributor for western region.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Sneha Reddy',
        mobile: '9876543213',
        email: 'sneha@reddyenterprises.com',
        businessName: 'Reddy Enterprises',
        customerType: CustomerType.WHOLESALE,
        address: '23 Banjara Hills, Hyderabad, Telangana',
        status: CustomerStatus.LEAD,
        followUpDate: new Date('2026-08-12'),
        notes: 'New lead from trade fair. Follow up for pricing.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Vikram Singh',
        mobile: '9876543214',
        email: 'vikram@singhwholesale.com',
        businessName: 'Singh Wholesale',
        gstNumber: '06AABCV5678B1Z2',
        customerType: CustomerType.WHOLESALE,
        address: '56 Industrial Area, Delhi',
        status: CustomerStatus.ACTIVE,
        notes: 'Large volume orders every quarter.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Meera Nair',
        mobile: '9876543215',
        email: 'meera@nairstores.com',
        businessName: 'Nair Stores',
        customerType: CustomerType.RETAIL,
        address: '89 Marine Drive, Kochi, Kerala',
        status: CustomerStatus.INACTIVE,
        notes: 'Inactive since last year. Re-engagement needed.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Arjun Mehta',
        mobile: '9876543216',
        email: 'arjun@mehtadist.com',
        businessName: 'Mehta Distribution',
        gstNumber: '29AABCM9012C1Z8',
        customerType: CustomerType.DISTRIBUTOR,
        address: '34 Whitefield, Bangalore, Karnataka',
        status: CustomerStatus.ACTIVE,
        followUpDate: new Date('2026-08-18'),
        notes: 'Growing distributor, potential for exclusive deal.',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Kavita Joshi',
        mobile: '9876543217',
        email: 'kavita@joshiretail.com',
        businessName: 'Joshi Retail Hub',
        customerType: CustomerType.RETAIL,
        address: '67 Mall Road, Jaipur, Rajasthan',
        status: CustomerStatus.LEAD,
        followUpDate: new Date('2026-08-14'),
        notes: 'Interested in electronics category.',
      },
    }),
  ]);

  const products = await Promise.all([
    prisma.product.create({
      data: { name: 'Wireless Mouse', sku: 'ELEC-WM-001', category: 'Electronics', unitPrice: 450, currentStock: 120, minimumStock: 20, warehouse: 'WH-A' },
    }),
    prisma.product.create({
      data: { name: 'USB Keyboard', sku: 'ELEC-KB-002', category: 'Electronics', unitPrice: 850, currentStock: 85, minimumStock: 15, warehouse: 'WH-A' },
    }),
    prisma.product.create({
      data: { name: 'HDMI Cable 2m', sku: 'ELEC-HD-003', category: 'Electronics', unitPrice: 250, currentStock: 8, minimumStock: 25, warehouse: 'WH-A' },
    }),
    prisma.product.create({
      data: { name: 'Office Chair', sku: 'FURN-OC-001', category: 'Furniture', unitPrice: 5500, currentStock: 30, minimumStock: 5, warehouse: 'WH-B' },
    }),
    prisma.product.create({
      data: { name: 'Standing Desk', sku: 'FURN-SD-002', category: 'Furniture', unitPrice: 12000, currentStock: 12, minimumStock: 3, warehouse: 'WH-B' },
    }),
    prisma.product.create({
      data: { name: 'A4 Paper Ream', sku: 'STAT-AP-001', category: 'Stationery', unitPrice: 280, currentStock: 200, minimumStock: 50, warehouse: 'WH-C' },
    }),
    prisma.product.create({
      data: { name: 'Ballpoint Pen Box', sku: 'STAT-BP-002', category: 'Stationery', unitPrice: 120, currentStock: 5, minimumStock: 30, warehouse: 'WH-C' },
    }),
    prisma.product.create({
      data: { name: 'Stapler Heavy Duty', sku: 'STAT-ST-003', category: 'Stationery', unitPrice: 350, currentStock: 45, minimumStock: 10, warehouse: 'WH-C' },
    }),
    prisma.product.create({
      data: { name: 'LED Monitor 24"', sku: 'ELEC-MN-004', category: 'Electronics', unitPrice: 8500, currentStock: 22, minimumStock: 5, warehouse: 'WH-A' },
    }),
    prisma.product.create({
      data: { name: 'Webcam HD', sku: 'ELEC-WC-005', category: 'Electronics', unitPrice: 2200, currentStock: 3, minimumStock: 10, warehouse: 'WH-A' },
    }),
    prisma.product.create({
      data: { name: 'File Cabinet', sku: 'FURN-FC-003', category: 'Furniture', unitPrice: 4500, currentStock: 18, minimumStock: 4, warehouse: 'WH-B' },
    }),
    prisma.product.create({
      data: { name: 'Whiteboard 4x3', sku: 'STAT-WB-004', category: 'Stationery', unitPrice: 1800, currentStock: 10, minimumStock: 5, warehouse: 'WH-C' },
    }),
  ]);

  await Promise.all([
    prisma.stockMovement.create({
      data: { productId: products[0].id, quantity: 50, movementType: MovementType.IN, reason: 'Initial stock receipt', createdBy: warehouse.id },
    }),
    prisma.stockMovement.create({
      data: { productId: products[2].id, quantity: 30, movementType: MovementType.IN, reason: 'Supplier delivery', createdBy: warehouse.id },
    }),
    prisma.stockMovement.create({
      data: { productId: products[6].id, quantity: 20, movementType: MovementType.IN, reason: 'Restock from vendor', createdBy: warehouse.id },
    }),
    prisma.stockMovement.create({
      data: { productId: products[0].id, quantity: 10, movementType: MovementType.OUT, reason: 'Manual adjustment - damaged units', createdBy: warehouse.id },
    }),
    prisma.stockMovement.create({
      data: { productId: products[5].id, quantity: 100, movementType: MovementType.IN, reason: 'Bulk purchase order', createdBy: warehouse.id },
    }),
  ]);

  const confirmedChallan = await prisma.challan.create({
    data: {
      challanNumber: 'CH-20260801-0001',
      customerId: customers[0].id,
      totalQuantity: 15,
      status: ChallanStatus.CONFIRMED,
      createdBy: sales.id,
      createdAt: new Date('2026-08-01'),
      items: {
        create: [
          {
            productId: products[0].id,
            productNameSnapshot: products[0].name,
            skuSnapshot: products[0].sku,
            unitPriceSnapshot: products[0].unitPrice,
            quantity: 10,
          },
          {
            productId: products[1].id,
            productNameSnapshot: products[1].name,
            skuSnapshot: products[1].sku,
            unitPriceSnapshot: products[1].unitPrice,
            quantity: 5,
          },
        ],
      },
    },
  });

  await prisma.product.update({
    where: { id: products[0].id },
    data: { currentStock: products[0].currentStock - 10 },
  });
  await prisma.product.update({
    where: { id: products[1].id },
    data: { currentStock: products[1].currentStock - 5 },
  });

  await prisma.stockMovement.create({
    data: {
      productId: products[0].id,
      quantity: 10,
      movementType: MovementType.OUT,
      reason: `Challan ${confirmedChallan.challanNumber} confirmed`,
      createdBy: sales.id,
    },
  });
  await prisma.stockMovement.create({
    data: {
      productId: products[1].id,
      quantity: 5,
      movementType: MovementType.OUT,
      reason: `Challan ${confirmedChallan.challanNumber} confirmed`,
      createdBy: sales.id,
    },
  });

  await prisma.challan.create({
    data: {
      challanNumber: 'CH-20260810-0002',
      customerId: customers[2].id,
      totalQuantity: 8,
      status: ChallanStatus.DRAFT,
      createdBy: sales.id,
      items: {
        create: [
          {
            productId: products[8].id,
            productNameSnapshot: products[8].name,
            skuSnapshot: products[8].sku,
            unitPriceSnapshot: products[8].unitPrice,
            quantity: 3,
          },
          {
            productId: products[3].id,
            productNameSnapshot: products[3].name,
            skuSnapshot: products[3].sku,
            unitPriceSnapshot: products[3].unitPrice,
            quantity: 5,
          },
        ],
      },
    },
  });

  await prisma.challan.create({
    data: {
      challanNumber: 'CH-20260805-0003',
      customerId: customers[4].id,
      totalQuantity: 50,
      status: ChallanStatus.CONFIRMED,
      createdBy: sales.id,
      createdAt: new Date('2026-08-05'),
      items: {
        create: [
          {
            productId: products[5].id,
            productNameSnapshot: products[5].name,
            skuSnapshot: products[5].sku,
            unitPriceSnapshot: products[5].unitPrice,
            quantity: 50,
          },
        ],
      },
    },
  });

  await prisma.product.update({
    where: { id: products[5].id },
    data: { currentStock: products[5].currentStock - 50 },
  });

  console.log('Seed completed successfully!');
  console.log('Demo users created with password:', DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
