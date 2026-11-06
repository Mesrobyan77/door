import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/Card";
import {
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
} from "@/features/admin/ui/admin-form-classes";
import { ADMIN_BADGE } from "@/features/admin/ui/status-badge";
import { getAdminContactMessageById } from "@/features/contact/application/queries";
import {
  getEligibleContactStatuses,
  isContactStatus,
} from "@/features/contact/domain/contact-rules";
import { UpdateContactStatusForm } from "@/features/contact/ui/UpdateContactStatusForm";
import { isLocale } from "@/lib/i18n/config";

type AdminMessageDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function contactStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "UNREAD") return "bg-blue-100 text-blue-800";
  if (normalized === "READ") return "bg-yellow-100 text-yellow-800";
  if (normalized === "REPLIED") return "bg-green-100 text-green-800";
  if (normalized === "ARCHIVED") return "bg-gray-100 text-gray-800";
  return "bg-gray-100 text-gray-800";
}

export default async function AdminMessageDetailPage({
  params,
}: AdminMessageDetailPageProps) {
  const { locale, id } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const message = await getAdminContactMessageById(id);
  if (!message) {
    notFound();
  }

  const status = isContactStatus(message.status) ? message.status : null;
  const eligible = status ? getEligibleContactStatuses(status) : [];

  return (
    <section>
      <div className="mb-6">
        <p className={`mb-1 ${ADMIN_PAGE_SUBTITLE}`}>
          <Link
            href={`/${locale}/admin/messages`}
            className="font-medium text-gray-700 hover:underline"
          >
            Messages
          </Link>
        </p>
        <h1 className={ADMIN_PAGE_TITLE}>{message.subject}</h1>
      </div>

      <Card className="mb-6 p-6">
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <p className="text-gray-700">
            From: <strong className="text-gray-900">{message.name}</strong>
          </p>
          <p className="text-gray-700">Email: {message.email}</p>
          <p className="text-gray-700">Phone: {message.phone ?? "—"}</p>
          <p className="text-gray-700">
            Status:{" "}
            <span
              className={`${ADMIN_BADGE} ${contactStatusBadgeClass(message.status)}`}
            >
              {message.status}
            </span>
          </p>
          <p className="text-gray-700">
            Spam score:{" "}
            {message.spamScore === null ? "—" : message.spamScore}
          </p>
          <p className="text-gray-700">
            Received:{" "}
            {message.createdAt.toISOString().slice(0, 19).replace("T", " ")}{" "}
            UTC
          </p>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className={`mb-3 ${ADMIN_SECTION_TITLE}`}>Message</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {message.message}
        </p>
      </Card>

      {status ? (
        <UpdateContactStatusForm
          locale={locale}
          messageId={message.id}
          currentStatus={status}
          eligibleStatuses={eligible}
        />
      ) : (
        <p className="text-sm text-red-700">Unknown status.</p>
      )}
    </section>
  );
}
