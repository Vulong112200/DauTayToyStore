import { Injectable } from '@nestjs/common';
import type { ContactMessageInput } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(input: ContactMessageInput): Promise<void> {
    await this.prisma.contactMessage.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
      },
    });
  }
}
