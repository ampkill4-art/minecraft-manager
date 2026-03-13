import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Minecraft Service Manager',
  description: 'Real-time Minecraft server management',
  keywords: ['minecraft', 'server', 'management', 'dashboard'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="min-h-screen bg-bg bg-grid-pattern bg-grid antialiased">
        {/* Ambient glow at top */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none">
          <div className="absolute inset-0 bg-glow-radial" />
        </div>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
