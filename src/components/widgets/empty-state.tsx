import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
};

export const EmptyState = ({ title, description, icon, className }: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center",
      className,
    )}
  >
    {icon}
    <h3 className="text-lg font-semibold">{title}</h3>
    {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
  </div>
);
