import { Injectable } from '@nestjs/common';
import type { FaqEntryView } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<FaqEntryView[]> {
    const entries = await this.prisma.faqEntry.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return entries.map((entry) => ({
      id: entry.id,
      question: entry.question,
      answer: entry.answer,
      category: entry.category,
    }));
  }
}
