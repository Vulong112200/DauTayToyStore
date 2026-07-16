import { PrismaService } from '../../../infra/prisma/prisma.service';
import { FaqService } from './faq.service';

describe('FaqService', () => {
  let service: FaqService;
  let prisma: { faqEntry: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { faqEntry: { findMany: jest.fn() } };
    service = new FaqService(prisma as unknown as PrismaService);
  });

  it('lists only active entries ordered by sortOrder', async () => {
    prisma.faqEntry.findMany.mockResolvedValue([
      { id: 'f1', question: 'Q1', answer: 'A1', category: 'Vận chuyển' },
    ]);

    const result = await service.list();

    expect(prisma.faqEntry.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    expect(result).toEqual([{ id: 'f1', question: 'Q1', answer: 'A1', category: 'Vận chuyển' }]);
  });
});
