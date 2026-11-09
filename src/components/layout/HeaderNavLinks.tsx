'use client';
import { usePathname } from 'next/navigation';
import { AppLink } from '@/components/ui/AppLink';

export function HeaderNavLinks({
  items,
}: {
  items: ReadonlyArray<{ href: string; label: string }>;
}) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item, index) => {
        const active = index === 0 ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <AppLink
            key={item.href}
            href={item.href}
            prefetchPolicy="intent"
            aria-current={active ? 'page' : undefined}
            className={`border-b px-2.5 py-2 text-sm font-semibold whitespace-nowrap text-gray-900 transition-colors hover:border-accent ${active ? 'border-accent' : 'border-transparent'}`}
          >
            {item.label}
          </AppLink>
        );
      })}
    </>
  );
}
