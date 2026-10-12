'use client';

import { useTranslations } from 'next-intl';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'price-asc'
  | 'price-desc'
  | 'newest'
  | 'rating';

interface ProductSortProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

/** Keys under `catalog.productSort.options` in the message catalogs. */
type SortLabelKey = 'nameAsc' | 'nameDesc' | 'priceAsc' | 'priceDesc' | 'newest' | 'rating';

const SORT_OPTIONS: Array<{ value: SortOption; labelKey: SortLabelKey }> = [
  { value: 'name-asc', labelKey: 'nameAsc' },
  { value: 'name-desc', labelKey: 'nameDesc' },
  { value: 'price-asc', labelKey: 'priceAsc' },
  { value: 'price-desc', labelKey: 'priceDesc' },
  { value: 'newest', labelKey: 'newest' },
  { value: 'rating', labelKey: 'rating' },
];

export function ProductSort({ value, onChange, className }: ProductSortProps) {
  const t = useTranslations('catalog.productSort');
  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full sm:w-[200px]" aria-label={t('label')}>
          <SelectValue placeholder={t('placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(`options.${option.labelKey}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
