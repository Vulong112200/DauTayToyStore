import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import type {
  AdminOrderListItem,
  AdminOrderQuery,
  OrderView,
  PaginatedResponse,
  UpdateOrderStatusInput,
} from '@repo/contracts';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ORDER_VIEW_INCLUDE, toOrderView } from './order-view.util';

/**
 * Valid forward transitions. CANCELLED releases the reserved-but-not-yet-shipped
 * stock; SHIPPED is when goods actually leave the warehouse, so that's when
 * quantityOnHand is decremented (checkout only ever reserves, never decrements
 * on-hand — see OrdersService.checkout). CANCELLED/REFUNDED are terminal.
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [OrderStatus.REFUNDED],
  CANCELLED: [],
  REFUNDED: [],
};

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(query: AdminOrderQuery): Promise<PaginatedResponse<AdminOrderListItem>> {
    const where: Prisma.OrderWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.q && {
        OR: [
          { orderNumber: { contains: query.q, mode: 'insensitive' } },
          { customerName: { contains: query.q, mode: 'insensitive' } },
          { customerEmail: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { items: { select: { quantity: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: rows.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: order.status,
        total: order.total,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.createdAt.toISOString(),
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async findById(id: string): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_VIEW_INCLUDE });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return toOrderView(order);
  }

  async updateStatus(id: string, input: UpdateOrderStatusInput): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { select: { productId: true, variantId: true, quantity: true } } },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const allowedNextStatuses = VALID_TRANSITIONS[order.status];
    if (!allowedNextStatuses.includes(input.status)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái đơn hàng từ ${order.status} sang ${input.status}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (input.status === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          const where = item.variantId
            ? { variantId: item.variantId }
            : { productId: item.productId };
          await tx.inventory.updateMany({
            where,
            data: { quantityReserved: { decrement: item.quantity } },
          });
        }
      }

      if (input.status === OrderStatus.SHIPPED) {
        for (const item of order.items) {
          const where = item.variantId
            ? { variantId: item.variantId }
            : { productId: item.productId };
          await tx.inventory.updateMany({
            where,
            data: {
              quantityOnHand: { decrement: item.quantity },
              quantityReserved: { decrement: item.quantity },
            },
          });
        }
      }

      await tx.order.update({ where: { id }, data: { status: input.status } });
      await tx.orderStatusHistory.create({
        data: { orderId: id, status: input.status, note: input.note },
      });
    });

    return this.findById(id);
  }
}
