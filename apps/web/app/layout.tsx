import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Hoxton Docks — Walk-through simulator',
  description:
    'Explore the Hoxton Docks floor plan at human scale, with warehouse-height ceilings.',
  applicationName: 'Hoxton Docks',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'GHOST ARENA' },
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
