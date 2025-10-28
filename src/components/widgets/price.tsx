import { formatCurrency } from "@/lib/utils";

export type PriceProps = {
  amount: number;
  currency: string;
  className?: string;
};

export const Price = ({ amount, currency, className }: PriceProps) => (
  <span className={className}>{formatCurrency(amount, currency)}</span>
);
