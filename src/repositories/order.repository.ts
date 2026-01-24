import { PrismaClient, Order, OrderItem } from '@prisma/client';
import { injectable, inject } from 'inversify';

export interface CreateOrderDTO {
  userId: number;
  total: number;
  totalQuantity?: number;
  status?: string;
  shippingAddress?: string;
  notes?: string;
}

export interface CreateOrderItemDTO {
  orderId: number;
  supplementId: number;
  quantity: number;
  price: number;
  productName?: string;
}

export interface OrderWithItems extends Order {
  items: (OrderItem & {
    supplement: {
      id: number;
      name: string;
      description: string;
      price: number;
      imageUrl: string | null;
    };
  })[];
}

@injectable()
export class OrderRepository {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  async create(data: CreateOrderDTO): Promise<Order> {
    return this.prisma.order.create({
      data: {
        userId: data.userId,
        total: data.total,
        totalQuantity: data.totalQuantity || 0,
        status: data.status || 'pending',
        shippingAddress: data.shippingAddress,
        notes: data.notes,
      },
    });
  }

  async findById(id: number): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            supplement: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    }) as Promise<OrderWithItems | null>;
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            supplement: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    }) as Promise<OrderWithItems | null>;
  }

  async findByUserId(userId: number, skip?: number, take?: number): Promise<{ orders: OrderWithItems[]; total: number }> {
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              supplement: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: take || 10,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return { orders: orders as OrderWithItems[], total };
  }

  async updateStatus(id: number, status: string): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async addOrderItem(data: CreateOrderItemDTO): Promise<OrderItem> {
    return this.prisma.orderItem.create({
      data: {
        orderId: data.orderId,
        supplementId: data.supplementId,
        quantity: data.quantity,
        price: data.price,
        productName: data.productName,
      },
    });
  }

  async createOrderFromCart(
    userId: number,
    cartItems: Array<{
      supplementId: number;
      quantity: number;
      supplement: { id: number; name: string; price: number };
    }>,
    total: number,
    shippingAddress?: string
  ): Promise<Order> {
    // Calculate total quantity from all cart items
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return this.prisma.$transaction(async (tx) => {
      // Create the order with total and totalQuantity
      const order = await tx.order.create({
        data: {
          userId,
          total,
          totalQuantity,
          status: 'pending',
          shippingAddress,
        },
      });

      // Create order items
      await tx.orderItem.createMany({
        data: cartItems.map((item) => ({
          orderId: order.id,
          supplementId: item.supplementId,
          quantity: item.quantity,
          price: item.supplement.price,
          productName: item.supplement.name,
        })),
      });

      return order;
    });
  }
}
