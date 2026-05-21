import Link from 'next/link';
import { readdirSync } from 'fs';
import { join } from 'path';
import type { Metadata } from 'next';
import UsefulMapsGallery, { type GalleryItem } from '@/components/UsefulMapsGallery';
import UsefulMapsSidebar from '@/components/UsefulMapsSidebar';

export const metadata: Metadata = {
  title: 'Useful Maps — GeoGuessr Helper',
};

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

function formatTitle(stem: string): string {
  return stem
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getItems(): GalleryItem[] {
  const dir = join(process.cwd(), 'public', 'useful-maps');
  try {
    return readdirSync(dir)
      .filter((f) => IMAGE_EXTENSIONS.has(f.slice(f.lastIndexOf('.')).toLowerCase()))
      .map((f) => {
        const stem = f.slice(0, f.lastIndexOf('.'));
        return {
          src: `/useful-maps/${f}`,
          id: stem,
          title: formatTitle(stem),
        };
      });
  } catch {
    return [];
  }
}

const SCROLL_CONTAINER_ID = 'useful-maps-scroll';

export default function UsefulMapsPage() {
  const items = getItems();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#262b31] text-white">
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-900/94 px-5 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">GeoGuessr Helper</h1>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              World Map
            </Link>
            <span className="rounded-lg bg-zinc-700/60 px-3 py-1.5 text-sm font-medium text-white">
              Useful Maps
            </span>
          </nav>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <UsefulMapsSidebar
          items={items.map(({ id, title, src }) => ({ id, title, src }))}
          scrollContainerId={SCROLL_CONTAINER_ID}
        />

        <main id={SCROLL_CONTAINER_ID} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl">
            <UsefulMapsGallery items={items} />
          </div>
        </main>
      </div>
    </div>
  );
}
