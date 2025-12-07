export type PromoDiscountType = 'percent' | 'amount';

export interface Promo {
  code: string;
  discountType: PromoDiscountType;
  value: number;
  label?: string;
  expiresAt?: string;
  minSubtotal?: number;
}
export type PromoCode = Promo['code'];
