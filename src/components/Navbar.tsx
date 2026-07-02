'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'World Map', href: '/' },
  { label: 'US Plates', href: '/us-plates' },
  { label: 'Useful Maps', href: '/useful-maps' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-[#181c22] px-4 py-2">
      <span className="text-base font-bold text-white">GeoGuessr Helper</span>
      <nav className="flex gap-1">
        {TABS.map(({ label, href }) => {
          const isActive = pathname === href;
          return isActive ? (
            <span
              key={href}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white"
            >
              {label}
            </span>
          ) : (
            <Link
              key={href}
              href={href}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
