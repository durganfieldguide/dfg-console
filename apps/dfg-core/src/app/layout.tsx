import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DFG Core - Command Center',
  description: 'Internal development tooling for DFG',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
