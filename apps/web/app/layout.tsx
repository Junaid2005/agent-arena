import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'AGENT ARENA',
  description:
    'A very unserious multiplayer paintball game. Your venue. Your friends. Absolutely no dignity.',
  applicationName: 'AGENT ARENA',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'AGENT ARENA' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#172421',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
