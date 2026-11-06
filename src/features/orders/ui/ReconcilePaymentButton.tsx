'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { reconcileOnlinePaymentAction } from '@/features/orders/application/reconcile-online-payment';
export function ReconcilePaymentButton({
  locale,
  orderNumber,
  provider,
}: {
  locale: string;
  orderNumber: string;
  provider: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (provider !== 'arca' && provider !== 'idram') return null;
  return (
    <div className="mt-4">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await reconcileOnlinePaymentAction(locale, orderNumber);
            if (!result.ok) setError(result.error ?? 'Reconciliation failed.');
            else router.refresh();
          })
        }
      >
        {pending ? 'Reconciling…' : 'Reconcile provider payment'}
      </Button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
