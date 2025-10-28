import Link from "next/link";

import { env } from "@/env";

export const Footer = () => (
  <footer className="border-t border-border bg-muted/40 py-6 text-sm text-muted-foreground">
    <div className="container flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <p>
        &copy; {new Date().getFullYear()} {env.NEXT_PUBLIC_APP_NAME}. All rights reserved.
      </p>
      <div className="flex items-center gap-4">
        <Link href="/account" className="hover:text-foreground">
          Account
        </Link>
        <Link href="/cart" className="hover:text-foreground">
          Cart
        </Link>
        <Link href="/health" className="hover:text-foreground">
          Status
        </Link>
      </div>
    </div>
  </footer>
);
