import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export type RatingProps = {
  value: number;
  count: number;
  className?: string;
};

export const Rating = ({ value, count, className }: RatingProps) => {
  const stars = Array.from({ length: 5 }, (_, index) => index + 1);
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span className="flex items-center gap-0.5">
        {stars.map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= Math.round(value)
                ? "fill-yellow-400 stroke-yellow-400"
                : "stroke-muted-foreground",
            )}
          />
        ))}
      </span>
      <span>
        {value.toFixed(1)} <span className="sr-only">out of 5</span>
      </span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
};
