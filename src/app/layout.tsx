import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';

import './globals.css';

import { QueryProvider } from '@/components/providers/query-provider';
import { MockServiceWorkerProvider } from '@/components/providers/service-worker-provider';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Toko';

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: 'Modern modular storefront for the Toko e-commerce experience.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        <MockServiceWorkerProvider>
          <QueryProvider>{children}</QueryProvider>
        </MockServiceWorkerProvider>
      </body>
    </html>
  );
}
