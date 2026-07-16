import { PrismaClient, RoleName } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PERMISSIONS: Array<{ key: string; description: string }> = [
  { key: 'product:read', description: 'Xem sản phẩm' },
  { key: 'product:create', description: 'Tạo sản phẩm' },
  { key: 'product:update', description: 'Cập nhật sản phẩm' },
  { key: 'product:delete', description: 'Xoá sản phẩm' },
  { key: 'order:read', description: 'Xem đơn hàng' },
  { key: 'order:update', description: 'Cập nhật đơn hàng' },
  { key: 'user:read', description: 'Xem người dùng' },
  { key: 'user:manage', description: 'Quản lý người dùng và phân quyền' },
  { key: 'marketing:manage', description: 'Quản lý khuyến mãi/voucher' },
  { key: 'settings:manage', description: 'Quản lý cấu hình hệ thống' },
];

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.key),
  ADMIN: PERMISSIONS.map((p) => p.key).filter((k) => k !== 'settings:manage'),
  STAFF: ['product:read', 'product:update', 'order:read', 'order:update', 'user:read'],
  CUSTOMER: [],
};

async function seedRolesAndPermissions() {
  await prisma.permission.createMany({
    data: PERMISSIONS,
    skipDuplicates: true,
  });

  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    const permissionKeys = ROLE_PERMISSIONS[roleName];
    if (permissionKeys.length === 0) continue;

    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
}

async function seedAdminUser() {
  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.SUPER_ADMIN },
  });

  const passwordHash = await argon2.hash('Admin@123456');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dautaytoystore.vn' },
    update: {},
    create: {
      email: 'admin@dautaytoystore.vn',
      passwordHash,
      fullName: 'DauTayToy Admin',
      isEmailVerified: true,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });
}

async function seedCatalog() {
  const brand = await prisma.brand.upsert({
    where: { slug: 'lego' },
    update: {},
    create: {
      name: 'LEGO',
      slug: 'lego',
      description: 'Đồ chơi lắp ráp sáng tạo từ Đan Mạch',
      originCountry: 'Đan Mạch',
    },
  });

  const category = await prisma.category.upsert({
    where: { slug: 'do-choi-lap-rap' },
    update: {},
    create: {
      name: 'Đồ chơi lắp ráp',
      slug: 'do-choi-lap-rap',
      description: 'Các bộ đồ chơi lắp ráp phát triển tư duy',
      metaTitle: 'Đồ chơi lắp ráp cho bé | DauTayToy Store',
      metaDescription: 'Bộ sưu tập đồ chơi lắp ráp chất lượng cao, an toàn cho trẻ em.',
    },
  });

  const product = await prisma.product.upsert({
    where: { slug: 'lego-city-xe-cuu-hoa' },
    update: {},
    create: {
      name: 'LEGO City - Xe cứu hỏa',
      slug: 'lego-city-xe-cuu-hoa',
      sku: 'LEGO-CITY-001',
      barcode: '5702016912345',
      brandId: brand.id,
      status: 'PUBLISHED',
      shortDescription: 'Bộ lắp ráp xe cứu hỏa LEGO City giúp bé phát triển tư duy logic.',
      description:
        '<p>Bộ đồ chơi LEGO City Xe cứu hỏa gồm 280 mảnh ghép, phù hợp cho bé từ 6 tuổi trở lên. Sản phẩm đạt tiêu chuẩn an toàn Châu Âu EN71.</p>',
      price: 890000,
      compareAtPrice: 990000,
      material: 'Nhựa ABS an toàn',
      origin: 'Đan Mạch',
      ageMin: 6,
      ageMax: 12,
      weightGrams: 650,
      lengthCm: 38,
      widthCm: 28,
      heightCm: 8,
      metaTitle: 'LEGO City Xe cứu hỏa - Đồ chơi lắp ráp chính hãng',
      metaDescription: 'Mua LEGO City Xe cứu hỏa chính hãng, giao hàng toàn quốc.',
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      categories: {
        create: [{ categoryId: category.id }],
      },
      images: {
        create: [
          {
            url: 'https://placehold.co/800x800?text=LEGO+City+Fire+Truck',
            altText: 'LEGO City Xe cứu hỏa',
            isPrimary: true,
            sortOrder: 0,
          },
        ],
      },
      specifications: {
        create: [
          { label: 'Số mảnh ghép', value: '280', sortOrder: 0 },
          { label: 'Chất liệu', value: 'Nhựa ABS', sortOrder: 1 },
          { label: 'Xuất xứ', value: 'Đan Mạch', sortOrder: 2 },
        ],
      },
      faqs: {
        create: [
          {
            question: 'Sản phẩm có an toàn cho trẻ nhỏ không?',
            answer: 'Sản phẩm đạt chứng nhận an toàn EN71, phù hợp cho bé từ 6 tuổi trở lên.',
            sortOrder: 0,
          },
        ],
      },
      inventory: {
        create: {
          quantityOnHand: 120,
          quantityReserved: 0,
          lowStockThreshold: 10,
        },
      },
    },
  });

  return { brand, category, product };
}

async function main() {
  await seedRolesAndPermissions();
  await seedAdminUser();
  await seedCatalog();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed successfully.');
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
