import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { HttpResponse, http } from "msw";

import { server } from "@/mocks/server";
import { useCartQuery, useProductQuery, useProductsQuery } from "@/lib/api/hooks";
import type { Product } from "@/lib/api/types";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("api hooks", () => {
  it("fetches product collections", async () => {
    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data.length).toBeGreaterThan(0);
  });

  it("forwards search parameters when fetching products", async () => {
    const searches: Array<string | null> = [];
    server.use(
      http.get("*/products", ({ request }) => {
        const url = new URL(request.url);
        searches.push(url.searchParams.get("search"));

        return HttpResponse.json({ data: [] });
      }),
    );

    const { result } = renderHook(() => useProductsQuery({ search: "laptop" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searches).toContain("laptop");
  });

  it("fetches a single product by slug", async () => {
    const mockProduct: Product = {
      id: "1",
      name: "Mock Product",
      slug: "mock-product",
      description: "A mocked product for testing.",
      price: { amount: 199, currency: "USD" },
      rating: { average: 4.5, count: 20 },
      tags: ["mock"],
      inventory: { available: 5, isInStock: true },
      imageUrl: "https://example.com/mock.jpg",
    };

    server.use(http.get("*/products/mock-product", () => HttpResponse.json(mockProduct)));

    const { result } = renderHook(() => useProductQuery("mock-product"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProduct);
  });

  it("fetches cart details", async () => {
    const { result } = renderHook(() => useCartQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items.length).toBeGreaterThan(0);
    expect(result.current.data?.subtotal.amount).toBeGreaterThan(0);
  });
});
