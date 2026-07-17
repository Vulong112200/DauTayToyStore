import { readFileSync } from 'fs';
import { join } from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { MediaType, PrismaClient, RoleName } from '@prisma/client';
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
  { key: 'marketing:read', description: 'Xem khuyến mãi/voucher' },
  { key: 'settings:manage', description: 'Quản lý cấu hình hệ thống' },
  { key: 'settings:read', description: 'Xem cấu hình hệ thống' },
];

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.key),
  ADMIN: PERMISSIONS.map((p) => p.key),
  STAFF: [
    'product:read',
    'product:update',
    'order:read',
    'order:update',
    'user:read',
    'marketing:read',
    'settings:read',
  ],
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

const DEMO_BRANDS: Array<{
  slug: string;
  name: string;
  originCountry: string;
  description: string;
}> = [
  {
    slug: 'teddy-house',
    name: 'Teddy House',
    originCountry: 'Việt Nam',
    description: 'Thú nhồi bông mềm mại, an toàn cho bé, sản xuất trong nước.',
  },
  {
    slug: 'vtech',
    name: 'VTech',
    originCountry: 'Bỉ',
    description: 'Đồ chơi điện tử giáo dục và âm nhạc cho trẻ em.',
  },
  {
    slug: 'hot-wheels',
    name: 'Hot Wheels',
    originCountry: 'Mỹ',
    description: 'Xe mô hình và đường đua tốc độ nổi tiếng toàn cầu.',
  },
  {
    slug: 'mattel',
    name: 'Mattel',
    originCountry: 'Mỹ',
    description: 'Búp bê và phụ kiện thời trang cho bé gái.',
  },
  {
    slug: 'little-tikes',
    name: 'Little Tikes',
    originCountry: 'Mỹ',
    description: 'Đồ chơi vận động ngoài trời bền bỉ cho trẻ nhỏ.',
  },
  {
    slug: 'ravensburger',
    name: 'Ravensburger',
    originCountry: 'Đức',
    description: 'Board game và trò chơi rèn luyện trí tuệ chất lượng cao.',
  },
  {
    slug: 'fisher-price',
    name: 'Fisher-Price',
    originCountry: 'Mỹ',
    description: 'Đồ chơi hoá thân và phát triển kỹ năng sớm cho trẻ.',
  },
];

const DEMO_CATEGORIES: Array<{ slug: string; name: string; description: string }> = [
  {
    slug: 'thu-nhoi-bong',
    name: 'Thú nhồi bông',
    description: 'Gấu bông, thú bông mềm mại an toàn cho bé.',
  },
  {
    slug: 'do-choi-giao-duc-stem',
    name: 'Đồ chơi giáo dục STEM',
    description: 'Đồ chơi phát triển tư duy khoa học, công nghệ, kỹ thuật.',
  },
  {
    slug: 'xe-mo-hinh',
    name: 'Xe mô hình',
    description: 'Xe mô hình, xe điều khiển từ xa cho bé yêu thích tốc độ.',
  },
  {
    slug: 'bup-be-phu-kien',
    name: 'Búp bê & phụ kiện',
    description: 'Búp bê thời trang và phụ kiện đi kèm.',
  },
  {
    slug: 'do-choi-ngoai-troi',
    name: 'Đồ chơi ngoài trời',
    description: 'Đồ chơi vận động ngoài trời giúp bé rèn luyện thể chất.',
  },
  {
    slug: 'do-choi-am-nhac',
    name: 'Đồ chơi âm nhạc',
    description: 'Đồ chơi phát triển năng khiếu âm nhạc cho bé.',
  },
  {
    slug: 'board-game-tri-tue',
    name: 'Board game trí tuệ',
    description: 'Trò chơi bàn cờ và board game rèn luyện tư duy.',
  },
  {
    slug: 'do-choi-nha-bep',
    name: 'Đồ chơi hoá thân',
    description: 'Đồ chơi nhà bếp, bác sĩ giúp bé hoá thân nhập vai.',
  },
];

const DEMO_PRODUCTS: Array<{
  slug: string;
  sku: string;
  name: string;
  brandSlug: string;
  categorySlug: string;
  price: number;
  compareAtPrice?: number;
  ageMin: number;
  ageMax: number;
  weightGrams: number;
  material: string;
  shortDescription: string;
  description: string;
  stock: number;
}> = [
  // Đồ chơi lắp ráp (thêm vào danh mục đã có sẵn từ seedCatalog)
  {
    slug: 'lego-friends-heartlake-city',
    sku: 'LEGO-FRIENDS-002',
    name: 'LEGO Friends - Trung tâm cộng đồng Heartlake City',
    brandSlug: 'lego',
    categorySlug: 'do-choi-lap-rap',
    price: 1250000,
    compareAtPrice: 1390000,
    ageMin: 7,
    ageMax: 12,
    weightGrams: 980,
    material: 'Nhựa ABS an toàn',
    shortDescription: 'Bộ lắp ráp Heartlake City với nhiều khu vực sinh hoạt cộng đồng.',
    description:
      '<p>Bộ LEGO Friends tái hiện trung tâm cộng đồng Heartlake City với hơn 400 mảnh ghép, kèm nhân vật và phụ kiện sinh động.</p>',
    stock: 60,
  },
  {
    slug: 'lego-technic-xe-dua-the-thao',
    sku: 'LEGO-TECH-003',
    name: 'LEGO Technic - Xe đua thể thao',
    brandSlug: 'lego',
    categorySlug: 'do-choi-lap-rap',
    price: 1590000,
    ageMin: 8,
    ageMax: 14,
    weightGrams: 1100,
    material: 'Nhựa ABS kỹ thuật',
    shortDescription: 'Mô hình xe đua cơ khí chuyển động thật với cơ cấu Technic.',
    description:
      '<p>Bộ LEGO Technic mô phỏng xe đua thể thao với cơ cấu truyền động cơ khí thật, phù hợp cho bé yêu thích kỹ thuật.</p>',
    stock: 40,
  },
  // Thú nhồi bông
  {
    slug: 'gau-bong-teddy-classic-40cm',
    sku: 'TEDDY-001',
    name: 'Gấu bông Teddy Classic 40cm',
    brandSlug: 'teddy-house',
    categorySlug: 'thu-nhoi-bong',
    price: 250000,
    ageMin: 0,
    ageMax: 6,
    weightGrams: 400,
    material: 'Bông ép cao cấp, vải nhung mềm',
    shortDescription: 'Gấu bông cổ điển mềm mại, an toàn cho bé sơ sinh.',
    description:
      '<p>Gấu bông Teddy Classic cao 40cm, chất liệu bông ép cao cấp không xù lông, an toàn tuyệt đối cho bé từ sơ sinh.</p>',
    stock: 100,
  },
  {
    slug: 'cun-bong-corgi-om-goi',
    sku: 'TEDDY-002',
    name: 'Cún bông Corgi ôm gối',
    brandSlug: 'teddy-house',
    categorySlug: 'thu-nhoi-bong',
    price: 199000,
    ageMin: 0,
    ageMax: 6,
    weightGrams: 350,
    material: 'Vải nỉ mềm, bông gòn siêu sạch',
    shortDescription: 'Cún bông Corgi hình dáng đáng yêu, ôm vừa tay bé.',
    description:
      '<p>Cún bông Corgi thiết kế dạng gối ôm, chất liệu vải nỉ mềm mịn, giúp bé ngủ ngon và an tâm hơn.</p>',
    stock: 90,
  },
  {
    slug: 'tho-bong-bunny-pastel-35cm',
    sku: 'TEDDY-003',
    name: 'Thỏ bông Bunny Pastel 35cm',
    brandSlug: 'teddy-house',
    categorySlug: 'thu-nhoi-bong',
    price: 220000,
    ageMin: 0,
    ageMax: 6,
    weightGrams: 320,
    material: 'Bông ép, vải nhung pastel',
    shortDescription: 'Thỏ bông màu pastel dịu nhẹ, phù hợp trang trí phòng bé.',
    description:
      '<p>Thỏ bông Bunny Pastel với tông màu nhẹ nhàng, chất liệu an toàn, vừa để chơi vừa để trang trí phòng bé.</p>',
    stock: 85,
  },
  // Đồ chơi giáo dục STEM
  {
    slug: 'bo-xep-hinh-stem-robot-lap-trinh',
    sku: 'VTECH-STEM-001',
    name: 'Bộ xếp hình STEM Robot lập trình',
    brandSlug: 'vtech',
    categorySlug: 'do-choi-giao-duc-stem',
    price: 690000,
    compareAtPrice: 790000,
    ageMin: 6,
    ageMax: 12,
    weightGrams: 700,
    material: 'Nhựa ABS, mạch điện tử an toàn',
    shortDescription: 'Robot lắp ráp có thể lập trình chuyển động cơ bản.',
    description:
      '<p>Bộ STEM cho phép bé tự lắp ráp robot và lập trình các chuyển động cơ bản qua ứng dụng đi kèm, phát triển tư duy logic.</p>',
    stock: 55,
  },
  {
    slug: 'kinh-hien-vi-khoa-hoc-cho-be',
    sku: 'VTECH-STEM-002',
    name: 'Kính hiển vi khoa học cho bé',
    brandSlug: 'vtech',
    categorySlug: 'do-choi-giao-duc-stem',
    price: 450000,
    ageMin: 8,
    ageMax: 14,
    weightGrams: 600,
    material: 'Nhựa quang học, kính chịu lực',
    shortDescription: 'Kính hiển vi độ phóng đại 100x-1200x cho bé khám phá khoa học.',
    description:
      '<p>Bộ kính hiển vi kèm phụ kiện tiêu bản giúp bé khám phá thế giới vi mô, khơi dậy niềm yêu thích khoa học.</p>',
    stock: 45,
  },
  {
    slug: 'bo-thi-nghiem-hoa-hoc-vui',
    sku: 'VTECH-STEM-003',
    name: 'Bộ thí nghiệm hoá học vui',
    brandSlug: 'vtech',
    categorySlug: 'do-choi-giao-duc-stem',
    price: 380000,
    ageMin: 8,
    ageMax: 14,
    weightGrams: 550,
    material: 'Hoá chất an toàn, dụng cụ nhựa',
    shortDescription: 'Hơn 20 thí nghiệm hoá học an toàn, trực quan cho bé.',
    description:
      '<p>Bộ thí nghiệm gồm hoá chất và dụng cụ an toàn, kèm sách hướng dẫn hơn 20 thí nghiệm vui cho bé tự thực hành.</p>',
    stock: 50,
  },
  // Xe mô hình
  {
    slug: 'xe-dua-hot-wheels-track-builder',
    sku: 'HW-001',
    name: 'Xe đua Hot Wheels Track Builder',
    brandSlug: 'hot-wheels',
    categorySlug: 'xe-mo-hinh',
    price: 320000,
    ageMin: 4,
    ageMax: 10,
    weightGrams: 450,
    material: 'Nhựa ABS, kim loại hợp kim',
    shortDescription: 'Bộ đường đua kèm xe mô hình lắp ghép tự do.',
    description:
      '<p>Bộ Track Builder cho phép bé tự thiết kế đường đua với nhiều địa hình, kèm xe mô hình hợp kim tốc độ cao.</p>',
    stock: 70,
  },
  {
    slug: 'mo-hinh-xe-cuu-hoa-dieu-khien-tu-xa',
    sku: 'HW-002',
    name: 'Mô hình xe cứu hỏa điều khiển từ xa',
    brandSlug: 'hot-wheels',
    categorySlug: 'xe-mo-hinh',
    price: 590000,
    compareAtPrice: 650000,
    ageMin: 5,
    ageMax: 12,
    weightGrams: 800,
    material: 'Nhựa ABS, motor điện',
    shortDescription: 'Xe cứu hỏa điều khiển từ xa với đèn và còi báo động thật.',
    description:
      '<p>Mô hình xe cứu hỏa tỉ lệ lớn, điều khiển từ xa, tích hợp đèn LED và âm thanh còi báo động sống động.</p>',
    stock: 35,
  },
  {
    slug: 'bo-suu-tap-xe-mo-hinh-5-chiec',
    sku: 'HW-003',
    name: 'Bộ sưu tập xe mô hình 5 chiếc',
    brandSlug: 'hot-wheels',
    categorySlug: 'xe-mo-hinh',
    price: 280000,
    ageMin: 3,
    ageMax: 10,
    weightGrams: 380,
    material: 'Hợp kim, nhựa ABS',
    shortDescription: 'Combo 5 xe mô hình đa dạng kiểu dáng, tỉ lệ 1:64.',
    description:
      '<p>Bộ 5 xe mô hình tỉ lệ 1:64 với nhiều kiểu dáng khác nhau, thích hợp sưu tầm và chơi cùng đường đua.</p>',
    stock: 80,
  },
  // Búp bê & phụ kiện
  {
    slug: 'bup-be-barbie-dreamhouse',
    sku: 'MATTEL-001',
    name: 'Búp bê Barbie kèm nhà Dreamhouse',
    brandSlug: 'mattel',
    categorySlug: 'bup-be-phu-kien',
    price: 1450000,
    compareAtPrice: 1650000,
    ageMin: 4,
    ageMax: 10,
    weightGrams: 1600,
    material: 'Nhựa PVC an toàn, vải phụ kiện',
    shortDescription: 'Búp bê Barbie kèm nhà đồ chơi 3 tầng đầy đủ nội thất.',
    description:
      '<p>Bộ Barbie Dreamhouse gồm búp bê và mô hình nhà 3 tầng với đầy đủ nội thất, giúp bé thoả sức sáng tạo câu chuyện.</p>',
    stock: 25,
  },
  {
    slug: 'bup-be-barbie-fashionista',
    sku: 'MATTEL-002',
    name: 'Búp bê thời trang Barbie Fashionista',
    brandSlug: 'mattel',
    categorySlug: 'bup-be-phu-kien',
    price: 320000,
    ageMin: 3,
    ageMax: 10,
    weightGrams: 250,
    material: 'Nhựa PVC, vải trang phục',
    shortDescription: 'Búp bê Barbie với trang phục thời trang có thể thay đổi.',
    description:
      '<p>Búp bê Barbie Fashionista với nhiều bộ trang phục thời trang đi kèm, khuyến khích bé sáng tạo phong cách riêng.</p>',
    stock: 90,
  },
  {
    slug: 'bo-phu-kien-xe-hoi-cho-bup-be',
    sku: 'MATTEL-003',
    name: 'Bộ phụ kiện xe hơi cho búp bê',
    brandSlug: 'mattel',
    categorySlug: 'bup-be-phu-kien',
    price: 410000,
    ageMin: 4,
    ageMax: 10,
    weightGrams: 700,
    material: 'Nhựa ABS',
    shortDescription: 'Xe hơi mui trần tỉ lệ phù hợp cho búp bê thời trang.',
    description:
      '<p>Xe hơi mui trần đầy màu sắc, thiết kế vừa vặn cho búp bê thời trang, mở rộng thế giới trò chơi của bé.</p>',
    stock: 40,
  },
  // Đồ chơi ngoài trời
  {
    slug: 'cau-truot-lien-xich-du-mini',
    sku: 'LT-001',
    name: 'Cầu trượt liền xích đu mini',
    brandSlug: 'little-tikes',
    categorySlug: 'do-choi-ngoai-troi',
    price: 2890000,
    ageMin: 2,
    ageMax: 6,
    weightGrams: 15000,
    material: 'Nhựa HDPE chịu lực, chống tia UV',
    shortDescription: 'Bộ cầu trượt liền xích đu cho sân vườn, chịu lực tốt.',
    description:
      '<p>Bộ cầu trượt kết hợp xích đu, khung nhựa HDPE chịu lực và chống tia UV, phù hợp lắp đặt sân vườn gia đình.</p>',
    stock: 15,
  },
  {
    slug: 'xe-choi-chan-cho-be',
    sku: 'LT-002',
    name: 'Xe chòi chân cho bé',
    brandSlug: 'little-tikes',
    categorySlug: 'do-choi-ngoai-troi',
    price: 690000,
    ageMin: 1,
    ageMax: 3,
    weightGrams: 3200,
    material: 'Nhựa ABS chịu lực',
    shortDescription: 'Xe chòi chân giúp bé tập đi và rèn luyện vận động.',
    description:
      '<p>Xe chòi chân thiết kế chắc chắn, hỗ trợ bé tập đi những bước đầu tiên và rèn luyện khả năng giữ thăng bằng.</p>',
    stock: 45,
  },
  {
    slug: 'be-bong-vui-nhon-100-bong',
    sku: 'LT-003',
    name: 'Bể bóng vui nhộn kèm 100 bóng',
    brandSlug: 'little-tikes',
    categorySlug: 'do-choi-ngoai-troi',
    price: 550000,
    ageMin: 1,
    ageMax: 5,
    weightGrams: 2500,
    material: 'Vải lưới bền, bóng nhựa an toàn',
    shortDescription: 'Bể bóng gấp gọn kèm 100 bóng nhựa nhiều màu sắc.',
    description:
      '<p>Bể bóng vải lưới thoáng khí, dễ gấp gọn cất giữ, kèm 100 quả bóng nhựa an toàn nhiều màu sắc.</p>',
    stock: 30,
  },
  // Đồ chơi âm nhạc
  {
    slug: 'dan-piano-cho-be-tap-choi',
    sku: 'VTECH-MUSIC-001',
    name: 'Đàn piano cho bé tập chơi',
    brandSlug: 'vtech',
    categorySlug: 'do-choi-am-nhac',
    price: 450000,
    ageMin: 1,
    ageMax: 5,
    weightGrams: 900,
    material: 'Nhựa ABS an toàn',
    shortDescription: 'Đàn piano mini nhiều âm thanh, đèn nhạc sinh động.',
    description:
      '<p>Đàn piano mini với các phím đàn phát âm thanh và đèn LED sinh động, giúp bé làm quen với âm nhạc từ sớm.</p>',
    stock: 60,
  },
  {
    slug: 'trong-luc-lac-am-nhac-vui-nhon',
    sku: 'VTECH-MUSIC-002',
    name: 'Trống lục lạc âm nhạc vui nhộn',
    brandSlug: 'vtech',
    categorySlug: 'do-choi-am-nhac',
    price: 250000,
    ageMin: 0,
    ageMax: 3,
    weightGrams: 400,
    material: 'Nhựa ABS, vải bọc mềm',
    shortDescription: 'Bộ trống và lục lạc âm thanh vui nhộn cho bé sơ sinh.',
    description:
      '<p>Bộ nhạc cụ mini gồm trống và lục lạc, âm thanh vui nhộn kích thích thính giác cho bé từ sơ sinh.</p>',
    stock: 75,
  },
  {
    slug: 'micro-karaoke-mini-cho-be',
    sku: 'VTECH-MUSIC-003',
    name: 'Micro karaoke mini cho bé',
    brandSlug: 'vtech',
    categorySlug: 'do-choi-am-nhac',
    price: 320000,
    ageMin: 3,
    ageMax: 8,
    weightGrams: 300,
    material: 'Nhựa ABS, loa mini tích hợp',
    shortDescription: 'Micro karaoke kèm loa và hiệu ứng ánh sáng theo nhạc.',
    description:
      '<p>Micro karaoke mini tích hợp loa và hiệu ứng đèn theo nhịp nhạc, giúp bé thoả sức ca hát và biểu diễn.</p>',
    stock: 65,
  },
  // Board game trí tuệ
  {
    slug: 'co-vua-go-cao-cap-cho-be',
    sku: 'RVB-001',
    name: 'Cờ vua gỗ cao cấp cho bé',
    brandSlug: 'ravensburger',
    categorySlug: 'board-game-tri-tue',
    price: 350000,
    ageMin: 6,
    ageMax: 14,
    weightGrams: 1200,
    material: 'Gỗ tự nhiên sơn an toàn',
    shortDescription: 'Bộ cờ vua gỗ thủ công, quân cờ chạm khắc tinh xảo.',
    description:
      '<p>Bộ cờ vua gỗ tự nhiên, quân cờ chạm khắc tinh xảo, giúp bé rèn luyện tư duy chiến thuật từ sớm.</p>',
    stock: 40,
  },
  {
    slug: 'bo-xep-hinh-100-manh-dong-vat',
    sku: 'RVB-002',
    name: 'Bộ xếp hình 100 mảnh chủ đề động vật',
    brandSlug: 'ravensburger',
    categorySlug: 'board-game-tri-tue',
    price: 180000,
    ageMin: 4,
    ageMax: 10,
    weightGrams: 350,
    material: 'Giấy bìa cứng cao cấp',
    shortDescription: 'Bộ xếp hình 100 mảnh chủ đề động vật hoang dã.',
    description:
      '<p>Bộ xếp hình 100 mảnh in hình động vật hoang dã sắc nét, giúp bé rèn luyện khả năng quan sát và kiên nhẫn.</p>',
    stock: 70,
  },
  {
    slug: 'tro-choi-tri-nho-memory-match',
    sku: 'RVB-003',
    name: 'Trò chơi trí nhớ Memory Match',
    brandSlug: 'ravensburger',
    categorySlug: 'board-game-tri-tue',
    price: 210000,
    ageMin: 4,
    ageMax: 10,
    weightGrams: 300,
    material: 'Giấy bìa cứng, hộp nhựa',
    shortDescription: 'Trò chơi lật thẻ ghi nhớ hình ảnh, rèn trí nhớ cho bé.',
    description:
      '<p>Trò chơi Memory Match gồm các cặp thẻ hình ảnh sinh động, giúp bé rèn luyện trí nhớ và khả năng tập trung.</p>',
    stock: 65,
  },
  // Đồ chơi hoá thân
  {
    slug: 'bo-do-choi-nha-bep-mini',
    sku: 'FP-001',
    name: 'Bộ đồ chơi nhà bếp mini',
    brandSlug: 'fisher-price',
    categorySlug: 'do-choi-nha-bep',
    price: 590000,
    compareAtPrice: 690000,
    ageMin: 3,
    ageMax: 8,
    weightGrams: 1300,
    material: 'Nhựa ABS an toàn',
    shortDescription: 'Bộ bếp mini đầy đủ dụng cụ nấu ăn cho bé hoá thân đầu bếp.',
    description:
      '<p>Bộ đồ chơi nhà bếp mini với bếp nấu, nồi, chảo và thực phẩm giả, giúp bé hoá thân thành đầu bếp nhí.</p>',
    stock: 35,
  },
  {
    slug: 'bo-dung-cu-bac-si-cho-be',
    sku: 'FP-002',
    name: 'Bộ dụng cụ bác sĩ cho bé',
    brandSlug: 'fisher-price',
    categorySlug: 'do-choi-nha-bep',
    price: 280000,
    ageMin: 3,
    ageMax: 8,
    weightGrams: 500,
    material: 'Nhựa ABS an toàn',
    shortDescription: 'Bộ dụng cụ khám bệnh mini kèm vali xách tay.',
    description:
      '<p>Bộ dụng cụ bác sĩ mini gồm ống nghe, nhiệt kế, kim tiêm giả kèm vali xách tay tiện lợi cho bé nhập vai.</p>',
    stock: 50,
  },
  {
    slug: 'bo-do-choi-lam-banh-mini',
    sku: 'FP-003',
    name: 'Bộ đồ chơi làm bánh mini',
    brandSlug: 'fisher-price',
    categorySlug: 'do-choi-nha-bep',
    price: 320000,
    ageMin: 3,
    ageMax: 8,
    weightGrams: 600,
    material: 'Nhựa ABS an toàn',
    shortDescription: 'Bộ dụng cụ làm bánh mini cho bé thoả sức sáng tạo.',
    description:
      '<p>Bộ đồ chơi làm bánh mini với khuôn, dụng cụ trộn và bánh giả nhiều màu sắc, kích thích trí tưởng tượng của bé.</p>',
    stock: 55,
  },
];

async function seedDemoCatalog() {
  const brands: Record<string, { id: string }> = {};
  for (const b of DEMO_BRANDS) {
    brands[b.slug] = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        name: b.name,
        slug: b.slug,
        description: b.description,
        originCountry: b.originCountry,
      },
    });
  }

  // 'lego' was already created by seedCatalog(); look it up for the extra LEGO products.
  brands['lego'] = await prisma.brand.findUniqueOrThrow({ where: { slug: 'lego' } });

  const categories: Record<string, { id: string }> = {};
  for (const c of DEMO_CATEGORIES) {
    categories[c.slug] = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
      },
    });
  }
  // 'do-choi-lap-rap' was already created by seedCatalog(); look it up for the extra LEGO products.
  categories['do-choi-lap-rap'] = await prisma.category.findUniqueOrThrow({
    where: { slug: 'do-choi-lap-rap' },
  });

  for (const p of DEMO_PRODUCTS) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        brandId: brands[p.brandSlug].id,
        status: 'PUBLISHED',
        shortDescription: p.shortDescription,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        material: p.material,
        ageMin: p.ageMin,
        ageMax: p.ageMax,
        weightGrams: p.weightGrams,
        publishedAt: new Date('2026-03-01T00:00:00.000Z'),
        categories: {
          create: [{ categoryId: categories[p.categorySlug].id }],
        },
        images: {
          create: [
            {
              url: `https://placehold.co/800x800?text=${encodeURIComponent(p.name)}`,
              altText: p.name,
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        inventory: {
          create: {
            quantityOnHand: p.stock,
            quantityReserved: 0,
            lowStockThreshold: 10,
          },
        },
      },
    });
  }
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

// Maps each product/blog slug to a real demo image bundled in the web app's
// public/demo folder (the reproducible source). At seed time each image is
// uploaded to Cloudflare R2 and the record points at the R2 URL — mirroring the
// production admin flow (AdminMediaService.upload: R2 write + MediaAsset row) —
// falling back to the local `/demo/...` path only when R2 isn't configured.
// Kept separate from the product/blog `create` blocks above because those
// upsert with `update: {}` — a no-op on rows that already exist — so this
// reconcile pass is what actually (re)applies images on every seed run, to
// both new and pre-existing rows.
const PRODUCT_IMAGES: Record<string, string> = {
  'lego-city-xe-cuu-hoa': '/demo/lego-fire-truck.jpg',
  'lego-friends-heartlake-city': '/demo/lego-friends.jpg',
  'lego-technic-xe-dua-the-thao': '/demo/lego-technic.jpg',
  'gau-bong-teddy-classic-40cm': '/demo/teddy-bear.jpg',
  'cun-bong-corgi-om-goi': '/demo/plush-dog.jpg',
  'tho-bong-bunny-pastel-35cm': '/demo/plush-rabbit.jpg',
  'bo-xep-hinh-stem-robot-lap-trinh': '/demo/toy-robot.jpg',
  'kinh-hien-vi-khoa-hoc-cho-be': '/demo/microscope.jpg',
  'bo-thi-nghiem-hoa-hoc-vui': '/demo/chemistry-set.jpg',
  'xe-dua-hot-wheels-track-builder': '/demo/toy-car-track.jpg',
  'mo-hinh-xe-cuu-hoa-dieu-khien-tu-xa': '/demo/toy-fire-truck.jpg',
  'bo-suu-tap-xe-mo-hinh-5-chiec': '/demo/diecast-cars.jpg',
  'bup-be-barbie-dreamhouse': '/demo/dollhouse.jpg',
  'bup-be-barbie-fashionista': '/demo/fashion-doll.jpg',
  'bo-phu-kien-xe-hoi-cho-bup-be': '/demo/toy-convertible.jpg',
  'cau-truot-lien-xich-du-mini': '/demo/playground-slide.jpg',
  'xe-choi-chan-cho-be': '/demo/ride-on-toy.jpg',
  'be-bong-vui-nhon-100-bong': '/demo/ball-pit.jpg',
  'dan-piano-cho-be-tap-choi': '/demo/toy-piano.jpg',
  'trong-luc-lac-am-nhac-vui-nhon': '/demo/toy-drum.jpg',
  'micro-karaoke-mini-cho-be': '/demo/toy-microphone.jpg',
  'co-vua-go-cao-cap-cho-be': '/demo/chess-wooden.jpg',
  'bo-xep-hinh-100-manh-dong-vat': '/demo/jigsaw-puzzle.jpg',
  'tro-choi-tri-nho-memory-match': '/demo/memory-game.jpg',
  'bo-do-choi-nha-bep-mini': '/demo/toy-kitchen.jpg',
  'bo-dung-cu-bac-si-cho-be': '/demo/doctor-kit.jpg',
  'bo-do-choi-lam-banh-mini': '/demo/play-food.jpg',
};

const BLOG_COVERS: Record<string, string> = {
  'cach-chon-do-choi-phu-hop-theo-do-tuoi': '/demo/blog/choose-toys.jpg',
  'loi-ich-cua-do-choi-lap-rap-voi-tre-em': '/demo/blog/lego-bricks.jpg',
};

const r2Enabled = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL,
);

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
  });
}

// Uploads a bundled demo image to R2 (mirroring AdminMediaService.upload's R2
// write + MediaAsset row) and returns its public URL. Uses a stable key so
// re-running the seed overwrites the same object/row instead of duplicating.
// Falls back to the local `/demo/...` path when R2 isn't configured.
async function resolveDemoImageUrl(client: S3Client | null, localUrl: string): Promise<string> {
  const fileName = localUrl.replace(/^\/demo\//, '');
  if (!client) return localUrl;

  const key = `demo/${fileName}`;
  const body = readFileSync(join(__dirname, '../../web/public/demo', fileName));
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME as string,
      Key: key,
      Body: body,
      ContentType: 'image/jpeg',
    }),
  );
  const url = `${(process.env.R2_PUBLIC_URL as string).replace(/\/$/, '')}/${key}`;

  await prisma.mediaAsset.upsert({
    where: { key },
    update: { url, sizeBytes: body.length },
    create: {
      key,
      url,
      type: MediaType.IMAGE,
      mimeType: 'image/jpeg',
      sizeBytes: body.length,
    },
  });

  return url;
}

async function seedDemoImages() {
  const client = r2Enabled ? getR2Client() : null;
  if (!client) {
    console.warn('R2 not configured — seeding local /demo image paths instead of R2 URLs.');
  }

  for (const [slug, localUrl] of Object.entries(PRODUCT_IMAGES)) {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) continue;
    const url = await resolveDemoImageUrl(client, localUrl);
    // Replace all images so this is idempotent regardless of prior state.
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url,
        altText: product.name,
        isPrimary: true,
        sortOrder: 0,
      },
    });
  }

  for (const [slug, localUrl] of Object.entries(BLOG_COVERS)) {
    const coverImageUrl = await resolveDemoImageUrl(client, localUrl);
    await prisma.blogPost.updateMany({ where: { slug }, data: { coverImageUrl } });
  }
}

async function main() {
  await seedRolesAndPermissions();
  await seedAdminUser();
  await seedCatalog();
  await seedDemoCatalog();
  await seedContent();
  await seedDemoImages();
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
