'use client';

import { Clock, Search, Trash2, X } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useSearchStore } from '@/stores/search-store';

export default function SearchHistoryPage() {
  const router = useRouter();
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const removeRecentSearch = useSearchStore((state) => state.removeRecentSearch);
  const clearRecentSearches = useSearchStore((state) => state.clearRecentSearches);

  const runSearch = (term: string) => {
    router.push(`/products?q=${encodeURIComponent(term)}` as Route);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Akun', href: '/account' },
          { label: 'Riwayat Pencarian' },
        ]}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Riwayat Pencarian</h1>
          <p className="text-sm text-muted-foreground">
            Pencarian tersimpan di perangkat ini saja dan tidak dikirim ke server.
          </p>
        </div>
        {recentSearches.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearRecentSearches}>
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Hapus semua
          </Button>
        )}
      </div>

      {recentSearches.length === 0 ? (
        <EmptyState
          icon={<Clock aria-hidden="true" />}
          title="Belum ada riwayat pencarian"
          description="Istilah yang Anda cari akan muncul di sini agar mudah diulang."
          cta={{ label: 'Jelajahi produk', href: '/products' }}
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {recentSearches.map((term) => (
            <li key={term} className="flex items-center gap-2 px-2">
              <button
                onClick={() => runSearch(term)}
                className="flex flex-1 items-center gap-3 rounded-md px-2 py-3 text-left text-sm hover:bg-accent"
              >
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{term}</span>
              </button>
              <button
                aria-label={`Hapus ${term} dari riwayat pencarian`}
                onClick={() => removeRecentSearch(term)}
                className="rounded p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
