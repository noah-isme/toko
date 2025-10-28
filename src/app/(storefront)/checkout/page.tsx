import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          This is a placeholder checkout experience. Integrate your payment provider and order
          creation logic here.
        </p>
      </header>
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        <p>
          The backend API can be called using the <code>apiClient</code> helper to create orders,
          reserve inventory, and process payments.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Return to store</Link>
      </Button>
    </section>
  );
}
