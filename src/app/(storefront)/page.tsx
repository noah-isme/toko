'use client';

import { LandingPage } from '@/components/landing-page';
import { useAuth } from '@/components/providers/AuthProvider';
import { UserHome } from '@/components/user-home';
import { JsonLd } from '@/shared/seo/JsonLd';
import { orgJsonLd, websiteJsonLd } from '@/shared/seo/jsonld';

/**
 * Main home page that renders:
 * - LandingPage for guests/unauthenticated users
 * - UserHome for authenticated users
 */
export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading skeleton while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <JsonLd id="organization-jsonld" data={orgJsonLd()} />
      <JsonLd id="website-jsonld" data={websiteJsonLd()} />
      {isAuthenticated ? <UserHome /> : <LandingPage />}
    </>
  );
}
