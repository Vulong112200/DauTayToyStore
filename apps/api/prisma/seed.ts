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

async function seedContent() {
  const faqEntries: Array<{ question: string; answer: string; category: string; sortOrder: number }> = [
    {
      question: 'Thời gian giao hàng mất bao lâu?',
      answer:
        'Đơn hàng nội thành thường giao trong 1-2 ngày, các tỉnh thành khác từ 3-5 ngày làm việc.',
      category: 'Vận chuyển',
      sortOrder: 0,
    },
    {
      question: 'DauTayToy Store có hỗ trợ đổi trả không?',
      answer:
        'Có, bạn có thể đổi trả sản phẩm trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm còn nguyên tem mác.',
      category: 'Đổi trả',
      sortOrder: 1,
    },
    {
      question: 'Sản phẩm có đảm bảo an toàn cho trẻ em không?',
      answer:
        'Tất cả sản phẩm tại DauTayToy Store đều có nguồn gốc rõ ràng và đạt các tiêu chuẩn an toàn như EN71, ASTM F963.',
      category: 'Sản phẩm',
      sortOrder: 2,
    },
    {
      question: 'Tôi có thể thanh toán bằng hình thức nào?',
      answer: 'Hiện tại cửa hàng hỗ trợ thanh toán khi nhận hàng (COD) trên toàn quốc.',
      category: 'Thanh toán',
      sortOrder: 3,
    },
  ];

  await prisma.faqEntry.createMany({ data: faqEntries, skipDuplicates: true });

  const blogCategory = await prisma.blogCategory.upsert({
    where: { slug: 'meo-hay' },
    update: {},
    create: { name: 'Mẹo hay', slug: 'meo-hay' },
  });

  await prisma.blogPost.upsert({
    where: { slug: 'cach-chon-do-choi-phu-hop-theo-do-tuoi' },
    update: {},
    create: {
      categoryId: blogCategory.id,
      title: 'Cách chọn đồ chơi phù hợp theo độ tuổi của bé',
      slug: 'cach-chon-do-choi-phu-hop-theo-do-tuoi',
      excerpt:
        'Chọn đúng đồ chơi theo từng giai đoạn phát triển giúp bé học hỏi tốt hơn và đảm bảo an toàn.',
      content:
        '<p>Việc lựa chọn đồ chơi phù hợp với độ tuổi không chỉ giúp bé an toàn mà còn kích thích sự phát triển trí não đúng giai đoạn.</p><h2>Dưới 3 tuổi</h2><p>Ưu tiên đồ chơi kích thước lớn, không có chi tiết nhỏ dễ nuốt, chất liệu mềm và an toàn.</p><h2>Từ 3-6 tuổi</h2><p>Đồ chơi lắp ráp đơn giản, đồ chơi phát triển vận động tinh giúp bé rèn luyện sự khéo léo.</p><h2>Từ 6 tuổi trở lên</h2><p>Bộ lắp ráp phức tạp hơn, đồ chơi giáo dục STEM giúp phát triển tư duy logic.</p>',
      coverImageUrl: 'https://placehold.co/1200x630/FFD6E8/333333?text=Chon+Do+Choi+Theo+Do+Tuoi',
      status: 'PUBLISHED',
      metaTitle: 'Cách chọn đồ chơi phù hợp theo độ tuổi của bé',
      metaDescription:
        'Hướng dẫn chọn đồ chơi an toàn và phù hợp với từng giai đoạn phát triển của trẻ.',
      publishedAt: new Date('2026-02-01T00:00:00.000Z'),
    },
  });

  await prisma.blogPost.upsert({
    where: { slug: 'loi-ich-cua-do-choi-lap-rap-voi-tre-em' },
    update: {},
    create: {
      categoryId: blogCategory.id,
      title: 'Lợi ích của đồ chơi lắp ráp với sự phát triển của trẻ',
      slug: 'loi-ich-cua-do-choi-lap-rap-voi-tre-em',
      excerpt:
        'Đồ chơi lắp ráp không chỉ mang lại niềm vui mà còn giúp bé phát triển tư duy không gian và kiên nhẫn.',
      content:
        '<p>Đồ chơi lắp ráp như LEGO từ lâu đã được các chuyên gia giáo dục khuyến khích sử dụng cho trẻ em.</p><h2>Phát triển tư duy logic</h2><p>Quá trình lắp ráp theo hướng dẫn giúp bé rèn luyện khả năng giải quyết vấn đề từng bước.</p><h2>Rèn luyện sự kiên nhẫn</h2><p>Những bộ lắp ráp phức tạp đòi hỏi bé phải tập trung và kiên trì hoàn thành.</p>',
      coverImageUrl: 'https://placehold.co/1200x630/D6EFFF/333333?text=Loi+Ich+Do+Choi+Lap+Rap',
      status: 'PUBLISHED',
      metaTitle: 'Lợi ích của đồ chơi lắp ráp với sự phát triển của trẻ',
      metaDescription: 'Tìm hiểu vì sao đồ chơi lắp ráp tốt cho sự phát triển trí tuệ của trẻ em.',
      publishedAt: new Date('2026-02-10T00:00:00.000Z'),
    },
  });
}

async function main() {
  await seedRolesAndPermissions();
  await seedAdminUser();
  await seedCatalog();
  await seedContent();
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
