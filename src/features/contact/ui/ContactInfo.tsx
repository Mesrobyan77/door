import type { ReactNode } from 'react';
import { Mail, Phone } from 'lucide-react';

import type { Dictionary } from '@/lib/i18n/get-dictionary';

type ContactInfoProps = {
  copy: Dictionary['contact'];
  phone: string | null;
  email: string | null;
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

export function ContactInfo({ copy, phone, email }: ContactInfoProps) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">Hdoors</h2>
      <p className="text-sm leading-7 text-gray-600">{copy.subtitle}</p>
      {phone ? (
        <InfoBlock icon={<Phone className="h-6 w-6" />} title={copy.callTitle}>
          <a
            href={`tel:${phone}`}
            className="font-medium text-gray-800 underline decoration-accent underline-offset-4"
          >
            {phone}
          </a>
        </InfoBlock>
      ) : null}

      {email ? (
        <InfoBlock icon={<Mail className="h-6 w-6" />} title={copy.writeTitle}>
          <a
            href={`mailto:${email}`}
            className="font-medium text-gray-800 underline decoration-accent underline-offset-4"
          >
            {copy.emailLabel} {email}
          </a>
        </InfoBlock>
      ) : null}
    </div>
  );
}
