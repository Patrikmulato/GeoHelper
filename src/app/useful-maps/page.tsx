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
    <div className="flex flex-1 min-h-0 overflow-hidden bg-[#181c22] text-white">
      <UsefulMapsSidebar
        items={items.map(({ id, title, src }) => ({ id, title, src }))}
        scrollContainerId={SCROLL_CONTAINER_ID}
      />

      <main id={SCROLL_CONTAINER_ID} className="min-h-0 flex-1 overflow-y-auto">
        <UsefulMapsGallery items={items} />
      </main>
    </div>
  );
}
