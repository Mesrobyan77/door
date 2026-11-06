"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { ProfileMobileHub } from "@/features/profile/ui/ProfileMobileHub";
import { ProfileMobileTabSheet } from "@/features/profile/ui/ProfileMobileTabSheet";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { SessionUser } from "@/lib/auth/session";

type ProfileMobileShellProps = {
  locale: Locale;
  user: SessionUser;
  dictionary: Dictionary["profile"];
  children: ReactNode;
};

function isProfileHubPath(pathname: string, locale: Locale): boolean {
  const hubHref = `/${locale}/profile`;
  return pathname === hubHref || pathname === `${hubHref}/`;
}

/**
 * Mobile profile shell (MaMarie): hub always visible; section content in a bottom sheet.
 * Desktop content column is unchanged (`lg+`). Renders `children` once (matchMedia).
 */
export function ProfileMobileShell({
  locale,
  user,
  dictionary,
  children,
}: ProfileMobileShellProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isHub = isProfileHubPath(pathname, locale);
  const [hubSheetOpen, setHubSheetOpen] = useState(false);
  /** Keeps sub-route content mounted while the close keyframe plays. */
  const [closingToHub, setClosingToHub] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [prevIsHub, setPrevIsHub] = useState(isHub);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (isHub !== prevIsHub || pathname !== prevPathname) {
    setPrevIsHub(isHub);
    setPrevPathname(pathname);
    if (isHub) {
      setHubSheetOpen(false);
      setClosingToHub(false);
    }
  }

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    function sync(): void {
      setIsDesktop(media.matches);
    }
    const frame = requestAnimationFrame(sync);
    media.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", sync);
    };
  }, []);

  const sheetOpen = (!isHub || hubSheetOpen) && !closingToHub;

  const closeSheet = useCallback(() => {
    if (isHub) {
      setHubSheetOpen(false);
      return;
    }
    setClosingToHub(true);
  }, [isHub]);

  const handleSheetExited = useCallback(() => {
    if (!closingToHub) return;
    // Keep `closingToHub` true until the hub route mounts — otherwise
    // `sheetOpen` flips back on and the sheet re-opens with a jerk.
    router.push(`/${locale}/profile`);
  }, [closingToHub, locale, router]);

  const openHubDashboard = useCallback(() => {
    setHubSheetOpen(true);
  }, []);

  const hub = (
    <ProfileMobileHub
      locale={locale}
      user={user}
      dictionary={dictionary}
      onOpenDashboard={openHubDashboard}
    />
  );

  const desktopColumn = (
    <div className="min-w-0 flex-1">{children}</div>
  );

  // SSR / pre-hydration: hub on mobile via CSS; content only from lg up.
  if (isDesktop === null) {
    return (
      <>
        <div className="profile-mobile-page w-full lg:hidden">{hub}</div>
        <div className="hidden min-w-0 flex-1 lg:block">{children}</div>
      </>
    );
  }

  if (isDesktop) {
    return desktopColumn;
  }

  return (
    <div className="profile-mobile-page w-full">
      {hub}
      <ProfileMobileTabSheet
        open={sheetOpen}
        onClose={closeSheet}
        onExited={handleSheetExited}
        ariaLabel={dictionary.title}
      >
        {children}
      </ProfileMobileTabSheet>
    </div>
  );
}
