import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";

import type { Dictionary } from "@/lib/i18n/get-dictionary";

type ContactInfoProps = {
  copy: Dictionary["contact"];
};

function InfoBlock({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-700">
          {icon}
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function ContactInfo({ copy }: ContactInfoProps) {
  return (
    <div className="space-y-8">
      <InfoBlock icon={<Phone className="h-6 w-6" />} title={copy.callTitle}>
        <p className="mb-2 text-gray-600">{copy.callDescription}</p>
        <a
          href={`tel:${copy.storePhone}`}
          className="font-medium text-orange-500 transition-colors hover:text-orange-600"
        >
          {copy.storePhone}
        </a>
      </InfoBlock>

      <InfoBlock icon={<Mail className="h-6 w-6" />} title={copy.writeTitle}>
        <p className="mb-2 text-gray-600">{copy.writeDescription}</p>
        <a
          href={`mailto:${copy.storeEmail}`}
          className="font-medium text-orange-500 transition-colors hover:text-orange-600"
        >
          {copy.emailLabel} {copy.storeEmail}
        </a>
      </InfoBlock>

      <InfoBlock icon={<MapPin className="h-6 w-6" />} title={copy.hqTitle}>
        <div className="mb-2 space-y-1 text-gray-600">
          <p>{copy.hoursWeekdays}</p>
          <p>{copy.hoursSaturday}</p>
        </div>
        <p className="font-medium text-orange-500">{copy.storeAddress}</p>
      </InfoBlock>
    </div>
  );
}
