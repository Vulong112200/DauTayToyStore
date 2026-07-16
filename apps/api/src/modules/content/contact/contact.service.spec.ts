import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;
  let prisma: { contactMessage: { create: jest.Mock } };

  beforeEach(() => {
    prisma = { contactMessage: { create: jest.fn() } };
    service = new ContactService(prisma as unknown as PrismaService);
  });

  it('creates a contact message with the submitted fields', async () => {
    await service.submit({
      name: 'Nguyen Van A',
      email: 'a@example.com',
      phone: '0912345678',
      subject: 'Hỏi về sản phẩm',
      message: 'Sản phẩm này còn hàng không ạ?',
    });

    expect(prisma.contactMessage.create).toHaveBeenCalledWith({
      data: {
        name: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0912345678',
        subject: 'Hỏi về sản phẩm',
        message: 'Sản phẩm này còn hàng không ạ?',
      },
    });
  });
});
