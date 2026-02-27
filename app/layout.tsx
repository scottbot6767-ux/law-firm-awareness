import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Law Firm Awareness Audit',
  description: "How visible is your firm in your market? Get an instant awareness score across 8 dimensions — from social media presence to broadcast advertising and community footprint.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
