import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage profile details, saved addresses, and order history. Authentication wiring coming
          soon.
        </p>
      </div>
      <Button asChild size="lg" variant="outline">
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  );
}
