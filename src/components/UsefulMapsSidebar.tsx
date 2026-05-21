'use client';

import Image from 'next/image';

interface Props {
  items: { id: string; title: string; src: string }[];
  scrollContainerId: string;
}

export default function UsefulMapsSidebar({ items, scrollContainerId }: Props) {
  const scrollTo = (id: string) => {
    const container = document.getElementById(scrollContainerId);
    const target = document.getElementById(id);
    if (!container || !target) return;
    container.scrollTo({ top: target.offsetTop - 16, behavior: 'smooth' });
  };

  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1 overflow-y-auto border-r border-zinc-800 bg-zinc-900/60 px-2 py-4">
      {items.map(({ id, title, src }) => (
        <button
          key={id}
          type="button"
          onClick={() => scrollTo(id)}
          className="group flex flex-col gap-1.5 rounded-md p-2 text-left transition-colors hover:bg-zinc-800"
        >
          <div className="overflow-hidden rounded border border-zinc-700/60 group-hover:border-zinc-500">
            <Image
              src={src}
              alt={title}
              width={200}
              height={120}
              className="w-full object-cover"
              unoptimized
            />
          </div>
          <span className="text-xs font-medium text-zinc-400 group-hover:text-white">{title}</span>
        </button>
      ))}
    </nav>
  );
}
