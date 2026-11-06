import { headers } from "next/headers";

import { getMaintenanceGateState } from "@/lib/maintenance/gate";

type MaintenanceGateProps = {
  children: React.ReactNode;
};

export async function MaintenanceGate({ children }: MaintenanceGateProps) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const state = await getMaintenanceGateState(pathname);

  if (state.showMaintenance) {
    return (
      <section className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Maintenance</h1>
        <p className="max-w-md text-neutral-600">
          {state.message ?? "We are temporarily unavailable. Please check back soon."}
        </p>
      </section>
    );
  }

  return children;
}
