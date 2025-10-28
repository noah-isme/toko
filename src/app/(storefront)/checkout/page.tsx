import { Button } from '@/components/ui/button';

export default function CheckoutPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          This is a placeholder checkout form. Integrate payment and shipping workflows here.
        </p>
      </div>
      <form className="grid gap-4 rounded-lg border p-6">
        <fieldset className="grid gap-2">
          <label className="text-sm font-medium">Shipping address</label>
          <input
            className="h-10 rounded-md border px-3"
            placeholder="123 Mockingbird Lane"
            autoComplete="street-address"
          />
        </fieldset>
        <fieldset className="grid gap-2">
          <label className="text-sm font-medium">Payment method</label>
          <input
            className="h-10 rounded-md border px-3"
            placeholder="Card number"
            autoComplete="cc-number"
          />
        </fieldset>
        <Button type="button" size="lg">
          Complete order
        </Button>
      </form>
    </div>
  );
}
