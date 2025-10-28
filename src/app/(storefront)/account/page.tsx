import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AccountPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage personal information, view orders, and configure security settings.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Synchronize this page with the <code>/auth/me</code> endpoint for personalized data.
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Orders</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Display the user&apos;s recent orders once the backend endpoints are available.
          </p>
        </div>
      </div>
      <Button asChild>
        <Link href="/login">Sign in</Link>
      </Button>
    </section>
  );
}
