import { PrismaService } from '../../../infra/prisma/prisma.service';
import { FlashSalesService } from './flash-sales.service';

describe('FlashSalesService (public)', () => {
  let service: FlashSalesService;
  let prisma: { flashSale: { findMany: jest.Mock } };

  const makeItem = (overrides: Record<string, unknown> = {}) => ({
    productId: 'p1',
    salePrice: 90_000,
    stockLimit: null,
    soldCount: 0,
    product: {
      slug: 'lego-city',
      name: 'LEGO City',
      price: 120_000,
      status: 'PUBLISHED',
      images: [{ url: 'https://cdn/img.jpg' }],
    },
    ...overrides,
  });

  const makeSale = (items: unknown[]) => ({
    id: 'fs1',
    name: 'Flash sale hè',
    startsAt: new Date('2026-07-01'),
    endsAt: new Date('2026-07-20'),
    isActive: true,
    items,
  });

  beforeEach(() => {
    prisma = { flashSale: { findMany: jest.fn() } };
    service = new FlashSalesService(prisma as unknown as PrismaService);
  });

  it('only queries flash sales that are active and within their date window', async () => {
    prisma.flashSale.findMany.mockResolvedValue([]);

    await service.findActive();

    const [args] = prisma.flashSale.findMany.mock.calls[0];
    expect(args.where.isActive).toBe(true);
    expect(args.where.startsAt).toHaveProperty('lte');
    expect(args.where.endsAt).toHaveProperty('gte');
  });

  it('maps items to the public shape with computed discountPercent, soldOut and image', async () => {
    prisma.flashSale.findMany.mockResolvedValue([
      makeSale([makeItem({ stockLimit: 10, soldCount: 10 })]),
    ]);

    const sales = await service.findActive();

    expect(sales).toHaveLength(1);
    expect(sales[0]!.items[0]).toEqual({
      productId: 'p1',
      slug: 'lego-city',
      name: 'LEGO City',
      primaryImageUrl: 'https://cdn/img.jpg',
      originalPrice: 120_000,
      salePrice: 90_000,
      discountPercent: 25, // (120k - 90k) / 120k = 25%
      stockLimit: 10,
      soldCount: 10,
      soldOut: true, // soldCount >= stockLimit
    });
  });

  it('hides unpublished products, and drops a sale left with no visible items', async () => {
    prisma.flashSale.findMany.mockResolvedValue([
      makeSale([
        makeItem({ product: { ...makeItem().product, status: 'ARCHIVED' } }),
      ]),
    ]);

    const result = await service.findActive();

    expect(result).toEqual([]);
  });

  it('treats an item with no stock limit as never sold out and null image when missing', async () => {
    prisma.flashSale.findMany.mockResolvedValue([
      makeSale([
        makeItem({ stockLimit: null, soldCount: 5, product: { ...makeItem().product, images: [] } }),
      ]),
    ]);

    const item = (await service.findActive())[0]!.items[0]!;

    expect(item.soldOut).toBe(false);
    expect(item.primaryImageUrl).toBeNull();
  });
});
