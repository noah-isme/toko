import { ReactNode } from "react";

import { Container } from "@/components/layout/container";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <Container className="py-10">{children}</Container>;
}
