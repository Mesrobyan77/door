import type { Metadata } from 'next';
import { Noto_Sans, Noto_Sans_Armenian, Geist_Mono } from 'next/font/google';

import './globals.css';

const notoSans = Noto_Sans({
  variable: '--font-noto-sans',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});
const armenian = Noto_Sans_Armenian({
  variable: '--font-armenian',
  subsets: ['armenian'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Hdoors',
    template: '%s · Hdoors',
  },
  description: 'Multilingual e-commerce storefront',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hy" className="h-full" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${notoSans.variable} ${armenian.variable} ${geistMono.variable} flex min-h-dvh flex-col overflow-x-hidden antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
