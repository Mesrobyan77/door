import Link from "next/link";
import { Info } from "lucide-react";

type DiscountInfoCardProps = {
  locale: string;
};

const INFO_POINTS = [
  "Global discount applies to every product unless a stronger product rule exists.",
  "Category discount applies to products in that category.",
  "Product discount overrides category and global percentage for that item.",
  "Clear removes the rule; Save persists the current percentage.",
] as const;

export function DiscountInfoCard({ locale }: DiscountInfoCardProps) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
          <Info className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Useful Information
          </h2>
          <p className="text-sm text-gray-500">About Discounts</p>
        </div>
      </div>

      <ul className="flex-1 list-disc space-y-2 pl-5 text-sm text-gray-700">
        {INFO_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className="mt-4 flex justify-end">
        <Link
          href={`/${locale}/admin/settings`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          More Settings →
        </Link>
      </div>
    </article>
  );
}
