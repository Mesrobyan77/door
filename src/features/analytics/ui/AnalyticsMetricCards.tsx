import {
  ClipboardList,
  DollarSign,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/Card";

type MetricTone = "blue" | "green" | "purple";

type MetricCard = {
  label: string;
  value: string;
  tone: MetricTone;
  icon: LucideIcon;
};

const TONE_CLASSES: Record<
  MetricTone,
  { card: string; iconWrap: string; icon: string; value: string }
> = {
  blue: {
    card: "border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50",
    iconWrap: "bg-blue-100 text-blue-600",
    icon: "text-blue-600",
    value: "text-blue-700",
  },
  green: {
    card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50",
    iconWrap: "bg-emerald-100 text-emerald-600",
    icon: "text-emerald-600",
    value: "text-emerald-600",
  },
  purple: {
    card: "border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50",
    iconWrap: "bg-violet-100 text-violet-600",
    icon: "text-violet-600",
    value: "text-violet-700",
  },
};

type AnalyticsMetricCardsProps = {
  orderCount: number;
  revenueLabel: string;
  userCount: number;
};

export function AnalyticsMetricCards({
  orderCount,
  revenueLabel,
  userCount,
}: AnalyticsMetricCardsProps) {
  const metrics: MetricCard[] = [
    {
      label: "Total Orders",
      value: String(orderCount),
      tone: "blue",
      icon: ClipboardList,
    },
    {
      label: "Total Revenue",
      value: revenueLabel,
      tone: "green",
      icon: DollarSign,
    },
    {
      label: "Total Users",
      value: String(userCount),
      tone: "purple",
      icon: Users,
    },
  ];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      {metrics.map((metric) => {
        const tone = TONE_CLASSES[metric.tone];
        const Icon = metric.icon;
        return (
          <Card
            key={metric.label}
            className={`rounded-2xl border p-5 shadow-sm ${tone.card}`}
          >
            <div
              className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${tone.iconWrap}`}
            >
              <Icon className={`h-5 w-5 ${tone.icon}`} aria-hidden />
            </div>
            <p className="text-sm font-medium text-gray-600">{metric.label}</p>
            <p className={`mt-1 text-3xl font-bold tracking-tight ${tone.value}`}>
              {metric.value}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
