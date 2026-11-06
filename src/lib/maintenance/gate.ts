import "server-only";

import { getStoreMaintenance } from "@/features/settings/application/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";

export type MaintenanceGateState = {
  showMaintenance: boolean;
  message?: string;
};

function isMaintenanceBypassPath(pathname: string): boolean {
  if (pathname.startsWith("/api")) {
    return true;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  const section = isLocale(segments[0] ?? "") ? segments[1] : segments[0];
  return section === "admin" || section === "login" || section === "register";
}

/** Returns whether the storefront should show the maintenance screen. */
export async function getMaintenanceGateState(
  pathname: string,
): Promise<MaintenanceGateState> {
  if (isMaintenanceBypassPath(pathname)) {
    return { showMaintenance: false };
  }

  const maintenance = await getStoreMaintenance();
  if (!maintenance.enabled) {
    return { showMaintenance: false };
  }

  const user = await getCurrentUser();
  if (user?.role === "ADMIN" && user.status === "ACTIVE") {
    return { showMaintenance: false };
  }

  return {
    showMaintenance: true,
    message: maintenance.message,
  };
}
