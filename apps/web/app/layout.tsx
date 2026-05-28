import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'SourceDeck',
  description: 'Commercial Web SaaS and installable PWA shell for SourceDeck.',
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  themeColor: '#090a0c'
};

const links = [
  ['Dashboard', '/dashboard'],
  ['Sources', '/sources'],
  ['Pipeline', '/pipeline'],
  ['Workspace', '/workspace'],
  ['Providers', '/settings/providers'],
  ['Billing', '/settings/billing']
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="nav" aria-label="SourceDeck navigation">
            <div className="brand">SourceDeck</div>
            {links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
