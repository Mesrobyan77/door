"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import { AdminSearchInput } from "@/features/admin/ui/AdminSearchInput";
import {
  ADMIN_BADGE,
} from "@/features/admin/ui/status-badge";
import {
  ADMIN_TABLE,
  ADMIN_TABLE_CARD,
  ADMIN_TABLE_CHECKBOX,
  ADMIN_TABLE_OUTER_SCROLL,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_STATE_INSET,
  ADMIN_TABLE_TBODY,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TD_CENTER,
  ADMIN_TABLE_TD_CHECK,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_TH_CENTER,
  ADMIN_TABLE_TH_CHECK,
  ADMIN_TABLE_THEAD,
} from "@/features/admin/ui/admin-table-classes";
import {
  bulkAnonymizeUsersAction,
  updateUserStatusAction,
} from "@/features/users/application/update-user";
import type { AdminUserListItem } from "@/features/users/application/queries";

type AdminUsersViewProps = {
  locale: string;
  users: AdminUserListItem[];
  total: number;
  q?: string;
  role?: string;
};

function roleFilterHref(
  locale: string,
  role: string | undefined,
  q?: string,
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  const query = params.toString();
  return query
    ? `/${locale}/admin/users?${query}`
    : `/${locale}/admin/users`;
}

function formatCreated(value: Date | string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function displayName(user: AdminUserListItem): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}

export function AdminUsersView({
  locale,
  users,
  total,
  q,
  role,
}: AdminUsersViewProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allIds = users.map((user) => user.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleOne(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(): void {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function runAction(action: () => Promise<void>): void {
    startTransition(async () => {
      setError(null);
      try {
        await action();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Action failed.");
      }
    });
  }

  function confirmDeleteSelected(): void {
    const userIds = [...selected];
    startTransition(async () => {
      setError(null);
      try {
        const result = await bulkAnonymizeUsersAction(locale, { userIds });
        if (!result.ok) throw new Error(result.error.message);
        setSelected(new Set());
        setConfirmOpen(false);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Action failed.");
      }
    });
  }

  const rolePills = [
    { label: "All", value: undefined },
    { label: "Admins", value: "ADMIN" },
    { label: "Customers", value: "CUSTOMER" },
  ] as const;

  return (
    <section>
      <form method="get" className="mb-4 flex flex-wrap gap-3">
        <AdminSearchInput
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by email, phone, name..."
          wrapperClassName="min-w-[220px] flex-1"
          aria-label="Search users"
        />
        {role ? <input type="hidden" name="role" value={role} /> : null}
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>

      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Admin / Customer
        </p>
        <div className="flex flex-wrap gap-2">
          {rolePills.map((pill) => {
            const active = (role ?? undefined) === pill.value;
            return (
              <Link
                key={pill.label}
                href={roleFilterHref(locale, pill.value, q)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-gray-200 text-gray-900"
                    : "bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50"
                }`}
              >
                {pill.label}
              </Link>
            );
          })}
        </div>
      </div>

      <p className="mb-3 text-sm text-gray-600">Total users: {total}</p>

      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-gray-700">
          Selected {selected.size} user{selected.size === 1 ? "" : "s"}
        </p>
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={isPending || selected.size === 0}
          onClick={() => {
            if (selected.size === 0) return;
            setConfirmOpen(true);
          }}
        >
          Delete Selected
        </Button>
      </Card>

      <Card className={ADMIN_TABLE_CARD}>
        {users.length === 0 ? (
          <p className={`${ADMIN_TABLE_STATE_INSET} text-sm text-gray-600`}>
            No users match these filters.
          </p>
        ) : (
          <div className={ADMIN_TABLE_OUTER_SCROLL}>
            <table className={ADMIN_TABLE}>
              <thead className={ADMIN_TABLE_THEAD}>
                <tr>
                  <th className={ADMIN_TABLE_TH_CHECK}>
                    <input
                      type="checkbox"
                      className={ADMIN_TABLE_CHECKBOX}
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={isPending || users.length === 0}
                      aria-label="Select all users"
                    />
                  </th>
                  <th className={ADMIN_TABLE_TH}>User</th>
                  <th className={ADMIN_TABLE_TH}>Contact</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Orders</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Roles</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Status</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Created</th>
                </tr>
              </thead>
              <tbody className={ADMIN_TABLE_TBODY}>
                {users.map((user) => {
                  const isActive = user.status === "ACTIVE";
                  const canToggle =
                    user.status === "ACTIVE" || user.status === "SUSPENDED";

                  return (
                    <tr key={user.id} className={ADMIN_TABLE_ROW}>
                      <td className={ADMIN_TABLE_TD_CHECK}>
                        <input
                          type="checkbox"
                          className={ADMIN_TABLE_CHECKBOX}
                          checked={selected.has(user.id)}
                          onChange={() => toggleOne(user.id)}
                          disabled={isPending || user.status === "ANONYMIZED"}
                          aria-label={`Select ${displayName(user)}`}
                        />
                      </td>
                      <td className={ADMIN_TABLE_TD}>
                        <Link
                          href={`/${locale}/admin/users/${user.id}`}
                          className="block min-w-[160px]"
                        >
                          <p className="font-medium text-gray-900 hover:underline">
                            {displayName(user)}
                          </p>
                          <p className="truncate text-xs text-gray-400">
                            {user.id}
                          </p>
                        </Link>
                      </td>
                      <td className={ADMIN_TABLE_TD}>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-500">
                          {user.phone ?? "—"}
                        </p>
                      </td>
                      <td className={ADMIN_TABLE_TD_CENTER}>
                        <span className="font-medium text-gray-900">
                          {user.orderCount}
                        </span>
                      </td>
                      <td className={ADMIN_TABLE_TD_CENTER}>
                        <span
                          className={`${ADMIN_BADGE} ${
                            user.role === "ADMIN"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {user.role.toLowerCase()}
                        </span>
                      </td>
                      <td className={ADMIN_TABLE_TD_CENTER}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          disabled={isPending || !canToggle}
                          onClick={() =>
                            runAction(async () => {
                              const result = await updateUserStatusAction(
                                locale,
                                {
                                  userId: user.id,
                                  status: isActive ? "SUSPENDED" : "ACTIVE",
                                },
                              );
                              if (!result.ok) {
                                throw new Error(result.error.message);
                              }
                            })
                          }
                          className={`relative mx-auto block h-5 w-9 rounded-full transition-colors disabled:opacity-40 ${
                            isActive ? "bg-green-500" : "bg-gray-300"
                          }`}
                          aria-label={
                            isActive
                              ? `Suspend ${displayName(user)}`
                              : `Activate ${displayName(user)}`
                          }
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                              isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>
                      <td className={ADMIN_TABLE_TD_CENTER}>
                        <span className="text-sm text-gray-600">
                          {formatCreated(user.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete"
        description={`Are you sure you want to delete ${selected.size} selected user${selected.size === 1 ? "" : "s"}? This anonymizes their accounts and cannot be undone.`}
        isPending={isPending}
        onClose={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        onConfirm={confirmDeleteSelected}
      />
    </section>
  );
}
