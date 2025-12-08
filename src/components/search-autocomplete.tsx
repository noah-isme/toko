'use client';

import { Search, TrendingUp } from 'lucide-react';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

import { Input } from '@/components/ui/input';
import { useProducts } from '@/lib/api';
import { formatCurrency } from '@/lib/api/utils';
import { cn } from '@/lib/utils';

interface SearchAutocompleteProps {
  className?: string;
  placeholder?: string;
}

export function SearchAutocomplete({
  className,
  placeholder = 'Search products...',
}: SearchAutocompleteProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(() => params.get('q') ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: searchResults } = useProducts(
    {
      q: debouncedValue,
      limit: 5,
    },
    {
      enabled: debouncedValue.length >= 2,
    },
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchTerm)}` as Route);
      setIsOpen(false);
    }
  };

  const handleProductClick = (slug: string) => {
    router.push(`/products/${slug}` as Route);
    setIsOpen(false);
    setValue('');
  };

  const popularSearches = ['Laptop', 'Smartphone', 'Headphones', 'Camera'];

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-lg', className)} role="search">
      <div className="relative flex items-center">
        <Search aria-hidden="true" className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Search products"
          className="pl-10"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(value);
            }
          }}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border bg-popover shadow-lg">
          {debouncedValue.length >= 2 && searchResults?.data && searchResults.data.length > 0 ? (
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Products</p>
              <ul>
                {searchResults.data.map((product) => (
                  <li key={product.id}>
                    <button
                      onClick={() => handleProductClick(product.slug)}
                      className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
                    >
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{product.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {searchResults.pagination.totalItems > 5 && (
                <button
                  onClick={() => handleSearch(debouncedValue)}
                  className="mt-2 w-full rounded-md border-t py-2 text-center text-sm text-primary hover:bg-accent"
                >
                  View all {searchResults.pagination.totalItems} results
                </button>
              )}
            </div>
          ) : debouncedValue.length >= 2 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No products found</div>
          ) : (
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                <TrendingUp className="mr-1 inline h-3 w-3" />
                Popular Searches
              </p>
              <ul>
                {popularSearches.map((search) => (
                  <li key={search}>
                    <button
                      onClick={() => {
                        setValue(search);
                        handleSearch(search);
                      }}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      {search}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
