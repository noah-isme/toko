"use client";

import Link from "next/link";
import { Menu, ShoppingCart, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/widgets/search-bar";
import { env } from "@/env";
import { useCartQuery } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

export const Navbar = () => {
  const { data: cart } = useCartQuery();
  const totalItems = cart?.totalItems ?? 0;
  const toggleCart = useCartStore((state) => state.toggle);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <nav
        className={cn("container mx-auto flex h-16 items-center justify-between gap-4")}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" aria-hidden />
          </Button>
          <Link href="/" className="text-xl font-semibold">
            {env.NEXT_PUBLIC_APP_NAME}
          </Link>
        </div>
        <div className="hidden flex-1 justify-center md:flex">
          <SearchBar />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="relative"
            onClick={toggleCart}
            aria-label="Open cart"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {totalItems > 0 ? (
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {totalItems}
              </span>
            ) : null}
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/account" className="flex items-center gap-2">
              <User className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Account</span>
            </Link>
          </Button>
        </div>
      </nav>
      <div className="border-t border-border bg-muted/30 py-2 md:hidden">
        <div className="container">
          <SearchBar />
        </div>
      </div>
    </header>
  );
};
