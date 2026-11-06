import { Star } from "lucide-react";

import type { ReviewAggregate } from "@/features/reviews/domain/review-rules";

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

type RatingStarsProps = {
  average: number;
  size?: "sm" | "md";
};

export function RatingStars({ average, size = "md" }: RatingStarsProps) {
  const filled = Math.round(average);
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className="flex items-center gap-1" aria-hidden>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= filled;
        return (
          <Star
            key={star}
            className={`${iconClass} ${
              isFilled
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        );
      })}
    </div>
  );
}

type RatingDistributionProps = {
  aggregate: ReviewAggregate;
};

export function RatingDistribution({ aggregate }: RatingDistributionProps) {
  const total = Math.max(aggregate.count, 1);

  return (
    <ul className="flex w-full flex-col gap-2.5">
      {STAR_LEVELS.map((level) => {
        const count = aggregate.distribution[level];
        const percent = aggregate.count === 0 ? 0 : (count / total) * 100;

        return (
          <li key={level} className="flex items-center gap-2.5">
            <span className="w-3 text-sm text-gray-500">{level}</span>
            <Star
              className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400"
              aria-hidden
            />
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-amber-400 transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-6 text-right text-sm text-gray-500">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}
