import { ProfileSidebarNav } from "@/features/profile/ui/ProfileSidebarNav";
import { logoutAction } from "@/features/auth/logout-action";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { SessionUser } from "@/lib/auth/session";

type ProfileSidebarProps = {
  locale: Locale;
  user: SessionUser;
  dictionary: Dictionary["profile"];
};

export function ProfileSidebar({
  locale,
  user,
  dictionary,
}: ProfileSidebarProps) {
  const logoutWithLocale = logoutAction.bind(null, locale);

  return (
    <aside
      className="flex w-full flex-col rounded-[var(--radius)] border border-gray-300/60 bg-gradient-to-b from-gray-100/95 to-gray-50/90 shadow-inner"
      aria-label={dictionary.title}
    >
      <div className="shrink-0 border-b border-gray-300/50 bg-gray-50/50 p-4 sm:p-5">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-gray-900 text-xl font-semibold text-white shadow-md">
            {user.firstName.slice(0, 1).toUpperCase()}
            {user.lastName.slice(0, 1).toUpperCase()}
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-semibold tracking-tight text-gray-900">
              {user.firstName}
            </p>
            <p className="text-xs font-semibold tracking-wide text-gray-600">
              {user.lastName}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <div className="rounded-[var(--radius)] border border-gray-200/60 bg-white/70 px-3.5 py-2.5 text-left text-xs font-medium break-words text-gray-700 shadow-sm sm:text-sm">
            {user.email}
          </div>
          {user.phone ? (
            <div className="rounded-[var(--radius)] border border-gray-200/60 bg-white/70 px-3.5 py-2.5 text-left text-xs font-medium break-words text-gray-700 shadow-sm sm:text-sm">
              {user.phone}
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <ProfileSidebarNav
          locale={locale}
          dictionary={dictionary}
          logoutAction={logoutWithLocale}
        />
      </div>
    </aside>
  );
}
