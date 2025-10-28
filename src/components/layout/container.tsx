import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const Container = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("container mx-auto w-full", className)}>{children}</div>
);
