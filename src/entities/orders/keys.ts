export const ordersKeys = {
  list: (page?: number) => ['orders', 'list', page] as const,
  shipment: (orderId: string) => ['orders', 'shipment', orderId] as const,
};
