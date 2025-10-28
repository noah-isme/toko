import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Price } from "@/components/widgets/price";

describe("Price", () => {
  it("formats currency values", () => {
    render(<Price amount={1234.56} currency="USD" />);
    expect(screen.getByText(/\$/)).toBeInTheDocument();
  });
});
