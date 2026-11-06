import { notFound } from "next/navigation";

import { DeleteAccountForm } from "@/features/profile/ui/DeleteAccountForm";
import { requireUser } from "@/lib/auth/policies";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type DeleteAccountPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DeleteAccountPage({
  params,
}: DeleteAccountPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  await requireUser(locale);
  const dictionary = getDictionary(locale);
  const copy = dictionary.profile.deleteAccountForm;

  return (
    <section>
      <DeleteAccountForm
        locale={locale}
        labels={{
          title: dictionary.profile.deleteAccount,
          description: copy.description,
          pointOrders: copy.pointOrders,
          pointLogin: copy.pointLogin,
          pointData: copy.pointData,
          currentPassword: copy.currentPassword,
          currentPasswordPlaceholder: copy.currentPasswordPlaceholder,
          acknowledge: copy.acknowledge,
          submit: copy.submit,
          deleting: copy.deleting,
        }}
      />
    </section>
  );
}
