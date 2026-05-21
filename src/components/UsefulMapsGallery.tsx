'use client';

import Image from 'next/image';
import { useRef, useCallback, useEffect, useReducer } from 'react';

interface ZoomableImageProps {
  src: string;
  alt: string;
  id: string;
  title: string;
}

function ZoomableImage({ src, alt, id, title }: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [, forceRender] = useReducer((n) => n + 1, 0);
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const isDragging = useRef(false);

  const clampOffset = useCallback((x: number, y: number, s: number) => {
    const el = containerRef.current;
    if (!el) return { x, y };
    const maxX = (el.offsetWidth * (s - 1)) / 2;
    const maxY = (el.offsetHeight * (s - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, []);

  const reset = useCallback(() => {
    scaleRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
    forceRender();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;
      const prevScale = scaleRef.current;
      const nextScale = Math.min(10, Math.max(1, prevScale * (1 - e.deltaY * 0.001)));
      const factor = nextScale / prevScale;
      const rawX = cursorX - factor * (cursorX - offsetRef.current.x);
      const rawY = cursorY - factor * (cursorY - offsetRef.current.y);
      scaleRef.current = nextScale;
      offsetRef.current = clampOffset(rawX, rawY, nextScale);
      forceRender();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clampOffset]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scaleRef.current === 1) return;
    e.preventDefault();
    isDragging.current = false;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      ox: offsetRef.current.x,
      oy: offsetRef.current.y,
    };
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drag.current) return;
      isDragging.current = true;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      offsetRef.current = clampOffset(drag.current.ox + dx, drag.current.oy + dy, scaleRef.current);
      forceRender();
    },
    [clampOffset]
  );

  const onMouseUp = useCallback(() => {
    drag.current = null;
  }, []);

  const scale = scaleRef.current;
  const { x, y } = offsetRef.current;

  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      <div className="relative overflow-hidden rounded-xl border border-zinc-700/60">
        {scale > 1 && (
          <button
            type="button"
            onClick={reset}
            className="absolute right-2 top-2 z-10 rounded-md bg-zinc-900/80 px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            Reset
          </button>
        )}
        <div
          ref={containerRef}
          className="w-full overflow-hidden"
          style={{ cursor: isDragging.current ? 'grabbing' : scale > 1 ? 'grab' : 'zoom-in' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <Image
            src={src}
            alt={alt}
            width={1600}
            height={900}
            className="w-full object-contain select-none"
            style={{
              transform: `scale(${scale}) translate(${x / scale}px, ${y / scale}px)`,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
            unoptimized
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}

export interface GalleryItem {
  src: string;
  id: string;
  title: string;
}

interface Props {
  items: GalleryItem[];
}

export default function UsefulMapsGallery({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-20 text-center text-zinc-500">
        No images found in <code className="text-zinc-400">public/useful-maps/</code>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-4 py-4">
      {items.map((item) => (
        <ZoomableImage key={item.src} {...item} alt={item.title} />
      ))}
    </div>
  );
}
