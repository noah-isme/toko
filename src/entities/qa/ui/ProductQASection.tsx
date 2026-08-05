'use client';

import { useState } from 'react';

import { QuestionForm } from './QuestionForm';
import { QuestionList } from './QuestionList';

import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

interface ProductQASectionProps {
  productId: string;
  className?: string;
}

export function ProductQASection({ productId, className }: ProductQASectionProps) {
  const { isAuthenticated } = useAuth();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className={cn('space-y-8', className)} data-testid="qa-section">
      <div className="border-t border-border/60 pt-8">
        <div className="space-y-4">
          {isAuthenticated ? (
            <>
              {!showForm && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex w-full items-center gap-2 rounded-lg border border-primary/50 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 sm:w-auto"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Ajukan Pertanyaan
                </button>
              )}
              {showForm && (
                <div className="space-y-4 rounded-lg border border-border/60 bg-background/30 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Tanyakan tentang produk ini</h3>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Tutup formulir"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <QuestionForm productId={productId} />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-border/60 bg-background/30 p-4 text-center sm:p-6">
              <p className="text-muted-foreground">
                <a href="/login" className="font-medium text-primary underline hover:no-underline">
                  Masuk
                </a>{' '}
                atau
                <a href="/register" className="font-medium text-primary underline hover:no-underline">
                  daftar
                </a>{' '}
                untuk mengajukan pertanyaan.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-border/60 pt-8">
        <QuestionList productId={productId} canAnswer={isAuthenticated} />
      </div>
    </div>
  );
}